// app/api/teamlead/attendance/route.js

import { NextResponse } from "next/server";

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
    .select("_id name members")
    .lean();

  const memberIds = Array.from(
    new Set(
      teams.flatMap((t) => (t.members || []).map((m) => String(m)))
    )
  );

  return { currentUser, teams, memberIds };
}

/* =========================================================
   GET  — list attendance for the team lead's own team members
========================================================= */
export async function GET(req) {
  try {
    await connectDB();

    const { currentUser, memberIds, error } = await getTeamLeadScope();
    if (error) return error;

    if (memberIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const memberId = searchParams.get("memberId"); // optional single-member filter

    const query = { userId: { $in: memberIds } };

    if (memberId) {
      if (!memberIds.includes(memberId)) {
        return NextResponse.json(
          { success: false, message: "That member is not on your team" },
          { status: 403 }
        );
      }
      query.userId = memberId;
    }

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const records = await Attendance.find(query)
      .populate("userId", "name email role workingShift")
      .populate("updatedBy", "name email")
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("GET /api/teamlead/attendance ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST — team lead manually adds an attendance record for
   one of their own team members (e.g. backfilling a missed day)
========================================================= */
export async function POST(req) {
  try {
    await connectDB();

    const { currentUser, memberIds, error } = await getTeamLeadScope();
    if (error) return error;

    const body = await req.json();
    const {
      userId,
      date,
      loggingTime,
      logoutTime,
      lunchStart,
      lunchEnd,
      isLate,
      lateByMinutes,
      loginLocationAddress,
    } = body;

    if (!userId || !date) {
      return NextResponse.json(
        { success: false, message: "userId and date are required" },
        { status: 400 }
      );
    }

    if (!memberIds.includes(String(userId))) {
      return NextResponse.json(
        { success: false, message: "You can only manage attendance for your own team" },
        { status: 403 }
      );
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await Attendance.findOne({
      userId,
      date: { $gte: dayStart, $lte: dayEnd },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "An attendance record for this member and date already exists" },
        { status: 400 }
      );
    }

    const record = await Attendance.create({
      userId,
      date,
      loggingTime,
      logoutTime,
      lunchStart,
      lunchEnd,
      isLate: !!isLate,
      lateByMinutes: lateByMinutes || 0,
      loginLocationAddress,
      updatedBy: currentUser.userId,
    });

    const populated = await Attendance.findById(record._id)
      .populate("userId", "name email role workingShift")
      .populate("updatedBy", "name email")
      .lean();

    await createAuditLog({
      userId: currentUser.userId,
      action: "CREATE",
      module: "Attendance",
      description: `Added an attendance entry for ${populated.userId?.name || "a team member"} on ${new Date(
        date
      ).toDateString()}`,
      entityType: "Attendance",
      entityId: record._id,
      metadata: { userId, date },
      req,
    });

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error) {
    console.error("POST /api/teamlead/attendance ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create attendance record" },
      { status: 500 }
    );
  }
}