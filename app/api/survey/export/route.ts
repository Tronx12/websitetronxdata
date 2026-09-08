import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const filter: any = {};
    if (category && ["B2B", "B2H", "B2C"].includes(category)) {
      filter.category = category;
    }

    const items = await SurveyData.find(filter).sort({ createdAt: -1 }).lean();

    const rows = items.map((item: any) => {
      const dataObj =
        item.data instanceof Map
          ? Object.fromEntries(item.data)
          : item.data || {};

      return {
        Category: item.category,
        "Account Type": item.accountType || "",
        "Project No": item.projectNo || "",
        "Panel Code": item.panelCode || "",
        Description: item.description || "",
        PID: item.pid || "",
        "Supplier ID": item.supplierId || "",
        Country: item.country || "",
        IP: item.ip || "",
        Status: item.status || "",
        ...dataObj,
        "Created At": new Date(item.createdAt).toLocaleString(),
        "Updated At": new Date(item.updatedAt).toLocaleString(),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, category || "All");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const filename = `survey-${category || "all"}-${Date.now()}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { success: false, message: "Export failed" },
      { status: 500 }
    );
  }
}
