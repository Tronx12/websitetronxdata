import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import Leave from "@/models/Leave";
import Auth from "@/models/Auth";

import { connectDB } from "@/config/db";
import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/getuser";

import {
  calculateCalendarDays,
  getAllowedApprovers,
  getPaidLeaveSummary,
  normalizeRole,
} from "@/lib/leaveRules";

/* =========================================================
   GET /api/leaves

   Returns ONLY the currently authenticated employee's
   leave requests.

   Authentication:
   access_token / refresh_token cookies
   -> getCurrentUser()

   Do NOT accept userId from query parameters.
========================================================= */



export async function GET(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATION
     * =====================================================
     */

    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    /*
     * =====================================================
     * VALIDATE USER ID
     * =====================================================
     */

    if (
      !currentUser.userId ||
      !mongoose.Types.ObjectId.isValid(
        currentUser.userId
      )
    ) {
      console.error(
        "Invalid currentUser.userId:",
        currentUser.userId
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid authenticated user ID",
        },
        { status: 401 }
      );
    }

    /*
     * =====================================================
     * DATABASE
     * =====================================================
     */

    await connectDB();

    /*
     * =====================================================
     * OPTIONAL STATUS FILTER
     * =====================================================
     */

    const { searchParams } =
      new URL(request.url);

    const status =
      searchParams.get("status");

    const allowedStatuses = [
      "PENDING_APPROVAL",
      "APPROVED",
      "REJECTED",
      "CANCELLED",
    ];

    if (
      status &&
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid leave status",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * BUILD FILTER
     * =====================================================
     */

    const filter: {
      employeeId: mongoose.Types.ObjectId;
      status?: string;
    } = {
      employeeId:
        new mongoose.Types.ObjectId(
          currentUser.userId
        ),
    };

    if (status) {
      filter.status = status;
    }

    /*
     * =====================================================
     * FETCH LEAVES
     *
     * IMPORTANT:
     * No populate here.
     *
     * This avoids errors if Auth/Team models are not
     * registered for population in this route.
     * =====================================================
     */

    const records =
      await Leave.find(filter)
        .sort({
          createdAt: -1,
        })
        .lean();

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error(
      "GET /api/leaves error:",
      error
    );

    if (error instanceof Error) {
      console.error(
        "ERROR MESSAGE:",
        error.message
      );

      console.error(
        "ERROR STACK:",
        error.stack
      );

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST /api/leaves

   Creates a leave request for the currently authenticated
   employee.

   IMPORTANT:
   userId is NEVER taken from:
   - request body
   - x-user-id header
   - query parameter

   It comes from getCurrentUser().

   APPROVAL WORKFLOW:
   ------------------
   Any ONE authorized approver can approve.

   survey-tester:
     team-lead OR senior-teamlead OR hr OR admin

   team-lead:
     senior-teamlead OR hr OR admin

   data-quality-analyst:
     hr OR admin

   senior-teamlead:
     hr OR admin

   hr:
     admin

   admin:
     cannot apply through this workflow
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATION
     * =====================================================
     */

    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await connectDB();

    /*
     * =====================================================
     * VALIDATE AUTHENTICATED USER ID
     * =====================================================
     */

    if (
      !mongoose.Types.ObjectId.isValid(
        currentUser.userId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid authenticated user.",
        },
        { status: 401 }
      );
    }

    /*
     * =====================================================
     * LOAD CURRENT USER FROM DATABASE
     *
     * We intentionally read the current user from MongoDB
     * instead of trusting client data.
     * =====================================================
     */

    const user =
      await Auth.findById(
        currentUser.userId
      )
        .select(
          "_id name email role teamId isActive"
        )
        .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Account must still be active.
     */

    if (user.isActive !== true) {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is inactive.",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * NORMALIZE EMPLOYEE ROLE
     * =====================================================
     */

    const role = normalizeRole(user.role);

    /*
     * Admin does not need leave approval.
     */

    if (role === "admin") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin does not need to apply for leave through the approval workflow.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * GET ALLOWED APPROVERS
     *
     * This replaces the old sequential approval flow.
     * =====================================================
     */

    const allowedApprovers =
      getAllowedApprovers(role);

    if (allowedApprovers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No leave approval workflow is configured for your role.",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * REQUEST BODY
     *
     * Do NOT read userId from body.
     * =====================================================
     */

    const body = await request.json();

    const leaveType = String(
      body.leaveType || ""
    )
      .trim()
      .toUpperCase();

    const rawStartDate = String(
      body.startDate || ""
    ).trim();

    const rawEndDate = String(
      body.endDate || ""
    ).trim();

    const reason = String(
      body.reason || ""
    ).trim();

    /*
     * =====================================================
     * VALIDATE LEAVE TYPE
     * =====================================================
     */

    if (
      leaveType !== "PAID" &&
      leaveType !== "UNPAID"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "leaveType must be PAID or UNPAID.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * VALIDATE REASON
     * =====================================================
     */

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          message: "Reason is required.",
        },
        { status: 400 }
      );
    }

    if (reason.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reason cannot exceed 1000 characters.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * VALIDATE DATES
     *
     * Expected:
     * YYYY-MM-DD
     * =====================================================
     */

    if (
      !isValidDateOnly(rawStartDate) ||
      !isValidDateOnly(rawEndDate)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid leave dates. Use YYYY-MM-DD.",
        },
        { status: 400 }
      );
    }

    const startDate =
      parseDateOnly(rawStartDate);

    const endDate =
      parseDateOnly(rawEndDate);

    /*
     * End date cannot be before start date.
     */

    if (endDate < startDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "End date cannot be before start date.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * CALCULATE TOTAL DAYS
     * =====================================================
     */

    const totalDays =
      calculateCalendarDays(
        startDate,
        endDate
      );

    if (totalDays <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Leave duration must be at least 1 day.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * PREVENT OVERLAPPING LEAVE REQUESTS
     *
     * Rejected/cancelled requests don't block new requests.
     * =====================================================
     */

    const overlapping =
      await Leave.findOne({
        employeeId: user._id,

        status: {
          $nin: [
            "REJECTED",
            "CANCELLED",
          ],
        },

        startDate: {
          $lte: endDate,
        },

        endDate: {
          $gte: startDate,
        },
      }).lean();

    if (overlapping) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You already have an overlapping leave request.",
        },
        { status: 409 }
      );
    }

    /*
     * =====================================================
     * PAID LEAVE VALIDATION
     *
     * Every employee gets 1 paid leave per calendar month.
     *
     * If absentDays > 3:
     *     entitlement = 0
     *
     * Otherwise:
     *     entitlement = 1
     *
     * The summary also subtracts already-approved
     * paid leave.
     * =====================================================
     */

    if (leaveType === "PAID") {
      /*
       * Paid leave belongs to one calendar month.
       *
       * Prevent a paid leave request from crossing into
       * another month because each month has its own
       * entitlement.
       */

      const startYear =
        startDate.getFullYear();

      const startMonth =
        startDate.getMonth();

      const endYear =
        endDate.getFullYear();

      const endMonth =
        endDate.getMonth();

      if (
        startYear !== endYear ||
        startMonth !== endMonth
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Paid leave must be within the same calendar month.",
          },
          { status: 400 }
        );
      }

      const summary =
        await getPaidLeaveSummary(
          user._id.toString(),
          startYear,
          startMonth + 1
        );

      /*
       * More than 3 absences means no paid leave.
       */

      if (summary.remaining <= 0) {
        if (!summary.eligible) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Paid leave is unavailable because you have more than 3 absent days this month.",
              paidLeaveSummary: summary,
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            message: "You have no paid leave days remaining.",
            paidLeaveSummary: summary,
          },
          { status: 400 }
        );
      }

      /*
       * Employee can apply up to their remaining total (including carried-forward).
       */
      if (totalDays > summary.remaining) {
        return NextResponse.json(
          {
            success: false,
            message: `You have only ${summary.remaining} paid leave day(s) available (including carried-forward leaves). You requested ${totalDays} day(s).`,
            paidLeaveSummary: summary,
          },
          { status: 400 }
        );
      }
    }

    /*
     * =====================================================
     * CREATE LEAVE
     *
     * IMPORTANT:
     *
     * There is NO first approval level.
     * There is NO currentApprovalLevel.
     *
     * All authorized approvers can see/approve this request.
     * =====================================================
     */

    const leave =
      await Leave.create({
        employeeId: user._id,

        employeeName:
          user.name || "",

        employeeEmail:
          user.email || "",

        /*
         * Store normalized role.
         */
        employeeRole:
          role,

        teamId:
          user.teamId || null,

        leaveType,

        startDate,

        endDate,

        totalDays,

        reason,

        /*
         * NEW APPROVAL STATUS
         */
        status:
          "PENDING_APPROVAL",

        /*
         * Approval history starts empty.
         */
        approvalHistory: [],
      });

    /*
     * =====================================================
     * AUDIT LOG
     * =====================================================
     */

    await createAuditLog({
      userId:
        user._id.toString(),

      action: "CREATE",

      module:
        "Leave Management",

      description:
        `Applied for ${leaveType} leave from ${rawStartDate} to ${rawEndDate}`,

      entityType:
        "Leave",

      entityId:
        leave._id.toString(),

      metadata: {
        leaveType,
        totalDays,
        role,
        allowedApprovers,
      },
    });

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json(
      {
        success: true,
        message:
          "Leave request submitted successfully.",
        data: leave,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/leaves error:",
      error
    );

    /*
     * Handle Mongoose validation errors
     * more cleanly.
     */

    if (
      error instanceof
      mongoose.Error.ValidationError
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            Object.values(error.errors)
              .map(
                (item) => item.message
              )
              .join(", "),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Internal server error.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   DATE HELPERS
========================================================= */

/**
 * Validate YYYY-MM-DD without allowing JavaScript's
 * Date parser to silently normalize invalid dates.
 */
function isValidDateOnly(
  value: string
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const [year, month, day] =
    value
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Parse a date-only value as a local midnight date.
 *
 * This avoids the common:
 *
 * new Date("YYYY-MM-DD")
 *
 * timezone conversion issue.
 */
function parseDateOnly(
  value: string
): Date {
  const [year, month, day] =
    value
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    0,
    0,
    0,
    0
  );
}