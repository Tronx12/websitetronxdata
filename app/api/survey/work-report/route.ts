import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import { categoryToStudyType } from "@/lib/parseSurveyBulk";
import * as XLSX from "xlsx";

/**
 * Builds an "IDs" workbook shaped exactly like Data_Format_for_Employee.xlsx:
 *   Date | Project No | PID | Supplier ID | Type of Study (B2B/Genpop/Healthcare) | Account Type (GMS/TRN) | Count
 *
 * GET /api/survey/work-report?range=weekly        -> last 7 days
 * GET /api/survey/work-report?range=monthly        -> current calendar month so far
 * GET /api/survey/work-report?from=...&to=...      -> custom range (ISO dates)
 */
export function getRange(searchParams: URLSearchParams) {
  const range = searchParams.get("range") || "weekly";
  const now = new Date();
  let from: Date;
  let to: Date = now;

  if (searchParams.get("from") && searchParams.get("to")) {
    from = new Date(searchParams.get("from")!);
    to = new Date(searchParams.get("to")!);
  } else if (range === "monthly") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    // weekly: rolling last 7 days
    from = new Date(now);
    from.setDate(from.getDate() - 7);
  }

  return { range, from, to };
}

export async function buildWorkReportBuffer(from: Date, to: Date) {
  await connectDB();

  const items = await SurveyData.find({
    createdAt: { $gte: from, $lte: to },
  })
    .sort({ createdAt: 1 })
    .lean();

  const rows = items.map((item: any) => ({
    Date: new Date(item.createdAt).toISOString().slice(0, 10),
    "Project No": item.projectNo || "",
    PID: item.pid || "",
    "Supplier ID": item.supplierId || "",
    "Type of Study (B2B/Genpop/Healthcare)": categoryToStudyType(item.category),
    "Account Type (GMS/TRN)": item.accountType || "",
    Count: 1,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "IDs");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return { buffer, recordCount: rows.length };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { range, from, to } = getRange(searchParams);

    const { buffer } = await buildWorkReportBuffer(from, to);
    const filename = `work-report-${range}-${from.toISOString().slice(0, 10)}_to_${to
      .toISOString()
      .slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Work report error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate work report" },
      { status: 500 }
    );
  }
}
