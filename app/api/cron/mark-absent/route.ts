import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import Attendance from "@/models/Attendance";
import OfficeOff from "@/models/OfficeOff";
import OfficeSettings from "@/models/OfficeSettings";

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

    // ── 1. Check Manual Office Off / Festival / Holiday ──
    const officeOffRecord = await OfficeOff.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      isActive: true,
    });

    if (officeOffRecord) {
      return NextResponse.json({
        success: true,
        isOfficeOff: true,
        message: `Office is closed today (${officeOffRecord.title}). Skip marking absent.`,
        officeOffTitle: officeOffRecord.title,
      });
    }

    // ── 2. Check Weekend Off Settings ──
    const dayOfWeek = startOfDay.getDay(); // 0 = Sunday, 6 = Saturday
    const officeSettings = await OfficeSettings.findOne().lean();

    if (officeSettings) {
      const isSundayOff = officeSettings.sundayOff && dayOfWeek === 0;
      const isSaturdayOff = officeSettings.saturdayOff && dayOfWeek === 6;
      const isWeekendOff = officeSettings.weekendOff && (dayOfWeek === 0 || dayOfWeek === 6);

      if (isSundayOff || isSaturdayOff || isWeekendOff) {
        return NextResponse.json({
          success: true,
          isOfficeOff: true,
          message: "Today is a scheduled weekend off. Skip marking absent.",
        });
      }
    }

    // ── 3. Query all users for the shift ──
    const users = await Auth.find({ workingShift: shift }).select("_id name email");

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        markedAbsentCount: 0,
        message: `No employees found for ${shift} shift.`,
      });
    }

    let markedAbsentCount = 0;

    for (const user of users) {
      // Find existing attendance record for this user and date
      const existing = await Attendance.findOne({
        userId: user._id,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      // If user has no record or has not logged in, mark as absent
      if (!existing || !existing.loggingTime) {
        if (!existing) {
          await Attendance.create({
            userId: user._id,
            date: startOfDay,
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
    }

    return NextResponse.json({
      success: true,
      shift,
      date: startOfDay.toISOString().slice(0, 10),
      totalShiftEmployees: users.length,
      markedAbsentCount,
      message: `Successfully processed ${shift} shift attendance. Marked ${markedAbsentCount} employees absent.`,
    });
  } catch (error: any) {
    console.error("Cron mark-absent error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to execute auto-absent cron job" },
      { status: 500 }
    );
  }
}
