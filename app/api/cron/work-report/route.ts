import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import WorkReport from "@/models/WorkReport";

type ReportRange = "weekly" | "monthly";

/**
 * Triggered on a schedule by Vercel Cron (see vercel.json).
 * Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on cron invocations,
 * so set CRON_SECRET in your project's env vars and it's verified here.
 *
 *   GET /api/cron/work-report?range=weekly
 *   GET /api/cron/work-report?range=monthly
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
    const requestedRange = searchParams.get("range") || "weekly";

    if (requestedRange !== "weekly" && requestedRange !== "monthly") {
      return NextResponse.json(
        { success: false, message: "Range must be weekly or monthly" },
        { status: 400 }
      );
    }

    const range = requestedRange as ReportRange;
    const reportUrl = new URL("/api/survey/work-report", req.url);
    reportUrl.searchParams.set("range", range);
    const reportResponse = await fetch(reportUrl);

    if (!reportResponse.ok) {
      throw new Error(`Report endpoint returned ${reportResponse.status}`);
    }

    const reportBuffer = Buffer.from(await reportResponse.arrayBuffer());
    const from = new Date(reportResponse.headers.get("X-Report-From") || "");
    const to = new Date(reportResponse.headers.get("X-Report-To") || "");

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new Error("Report endpoint returned an invalid date range");
    }

    const recordCount = Number(
      reportResponse.headers.get("X-Report-Record-Count") || 0
    );

    const fileName = `work-report-${range}-${from.toISOString().slice(0, 10)}_to_${to
      .toISOString()
      .slice(0, 10)}.xlsx`;

    await WorkReport.create({
      range,
      from,
      to,
      fileName,
      fileBase64: reportBuffer.toString("base64"),
      recordCount,
    });

    return NextResponse.json({
      success: true,
      message: `${range} work report generated (${recordCount} records)`,
      fileName,
    });
  } catch (error) {
    console.error("Cron work-report error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate scheduled work report" },
      { status: 500 }
    );
  }
}
