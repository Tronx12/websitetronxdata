import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import WorkReport from "@/models/WorkReport";

// GET /api/survey/reports              -> list metadata for the last 20 generated reports
// GET /api/survey/reports?id=<reportId>&download=1  -> download one report's xlsx file
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const report = await WorkReport.findById(id).lean();
      if (!report) {
        return NextResponse.json(
          { success: false, message: "Report not found" },
          { status: 404 }
        );
      }
      const buffer = Buffer.from((report as any).fileBase64, "base64");
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${(report as any).fileName}"`,
        },
      });
    }

    const reports = await WorkReport.find({}, { fileBase64: 0 })
      .sort({ generatedAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
