// import { NextRequest, NextResponse } from "next/server";
// import { connectDB } from "@/config/db";
// import WorkReport from "@/models/WorkReport";

// // GET /api/survey/reports              -> list metadata for the last 20 generated reports
// // GET /api/survey/reports?id=<reportId>&download=1  -> download one report's xlsx file
// export async function GET(req: NextRequest) {
//   try {
//     await connectDB();
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");

//     if (id) {
//       const report = await WorkReport.findById(id).lean();
//       if (!report) {
//         return NextResponse.json(
//           { success: false, message: "Report not found" },
//           { status: 404 }
//         );
//       }
//       const buffer = Buffer.from((report as any).fileBase64, "base64");
//       return new NextResponse(buffer, {
//         status: 200,
//         headers: {
//           "Content-Type":
//             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//           "Content-Disposition": `attachment; filename="${(report as any).fileName}"`,
//         },
//       });
//     }

//     const reports = await WorkReport.find({}, { fileBase64: 0 })
//       .sort({ generatedAt: -1 })
//       .limit(20)
//       .lean();

//     return NextResponse.json({ success: true, data: reports });
//   } catch (error) {
//     console.error("Reports GET error:", error);
//     return NextResponse.json(
//       { success: false, message: "Failed to fetch reports" },
//       { status: 500 }
//     );
//   }
// }


import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import WorkReport from "@/models/WorkReport";

// GET /api/survey/reports
// -> list metadata for the last 20 generated reports
//
// GET /api/survey/reports?id=<reportId>&download=1
// -> download one report's XLSX file

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");
    const download = searchParams.get("download");

    // =========================================================
    // DOWNLOAD SINGLE REPORT
    // =========================================================
    if (id && download === "1") {
      const report = await WorkReport.findById(id).lean();

      if (!report) {
        return NextResponse.json(
          {
            success: false,
            message: "Report not found",
          },
          { status: 404 }
        );
      }

      const reportData = report as any;

      if (!reportData.fileBase64) {
        return NextResponse.json(
          {
            success: false,
            message: "Report file is not available",
          },
          { status: 404 }
        );
      }

      // Convert Base64 -> Buffer
      const buffer = Buffer.from(reportData.fileBase64, "base64");

      // Safe filename
      const fileName =
        reportData.fileName || `survey-report-${reportData._id}.xlsx`;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition": `attachment; filename="${fileName.replace(
            /["\\]/g,
            ""
          )}"`,

          "Content-Length": buffer.length.toString(),

          "Cache-Control": "no-store",
        },
      });
    }

    // =========================================================
    // LIST REPORTS
    // =========================================================

    // Get reports without fileBase64.
    // fileBase64 can be very large, so it should NOT be returned
    // in the report listing API.
    const reports = await WorkReport.find(
      {},
      {
        fileBase64: 0,
      }
    )
      .sort({ generatedAt: -1 })
      .limit(20)
      .lean();

    // Convert MongoDB documents to plain JSON-safe objects
    const formattedReports = reports.map((report: any) => {
      const result: Record<string, any> = {};

      // Include ALL WorkReport fields except fileBase64
      Object.keys(report).forEach((key) => {
        if (key === "fileBase64") {
          return;
        }

        let value = report[key];

        // Convert ObjectId
        if (
          value &&
          typeof value === "object" &&
          value._bsontype === "ObjectId"
        ) {
          value = value.toString();
        }

        // Convert Date
        if (value instanceof Date) {
          value = value.toISOString();
        }

        // Convert Map
        if (value instanceof Map) {
          value = Object.fromEntries(value);
        }

        result[key] = value ?? "";
      });

      return result;
    });

    return NextResponse.json({
      success: true,
      count: formattedReports.length,
      data: formattedReports,
    });
  } catch (error) {
    console.error("Reports GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch reports",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}