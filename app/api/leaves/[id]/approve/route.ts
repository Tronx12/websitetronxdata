import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Leave from "@/models/Leave";
import Auth from "@/models/Auth";
import { connectDB } from "@/config/db";
import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/getuser";
import { canApproveLeave, normalizeRole } from "@/lib/leaveRules";

type Params = {
  params: Promise<{ id: string }>;
};

/* =========================================================
   POST /api/leaves/[id]/approve

   Approves a pending leave request.
   Any ONE authorized approver can approve.
========================================================= */

const ROLE_TO_AUDIT_LEVEL: Record<string, "TEAM_LEAD" | "SENIOR_TEAMLEAD" | "HR" | "ADMIN"> = {
  "team-lead": "TEAM_LEAD",
  "senior-teamlead": "SENIOR_TEAMLEAD",
  hr: "HR",
  admin: "ADMIN",
};

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Approver authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid leave ID" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (comment.length > 1000) {
      return NextResponse.json(
        { success: false, message: "Comment cannot exceed 1000 characters" },
        { status: 400 }
      );
    }

    const approver = await Auth.findById(currentUser.userId)
      .select("_id name email role teamId isActive")
      .lean();

    if (!approver) {
      return NextResponse.json(
        { success: false, message: "Approver account not found" },
        { status: 404 }
      );
    }

    if (approver.isActive !== true) {
      return NextResponse.json(
        { success: false, message: "Your approver account is inactive" },
        { status: 403 }
      );
    }

    const approverRole = normalizeRole(approver.role);

    const leave = await Leave.findById(id);

    if (!leave) {
      return NextResponse.json(
        { success: false, message: "Leave request not found" },
        { status: 404 }
      );
    }

    // Disallow approving own leave
    if (leave.employeeId.toString() === approver._id.toString()) {
      return NextResponse.json(
        { success: false, message: "You cannot approve your own leave request" },
        { status: 403 }
      );
    }

    if (leave.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { success: false, message: `Leave is already ${leave.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Check permission
    if (!canApproveLeave(leave.employeeRole, approverRole)) {
      return NextResponse.json(
        { success: false, message: "You are not authorized to approve leave for this role" },
        { status: 403 }
      );
    }

    // Team lead restriction
    if (approverRole === "team-lead") {
      if (!approver.teamId) {
        return NextResponse.json(
          { success: false, message: "You must belong to a team to approve team leaves" },
          { status: 403 }
        );
      }

      if (!leave.teamId || leave.teamId.toString() !== approver.teamId.toString()) {
        return NextResponse.json(
          { success: false, message: "You can only approve leaves for your own team members" },
          { status: 403 }
        );
      }
    }

    const auditLevel = ROLE_TO_AUDIT_LEVEL[approverRole] || "ADMIN";

    leave.status = "APPROVED";
    leave.approvalHistory.push({
      level: auditLevel,
      approverId: approver._id,
      approverName: approver.name || "",
      approverEmail: approver.email || "",
      action: "APPROVED",
      comment: comment || "Approved",
      actionAt: new Date(),
    });

    await leave.save();

    await createAuditLog({
      userId: approver._id,
      action: "UPDATE",
      module: "LEAVE",
      description: `Leave request approved for ${leave.employeeName} by ${approver.name || approverRole}`,
      entityType: "LEAVE",
      entityId: leave._id.toString(),
      metadata: {
        leaveId: leave._id.toString(),
        employeeId: leave.employeeId.toString(),
        employeeName: leave.employeeName,
        approverId: approver._id.toString(),
        approverRole,
        comment,
      },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Leave approved successfully",
      data: leave,
    });
  } catch (error) {
    console.error("POST /api/leaves/[id]/approve error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to approve leave",
      },
      { status: 500 }
    );
  }
}