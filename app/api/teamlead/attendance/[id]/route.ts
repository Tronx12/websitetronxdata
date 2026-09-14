// app/api/teamlead/attendance/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import Team from "@/models/Team";
import Attendance from "@/models/Attendance";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";

/* =========================================================
   Helper: resolve the logged-in team lead + the ids of the
   members they are allowed to touch (their own team(s) only)
========================================================= */
async function getTeamLeadScope() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.userId) {
    return { error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }

  if (currentUser.role !== "team-lead") {
    return { error: NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }) };
  }

  const teams = await Team.find({
    teamLead: currentUser.userId,
    isActive: true,
  })
    .select("_id members")
    .lean();

  const memberIds = Array.from(
    new Set(teams.flatMap((t: any) => (t.members || []).map((m: any) => String(m))))
  );

  return { currentUser, memberIds };
}

/* =========================================================
   PUT — edit an attendance record belonging to a member of
   the team lead's own team
========================================================= */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { currentUser, memberIds, error } = await getTeamLeadScope();
    if (error || !currentUser || !memberIds) return error;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Attendance ID is required" },
        { status: 400 }
      );
    }

    const record = await Attendance.findById(id);

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Attendance record not found" },
        { status: 404 }
      );
    }

    if (!memberIds.includes(String(record.userId))) {
      return NextResponse.json(
        { success: false, message: "You can only manage attendance for your own team" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      loggingTime,
      logoutTime,
      lunchStart,
      lunchEnd,
      isLate,
      lateByMinutes,
      loginLocationAddress,
    } = body;

    const before = {
      loggingTime: record.loggingTime,
      logoutTime: record.logoutTime,
      lunchStart: record.lunchStart,
      lunchEnd: record.lunchEnd,
      isLate: record.isLate,
      lateByMinutes: record.lateByMinutes,
      loginLocationAddress: record.loginLocationAddress,
    };

    if (loggingTime !== undefined) record.loggingTime = loggingTime;
    if (logoutTime !== undefined) record.logoutTime = logoutTime;
    if (lunchStart !== undefined) record.lunchStart = lunchStart;
    if (lunchEnd !== undefined) record.lunchEnd = lunchEnd;
    if (typeof isLate === "boolean") record.isLate = isLate;
    if (lateByMinutes !== undefined) record.lateByMinutes = lateByMinutes;
    if (loginLocationAddress !== undefined) record.loginLocationAddress = loginLocationAddress;

    record.updatedBy = new mongoose.Types.ObjectId(currentUser.userId);

    await record.save();

    const updated: any = await Attendance.findById(record._id)
      .populate("userId", "name email role workingShift")
      .populate("updatedBy", "name email")
      .lean();

    await createAuditLog({
      userId: currentUser.userId,
      action: "UPDATE",
      module: "Attendance",
      description: `Updated attendance entry for ${updated?.userId?.name || "a team member"} on ${new Date(
        updated?.date || Date.now()
      ).toDateString()}`,
      entityType: "Attendance",
      entityId: String(record._id),
      metadata: {
        before,
        after: {
          loggingTime: record.loggingTime,
          logoutTime: record.logoutTime,
          lunchStart: record.lunchStart,
          lunchEnd: record.lunchEnd,
          isLate: record.isLate,
          lateByMinutes: record.lateByMinutes,
          loginLocationAddress: record.loginLocationAddress,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("PUT /api/teamlead/attendance/[id] ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update attendance" },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE — remove an attendance record belonging to a member
   of the team lead's own team (e.g. a mistaken manual entry)
========================================================= */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { currentUser, memberIds, error } = await getTeamLeadScope();
    if (error || !currentUser || !memberIds) return error;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Attendance ID is required" },
        { status: 400 }
      );
    }

    const record: any = await Attendance.findById(id).populate("userId", "name email");

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Attendance record not found" },
        { status: 404 }
      );
    }

    if (!memberIds.includes(String(record.userId?._id || record.userId))) {
      return NextResponse.json(
        { success: false, message: "You can only manage attendance for your own team" },
        { status: 403 }
      );
    }

    const deletedSnapshot = {
      userId: record.userId?._id || record.userId,
      date: record.date,
      loggingTime: record.loggingTime,
      logoutTime: record.logoutTime,
      lunchStart: record.lunchStart,
      lunchEnd: record.lunchEnd,
      isLate: record.isLate,
      lateByMinutes: record.lateByMinutes,
    };

    await Attendance.findByIdAndDelete(id);

    await createAuditLog({
      userId: currentUser.userId,
      action: "DELETE",
      module: "Attendance",
      description: `Deleted attendance entry for ${record.userId?.name || "a team member"} on ${new Date(
        record.date
      ).toDateString()}`,
      entityType: "Attendance",
      entityId: id,
      metadata: deletedSnapshot,
    });

    return NextResponse.json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/teamlead/attendance/[id] ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete attendance" },
      { status: 500 }
    );
  }
}