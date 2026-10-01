import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import LeaveBalance from "@/models/LeaveBalance";
import { getComprehensiveLeaveSummary } from "@/lib/leaveRules";

/**
 * Monthly Cron Endpoint: Run on 1st of each month to snapshot & carry forward leave balances.
 * Schedule: 0 0 1 * * (1st of every month at 00:00 UTC)
 *
 * GET /api/cron/leave-carry-forward
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

    const now = new Date();
    // Snapshot the previous month (which just concluded) and initialize the new month
    let prevYear = now.getFullYear();
    let prevMonth = now.getMonth(); // 0-indexed, so getMonth() is previous month (1-12)

    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Fetch all active employees
    const users = await Auth.find({
      isActive: { $ne: false },
    }).select("_id name email role");

    let processedCount = 0;

    for (const user of users) {
      try {
        // Compute summary for previous month to snapshot final balance
        const prevSummary = await getComprehensiveLeaveSummary(
          user._id,
          prevYear,
          prevMonth
        );

        await LeaveBalance.findOneAndUpdate(
          { employeeId: user._id, year: prevYear, month: prevMonth },
          {
            monthlyEntitlement: prevSummary.monthly.monthlyEntitlement,
            absentDays: prevSummary.monthly.absentDays,
            isEligible: prevSummary.monthly.eligible,
            earned: prevSummary.monthly.earned,
            carriedIn: prevSummary.monthly.carriedForward,
            totalAvailable: prevSummary.monthly.totalAvailable,
            usedPaid: prevSummary.monthly.used,
            usedUnpaid: prevSummary.monthly.unpaidUsed,
            remaining: prevSummary.monthly.remaining,
            notes: `Auto-recorded on month close for ${prevSummary.monthly.monthName} ${prevYear}`,
          },
          { upsert: true, new: true }
        );

        // Compute summary for current (new) month to initialize new month carry-forward
        const currSummary = await getComprehensiveLeaveSummary(
          user._id,
          currentYear,
          currentMonth
        );

        await LeaveBalance.findOneAndUpdate(
          { employeeId: user._id, year: currentYear, month: currentMonth },
          {
            monthlyEntitlement: currSummary.monthly.monthlyEntitlement,
            absentDays: currSummary.monthly.absentDays,
            isEligible: currSummary.monthly.eligible,
            earned: currSummary.monthly.earned,
            carriedIn: currSummary.monthly.carriedForward,
            totalAvailable: currSummary.monthly.totalAvailable,
            usedPaid: currSummary.monthly.used,
            usedUnpaid: currSummary.monthly.unpaidUsed,
            remaining: currSummary.monthly.remaining,
            notes: `Initialized with ${currSummary.monthly.carriedForward} carried forward from previous month`,
          },
          { upsert: true, new: true }
        );

        processedCount++;
      } catch (userError) {
        console.error(`Error processing leave carry forward for user ${user._id}:`, userError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Leave carry-forward processed successfully for ${processedCount} active employees.`,
      processedCount,
      targetMonth: `${currentMonth}/${currentYear}`,
    });
  } catch (error) {
    console.error("GET /api/cron/leave-carry-forward error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Cron execution failed",
      },
      { status: 500 }
    );
  }
}
