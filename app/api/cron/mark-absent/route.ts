import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import Attendance from "@/models/Attendance";
import { resolveAttendanceDay } from "@/lib/attendanceRules";

/**
 * Cron Endpoint: Run 1 hour after shift finish to auto-mark absent.
 * - Day Shift cutoff: 8:30 PM (20:30)
 * - Night Shift cutoff: 7:00 AM
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

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

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
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      // If user has already logged in, do not overwrite
      if (existing?.loggingTime) {
        continue;
      }

      // Check Holiday / Weekly-off rule resolution for this user on this date
      const dayResolution = await resolveAttendanceDay({
        userId: user._id.toString(),
        date: startOfDay,
      });

      if (dayResolution.holiday) {
        if (!existing) {
          await Attendance.create({
            userId: user._id,
            date: startOfDay,
            shiftDate: startOfDay,
            status: "holiday",
            holiday: true,
            holidayId: dayResolution.holidayId
              ? new mongoose.Types.ObjectId(dayResolution.holidayId)
              : null,
            remarks: `Holiday: ${dayResolution.holidayTitle || "Holiday"}`,
          });
        } else if (existing.status !== "holiday") {
          existing.status = "holiday";
          existing.holiday = true;
          existing.holidayId = dayResolution.holidayId
            ? new mongoose.Types.ObjectId(dayResolution.holidayId)
            : null;
          existing.remarks = `Holiday: ${dayResolution.holidayTitle || "Holiday"}`;
          await existing.save();
        }
        markedHolidayCount++;
        continue;
      }

      if (dayResolution.weeklyOff) {
        if (!existing) {
          await Attendance.create({
            userId: user._id,
            date: startOfDay,
            shiftDate: startOfDay,
            status: "weekly-off",
            weeklyOff: true,
            remarks: "Scheduled weekly off",
          });
        } else if (existing.status !== "weekly-off") {
          existing.status = "weekly-off";
          existing.weeklyOff = true;
          existing.remarks = "Scheduled weekly off";
          await existing.save();
        }
        markedWeeklyOffCount++;
        continue;
      }

      // Normal working day & no login recorded → mark as absent
      if (!existing) {
        await Attendance.create({
          userId: user._id,
          date: startOfDay,
          shiftDate: startOfDay,
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
      date: startOfDay.toISOString().slice(0, 10),
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
