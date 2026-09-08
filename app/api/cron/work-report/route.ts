import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import WorkReport from "@/models/WorkReport";
import { getRange, buildWorkReportBuffer } from "@/app/api/survey/work-report/route";

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
    const { range, from, to } = getRange(searchParams);

    const { buffer, recordCount } = await buildWorkReportBuffer(from, to);
    const fileName = `work-report-${range}-${from.toISOString().slice(0, 10)}_to_${to
      .toISOString()
      .slice(0, 10)}.xlsx`;

    await WorkReport.create({
      range,
      from,
      to,
      fileName,
      fileBase64: buffer.toString("base64"),
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
