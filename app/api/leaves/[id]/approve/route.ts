import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import Leave from "@/models/Leave";
import Auth from "@/models/Auth";

import { connectDB } from "@/config/db";
import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/getuser";

import {
  canApproveLeave,
  normalizeRole,
} from "@/lib/leaveRules";

type Params = {
  params: Promise<{ id: string }>;
};

/* =========================================================
   POST /api/leaves/[id]/approve

   NEW APPROVAL WORKFLOW:

   survey-tester
     -> team-lead OR senior-teamlead OR hr OR admin

   team-lead
     -> senior-teamlead OR hr OR admin

   data-quality-analyst
     -> hr OR admin

   senior-teamlead
     -> hr OR admin

   hr
     -> admin

   IMPORTANT:
   Only ONE approval is required.

   Once an authorized approver approves:
       PENDING_APPROVAL
              ↓
          APPROVED

   There is NO sequential approval.
========================================================= */

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATE APPROVER
     * =====================================================
     */

    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Approver authentication required",
        },
        { status: 401 }
      );
    }

    await connectDB();

    /*
     * =====================================================
     * LEAVE ID
     * =====================================================
     */

    const { id } = await params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid leave id",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * REQUEST BODY
     *
     * Only comment is accepted.
     *
     * approverId is intentionally ignored.
     * =====================================================
     */

    const body =
      await request.json().catch(
        () => ({})
      );

    const comment =
      typeof body.comment === "string"
        ? body.comment.trim()
        : "";

    if (comment.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Comment cannot exceed 1000 characters.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * LOAD APPROVER
     * =====================================================
     */

    const approver =
      await Auth.findById(
        currentUser.userId
      )
        .select(
          "_id name email role teamId isActive"
        )
        .lean();

    if (!approver) {
      return NextResponse.json(
        {
          success: false,
          message: "Approver not found",
        },
        { status: 404 }
      );
    }

    /*
     * Account must be active.
     */

    if (approver.isActive !== true) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account is inactive",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * LOAD LEAVE
     * =====================================================
     */

    const leave =
      await Leave.findById(id);

    if (!leave) {
      return NextResponse.json(
        {
          success: false,
          message: "Leave not found",
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * ONLY PENDING APPROVAL CAN BE APPROVED
     * =====================================================
     */

    if (
      leave.status !==
      "PENDING_APPROVAL"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This leave request is no longer pending approval.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * PREVENT SELF APPROVAL
     * =====================================================
     */

    if (
      String(leave.employeeId) ===
      String(approver._id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot approve your own leave request.",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * NORMALIZE APPROVER ROLE
     * =====================================================
     */

    const approverRole =
      normalizeRole(
        approver.role
      );

    /*
     * =====================================================
     * CHECK APPROVAL PERMISSION
     * =====================================================
     *
     * This is the main authorization check.
     *
     * Example:
     *
     * survey-tester + team-lead
     *        => true
     *
     * survey-tester + hr
     *        => true
     *
     * data-quality-analyst + team-lead
     *        => false
     * =====================================================
     */

    const allowed =
      canApproveLeave(
        leave.employeeRole,
        approverRole
      );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You are not authorized to approve this leave request.",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * TEAM LEAD SCOPE
     * =====================================================
     *
     * Team Leads can only approve leave requests
     * belonging to their assigned team.
     *
     * HR/Admin/Senior Team Lead do not have this
     * restriction here.
     * =====================================================
     */

    if (
      approverRole ===
      "team-lead"
    ) {
      /*
       * Team Lead must have a team.
       */

      if (!approver.teamId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You are not assigned to a team.",
          },
          { status: 403 }
        );
      }

      /*
       * Leave must belong to a team.
       */

      if (!leave.teamId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This leave request is not assigned to a team.",
          },
          { status: 403 }
        );
      }

      /*
       * Leave team must match approver team.
       */

      if (
        String(leave.teamId) !==
        String(approver.teamId)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You can approve leave only for your assigned team.",
          },
          { status: 403 }
        );
      }
    }

    /*
     * =====================================================
     * APPROVAL HISTORY
     * =====================================================
     *
     * `level` is only for audit/history.
     * It does NOT determine the next approver.
     * =====================================================
     */

    const approvalLevelMap: Record<
      string,
      string
    > = {
      "team-lead":
        "TEAM_LEAD",

      "senior-teamlead":
        "SENIOR_TEAMLEAD",

      hr:
        "HR",

      admin:
        "ADMIN",
    };

    const approvalLevel =
      approvalLevelMap[
        approverRole
      ];

    if (!approvalLevel) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid approver role.",
        },
        { status: 403 }
      );
    }

    /*
     * Add approval history.
     */

    leave.approvalHistory.push({
      level:
        approvalLevel,

      approverId:
        new mongoose.Types.ObjectId(
          currentUser.userId
        ),

      approverName:
        approver.name || "",

      approverEmail:
        approver.email || "",

      action:
        "APPROVED",

      comment,

      actionAt:
        new Date(),
    });

    /*
     * =====================================================
     * FINAL APPROVAL
     * =====================================================
     *
     * Any ONE authorized approver is enough.
     *
     * PENDING_APPROVAL
     *       ↓
     *    APPROVED
     *
     * There is NO nextApproval().
     * =====================================================
     */

    leave.status =
      "APPROVED";

    /*
     * Do NOT use:
     *
     * leave.currentApprovalLevel
     *
     * because that field no longer exists.
     */

    await leave.save();

    /*
     * =====================================================
     * AUDIT LOG
     * =====================================================
     */

    await createAuditLog({
      userId:
        currentUser.userId,

      action:
        "UPDATE",

      module:
        "Leave Management",

      description:
        `Approved leave ${leave._id.toString()}`,

      entityType:
        "Leave",

      entityId:
        leave._id.toString(),

      metadata: {
        leaveId:
          leave._id.toString(),

        status:
          leave.status,

        approverId:
          currentUser.userId,

        approverRole:
          approver.role,

        employeeRole:
          leave.employeeRole,

        approvalLevel,
      },
    });

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Leave approved successfully.",

      data: leave,
    });
  } catch (error) {
    console.error(
      "POST /api/leaves/[id]/approve error:",
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
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}