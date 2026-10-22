import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import Attendance from "@/models/Attendance";
import { resolveAttendanceDay } from "@/lib/attendanceRules";
import {
  attendanceDateToUTC,
  getAttendanceDateString,
} from "@/lib/attendanceTimezone";

/**
 * Cron Endpoint: Run 1 hour after shift finish to auto-mark absent.
 * - Day Shift cutoff: 8:30 PM (20:30)
 * - Night Shift cutoff: 7:00 AM
 *
 * Rules:
 * - Holiday (festival/holiday/special) → mark with correct status, NOT absent
 * - Weekly off → mark as "weekly-off", NOT absent
 * - Working day with no login → mark as "absent"
 *
 * GET /api/cron/mark-absent?shift=day
 * GET /api/cron/mark-absent?shift=night
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const shiftParam = searchParams.get("shift");
    const shift =
      shiftParam === "day" || shiftParam === "night" ? shiftParam : "all";
    const dateParam = searchParams.get("date"); // optional YYYY-MM-DD
    const fromParam = searchParams.get("from"); // optional YYYY-MM-DD range start
    const toParam = searchParams.get("to"); // optional YYYY-MM-DD range end
    const userIdParam = searchParams.get("userId");

    // Compute list of date strings to process
    const datesToProcess: string[] = [];
    if (fromParam && toParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) && /^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
      const cur = new Date(`${fromParam}T00:00:00.000Z`);
      const end = new Date(`${toParam}T00:00:00.000Z`);
      while (cur <= end) {
        datesToProcess.push(cur.toISOString().slice(0, 10));
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    } else {
      datesToProcess.push(dateParam || getAttendanceDateString(new Date()));
    }

    // Query users
    const userQuery: any = { isActive: { $ne: false } };
    if (shift !== "all") {
      userQuery.workingShift = shift;
    }
    if (userIdParam && mongoose.Types.ObjectId.isValid(userIdParam)) {
      userQuery._id = new mongoose.Types.ObjectId(userIdParam);
    }

    const users = await Auth.find(userQuery).select(
      "_id name email workingShift"
    );

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        markedAbsentCount: 0,
        message: `No employees found for ${shift} shift.`,
      });
    }

    let markedAbsentCount = 0;
    let markedHolidayCount = 0;
    let markedWeeklyOffCount = 0;

    for (const targetDateString of datesToProcess) {
      const targetDate = attendanceDateToUTC(targetDateString);
      const nextDate = new Date(targetDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      for (const user of users) {
        // Find existing attendance record for this user and date
        const existing = await Attendance.findOne({
          userId: user._id,
          date: { $gte: targetDate, $lt: nextDate },
        });

        // If user has already logged in, do not overwrite
        if (existing?.loggingTime) {
          continue;
        }

        // Check Holiday / Weekly-off rule resolution for this user on this date
        const dayResolution = await resolveAttendanceDay({
          userId: user._id.toString(),
          date: targetDate,
        });

        // ── HOLIDAY / FESTIVAL / SPECIAL ──
        if (dayResolution.holiday) {
          const holidayType = dayResolution.holidayType || "holiday";
          const attendanceStatus =
            holidayType === "festival" ? "festival" : "holiday";

          if (!existing) {
            await Attendance.create({
              userId: user._id,
              date: targetDate,
              shiftDate: targetDate,
              status: attendanceStatus,
              holiday: true,
              holidayId: dayResolution.holidayId
                ? new mongoose.Types.ObjectId(dayResolution.holidayId)
                : null,
              remarks: `${holidayType === "festival" ? "Festival" : "Holiday"}: ${dayResolution.holidayTitle || "Office Off"}`,
            });
          } else if (
            existing.status !== attendanceStatus &&
            existing.status !== "worked-on-holiday"
          ) {
            existing.status = attendanceStatus;
            existing.holiday = true;
            existing.holidayId = dayResolution.holidayId
              ? new mongoose.Types.ObjectId(dayResolution.holidayId)
              : null;
            existing.remarks = `${holidayType === "festival" ? "Festival" : "Holiday"}: ${dayResolution.holidayTitle || "Office Off"}`;
            await existing.save();
          }
          markedHolidayCount++;
          continue;
        }

        // ── WEEKLY OFF ──
        if (dayResolution.weeklyOff) {
          if (!existing) {
            await Attendance.create({
              userId: user._id,
              date: targetDate,
              shiftDate: targetDate,
              status: "weekly-off",
              weeklyOff: true,
              remarks: "Scheduled weekly off",
            });
          } else if (
            existing.status !== "weekly-off" &&
            existing.status !== "worked-on-weekly-off"
          ) {
            existing.status = "weekly-off";
            existing.weeklyOff = true;
            existing.remarks = "Scheduled weekly off";
            await existing.save();
          }
          markedWeeklyOffCount++;
          continue;
        }

        // ── WORKING DAY — no login recorded → mark absent ──
        const userShift = user.workingShift || "day";
        if (!existing) {
          await Attendance.create({
            userId: user._id,
            date: targetDate,
            shiftDate: targetDate,
            status: "absent",
            isLate: false,
            remarks: `Auto-marked absent: No login recorded 1hr post shift end (${userShift} shift)`,
          });
        } else if (existing.status !== "absent") {
          existing.status = "absent";
          existing.remarks = existing.remarks
            ? `${existing.remarks} | Auto-marked absent`
            : `Auto-marked absent: No login recorded 1hr post shift end (${userShift} shift)`;
          await existing.save();
        }
        markedAbsentCount++;
      }
    }

    return NextResponse.json({
      success: true,
      shift,
      datesProcessed: datesToProcess.length,
      totalShiftEmployees: users.length,
      markedAbsentCount,
      markedHolidayCount,
      markedWeeklyOffCount,
      message: `Processed ${shift} shift attendance for ${datesToProcess.length} date(s). Marked ${markedAbsentCount} absent, ${markedHolidayCount} holidays, ${markedWeeklyOffCount} weekly offs.`,
    });
  } catch (error: any) {
    console.error("Cron mark-absent error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to execute auto-absent cron job" },
      { status: 500 }
    );
  }
}
