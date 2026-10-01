import { NextRequest, NextResponse } from "next/server";
import Leave from "@/models/Leave";
import Auth from "@/models/Auth";
import { connectDB } from "@/config/db";
import { getCurrentUser } from "@/lib/getuser";
import { canApproveLeave, normalizeRole } from "@/lib/leaveRules";

/* =========================================================
   GET /api/leaves/approvals

   Returns leave requests of ALL statuses
   (PENDING_APPROVAL, APPROVED, REJECTED, CANCELLED)
   that the current user is allowed to review.

   Optional query param: ?status=APPROVED | PENDING_APPROVAL | ...
========================================================= */

const ALLOWED_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await Auth.findById(currentUser.userId)
      .select("_id name email role teamId isActive")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.isActive !== true) {
      return NextResponse.json(
        { success: false, message: "Account is inactive" },
        { status: 403 }
      );
    }

    const role = normalizeRole(user.role);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid leave status" },
        { status: 400 }
      );
    }

    const query: { status?: string } = {};
    if (status) {
      query.status = status;
    }

    const records = await Leave.find(query)
      .populate("employeeId", "name email role teamId")
      .populate("teamId", "name code")
      .sort({ createdAt: -1 })
      .lean();

    const allowedRecords = records.filter((leave: any) => {
      // Never show the user's own leave here
      const employeeId =
        leave.employeeId?._id?.toString() ||
        leave.employeeId?.toString();

      if (employeeId === user._id.toString()) {
        return false;
      }

      // Only leaves this role is permitted to approve
      if (!canApproveLeave(leave.employeeRole, role)) {
        return false;
      }

      // Team Lead: own team only
      if (role === "team-lead") {
        if (!user.teamId) {
          return false;
        }

        const leaveTeamId =
          leave.teamId?._id?.toString() ||
          leave.teamId?.toString();

        if (leaveTeamId !== user.teamId.toString()) {
          return false;
        }
      }

      return true;
    });

    return NextResponse.json({
      success: true,
      data: allowedRecords,
    });
  } catch (error) {
    console.error("GET /api/leaves/approvals error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
