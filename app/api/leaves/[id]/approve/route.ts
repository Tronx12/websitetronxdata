import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import Leave from "@/models/Leave";
import Auth from "@/models/Auth";

import { connectDB } from "@/config/db";
import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/getuser";

import {
  nextApproval,
  normalizeRole,
  pendingStatus,
} from "@/lib/leaveRules";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATE APPROVER
     *
     * Never trust:
     * - x-user-id
     * - body.approverId
     * - query userId
     *
     * The authenticated user comes from the JWT cookies.
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
     *
     * Always load the current database record.
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
     * PREVENT DOUBLE APPROVAL
     * =====================================================
     */

    if (
      [
        "APPROVED",
        "REJECTED",
        "CANCELLED",
      ].includes(leave.status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This leave request is already finalized.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * CURRENT APPROVAL LEVEL
     * =====================================================
     */

    const requiredLevel =
      leave.currentApprovalLevel;

    if (!requiredLevel) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No approval is pending.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * APPROVER ROLE
     * =====================================================
     */

    const role = normalizeRole(
      approver.role
    );

    /*
     * Each approval level has one authorized role.
     */

    const roleForLevel: Record<
      string,
      string
    > = {
      TEAM_LEAD: "team-lead",

      SENIOR_TEAMLEAD:
        "senior-teamlead",

      HR: "hr",

      ADMIN: "admin",
    };

    const requiredRole =
      roleForLevel[requiredLevel];

    /*
     * Unknown approval level protection.
     */

    if (!requiredRole) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid approval level.",
        },
        { status: 500 }
      );
    }

    /*
     * =====================================================
     * ROLE CHECK
     * =====================================================
     */

    if (requiredRole !== role) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Only ${requiredRole} can approve this request.`,
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * TEAM LEAD CHECK
     *
     * Team Lead can approve only leave requests
     * belonging to their assigned team.
     * =====================================================
     */

    if (
      requiredLevel === "TEAM_LEAD"
    ) {
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
     * ADD APPROVAL HISTORY
     * =====================================================
     */

    leave.approvalHistory.push({
      level: requiredLevel,

      approverId:
        new mongoose.Types.ObjectId(
          currentUser.userId
        ),

      approverName:
        approver.name || "",

      approverEmail:
        approver.email || "",

      action: "APPROVED",

      comment,

      actionAt: new Date(),
    });

    /*
     * =====================================================
     * DETERMINE NEXT APPROVAL
     * =====================================================
     */

    const next =
      nextApproval(
        leave.employeeRole,
        requiredLevel
      );

    /*
     * =====================================================
     * FINAL APPROVAL
     * =====================================================
     */

    if (!next) {
      leave.status = "APPROVED";

      leave.currentApprovalLevel = null;
    } else {
      /*
       * Continue approval chain.
       */

      leave.status =
        pendingStatus(next);

      leave.currentApprovalLevel =
        next as any;
    }

    /*
     * =====================================================
     * SAVE
     * =====================================================
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

      action: "UPDATE",

      module:
        "Leave Management",

      description:
        `Approved leave ${leave._id.toString()} at ${requiredLevel} level`,

      entityType:
        "Leave",

      entityId:
        leave._id.toString(),

      metadata: {
        leaveId:
          leave._id.toString(),

        level:
          requiredLevel,

        nextLevel:
          next,

        status:
          leave.status,

        approverId:
          currentUser.userId,

        approverRole:
          approver.role,
      },
    });

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      message: next
        ? `Leave approved and sent to ${next}.`
        : "Leave fully approved.",

      data: leave,
    });
  } catch (error) {
    console.error(
      "POST /api/leaves/[id]/approve error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Internal server error",
      },
      { status: 500 }
    );
  }
}