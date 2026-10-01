import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Leave from "@/models/Leave";
import Auth from "@/models/Auth";
import { connectDB } from "@/config/db";
import { getCurrentUser } from "@/lib/getuser";
import { canApproveLeave, normalizeRole } from "@/lib/leaveRules";

type Params = {
  params: Promise<{ id: string }>;
};

/* =========================================================
   GET /api/leaves/[id]
   Fetches details of a specific leave request.
========================================================= */

export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
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

    const user = await Auth.findById(currentUser.userId)
      .select("_id name email role teamId isActive")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const leave = await Leave.findById(id)
      .populate("employeeId", "name email role teamId")
      .populate("teamId", "name code")
      .populate("approvalHistory.approverId", "name email role")
      .lean();

    if (!leave) {
      return NextResponse.json(
        { success: false, message: "Leave request not found" },
        { status: 404 }
      );
    }

    const role = normalizeRole(user.role);
    const leaveEmployeeId =
      leave.employeeId?._id?.toString() || leave.employeeId?.toString();

    const isOwner = leaveEmployeeId === user._id.toString();
    const isApprover = canApproveLeave(leave.employeeRole, role);
    const isAdminOrHR = ["admin", "hr"].includes(role);

    if (!isOwner && !isApprover && !isAdminOrHR) {
      return NextResponse.json(
        { success: false, message: "You are not authorized to view this leave" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: leave,
    });
  } catch (error) {
    console.error("GET /api/leaves/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch leave",
      },
      { status: 500 }
    );
  }
}