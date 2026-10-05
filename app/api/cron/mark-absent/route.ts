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
    const shift = (searchParams.get("shift") as "day" | "night") || "day";
    const dateParam = searchParams.get("date"); // optional YYYY-MM-DD override

    // ── Use UTC midnight dates, consistent with the attendance system ──
    const targetDateString = dateParam || getAttendanceDateString(new Date());
    const targetDate = attendanceDateToUTC(targetDateString);
    const nextDate = new Date(targetDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    // Query all users for the shift
    const users = await Auth.find({
      workingShift: shift,
      isActive: { $ne: false },
    }).select("_id name email workingShift");

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
      // Map the office-off type to the correct attendance status
      if (dayResolution.holiday) {
        const holidayType = dayResolution.holidayType || "holiday";
        // Use "festival" status for festivals, "holiday" for others
        const attendanceStatus = holidayType === "festival" ? "festival" : "holiday";

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
        } else if (existing.status !== attendanceStatus && existing.status !== "worked-on-holiday") {
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
        } else if (existing.status !== "weekly-off" && existing.status !== "worked-on-weekly-off") {
          existing.status = "weekly-off";
          existing.weeklyOff = true;
          existing.remarks = "Scheduled weekly off";
          await existing.save();
        }
        markedWeeklyOffCount++;
        continue;
      }

      // ── WORKING DAY — no login recorded → mark absent ──
      if (!existing) {
        await Attendance.create({
          userId: user._id,
          date: targetDate,
          shiftDate: targetDate,
          status: "absent",
          isLate: false,
          remarks: `Auto-marked absent: No login recorded 1hr post shift end (${shift} shift)`,
        });
      } else if (existing.status !== "absent") {
        existing.status = "absent";
        existing.remarks = existing.remarks
          ? `${existing.remarks} | Auto-marked absent`
          : `Auto-marked absent: No login recorded 1hr post shift end (${shift} shift)`;
        await existing.save();
      }
      markedAbsentCount++;
    }

    return NextResponse.json({
      success: true,
      shift,
      date: targetDateString,
      totalShiftEmployees: users.length,
      markedAbsentCount,
      markedHolidayCount,
      markedWeeklyOffCount,
      message: `Processed ${shift} shift attendance. Marked ${markedAbsentCount} absent, ${markedHolidayCount} holidays, ${markedWeeklyOffCount} weekly offs.`,
    });
  } catch (error: any) {
    console.error("Cron mark-absent error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to execute auto-absent cron job" },
      { status: 500 }
    );
  }
}
