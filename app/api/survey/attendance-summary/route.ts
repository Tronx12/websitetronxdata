// app/api/survey/attendance-summary/route.ts
//
// Returns attendance status per user per date for one month:
//   { success: true, data: { [userId]: { "YYYY-MM-DD": "Present" | "Absent" | "Work From Home" | ... } } }
//
// !! I could not see your Attendance model, so the model import and the field
// !! names (userId, date, status) below are ASSUMPTIONS. Adjust them to match.

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Attendance from "@/models/Attendance";
import { connectDB } from "@/config/db";
import { resolveAttendanceDay } from "@/lib/attendanceRules";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const sp = req.nextUrl.searchParams;
    const month = sp.get("month") || ""; // "YYYY-MM"
    const tzOffset = Number(sp.get("tzOffset") || 0); // JS sign: IST = -330
    const details = sp.get("details") === "true";

    const rawIds = sp.get("userIds") || sp.get("userId") || "";
    const requestedIds = rawIds
      .split(",")
      .map((s) => s.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, message: "month must be YYYY-MM" },
        { status: 400 }
      );
    }

    const userIds = requestedIds;

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, data: {} });
    }

    // Local-day boundaries -> UTC
    const [y, m] = month.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1) + tzOffset * 60000);
    const end = new Date(Date.UTC(y, m, 1) + tzOffset * 60000);

    const rows = await Attendance.find({
      userId: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
      date: { $gte: start, $lt: end },
    })
      .select("userId date status remarks holiday weeklyOff")
      .lean();

    const data: Record<string, Record<string, any>> = {};

    for (const uid of userIds) {
      data[uid] = {};
    }

    for (const row of rows as any[]) {
      const uid = String(row.userId);
      if (!data[uid]) data[uid] = {};

      // local date key: local time = UTC - tzOffset minutes
      const local = new Date(new Date(row.date).getTime() - tzOffset * 60000);
      const dateKey = local.toISOString().slice(0, 10);

      if (details) {
        data[uid][dateKey] = {
          status: row.status || "",
          remarks: row.remarks || "",
          weeklyOff: Boolean(row.weeklyOff || row.status === "weekly-off"),
          holiday: Boolean(
            row.holiday || row.status === "holiday" || row.status === "festival"
          ),
        };
      } else {
        data[uid][dateKey] = String(row.status || "");
      }
    }

    // For single user or details view: if days in the month have no recorded attendance,
    // resolve scheduled holidays / weekly-offs on the fly so calendar displays accurately.
    if (details && userIds.length <= 5) {
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getDate();
      for (const uid of userIds) {
        for (let d = 1; d <= daysInMonth; d++) {
          const dayKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (!data[uid][dayKey]) {
            const dateObj = new Date(Date.UTC(y, m - 1, d));
            const resolution = await resolveAttendanceDay({
              userId: uid,
              date: dateObj,
            });

            if (resolution.holiday) {
              data[uid][dayKey] = {
                status: resolution.holidayType === "festival" ? "festival" : "holiday",
                remarks: `${resolution.holidayType === "festival" ? "Festival" : "Holiday"}: ${resolution.holidayTitle || "Office Off"}`,
                weeklyOff: false,
                holiday: true,
              };
            } else if (resolution.weeklyOff) {
              data[uid][dayKey] = {
                status: "weekly-off",
                remarks: "Scheduled weekly off",
                weeklyOff: true,
                holiday: false,
              };
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Attendance summary error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load attendance" },
      { status: 500 }
    );
  }
}