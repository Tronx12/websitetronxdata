import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Leave from "@/models/Leave";
import { connectDB } from "@/config/db";
import { createAuditLog } from "@/lib/auditLog";
import { normalizeRole } from "@/lib/leaveRules";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid leave id" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(
      () => ({})
    );

    const approverId =
      request.headers.get("x-user-id") ||
      body.approverId;

    if (
      !approverId ||
      !mongoose.Types.ObjectId.isValid(
        approverId
      )
    ) {
      return NextResponse.json(
        { error: "Approver authentication required" },
        { status: 401 }
      );
    }

    const Auth =
      (await import("@/models/Auth")).default;

    const approver = await Auth.findById(
      approverId
    )
      .select("_id name email role teamId")
      .lean();

    const leave = await Leave.findById(id);

    if (!approver || !leave) {
      return NextResponse.json(
        { error: "Approver or leave not found" },
        { status: 404 }
      );
    }

    if (
      ["APPROVED", "REJECTED", "CANCELLED"].includes(
        leave.status
      )
    ) {
      return NextResponse.json(
        { error: "Leave is already finalized." },
        { status: 400 }
      );
    }

    const role = normalizeRole(approver.role);

    const roleForLevel: Record<string, string> = {
      TEAM_LEAD: "team-lead",
      SENIOR_TEAMLEAD: "senior-teamlead",
      HR: "hr",
      ADMIN: "admin",
    };

    const requiredLevel =
      leave.currentApprovalLevel;

    if (
      !requiredLevel ||
      roleForLevel[requiredLevel] !== role
    ) {
      return NextResponse.json(
        { error: "You cannot reject this leave at this stage." },
        { status: 403 }
      );
    }

    if (
      requiredLevel === "TEAM_LEAD" &&
      String(leave.teamId || "") !==
        String(approver.teamId || "")
    ) {
      return NextResponse.json(
        { error: "You can reject only your team's leave requests." },
        { status: 403 }
      );
    }

    const comment =
      typeof body.comment === "string"
        ? body.comment.trim()
        : "";

    if (!comment) {
      return NextResponse.json(
        { error: "Rejection comment is required" },
        { status: 400 }
      );
    }

    leave.approvalHistory.push({
      level: requiredLevel,
      approverId:
        new mongoose.Types.ObjectId(approverId),
      approverName: approver.name,
      approverEmail: approver.email,
      action: "REJECTED",
      comment,
      actionAt: new Date(),
    });

    leave.status = "REJECTED";
    leave.currentApprovalLevel = null;

    await leave.save();

    await createAuditLog({
      userId: approverId,
      action: "UPDATE",
      module: "Leave Management",
      description:
        `Rejected leave ${leave._id.toString()} at ${requiredLevel} level`,
      entityType: "Leave",
      entityId: leave._id.toString(),
      metadata: {
        level: requiredLevel,
        comment,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Leave rejected.",
      data: leave,
    });
  } catch (error) {
    console.error(
      "POST /api/leaves/[id]/reject error:",
      error
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
