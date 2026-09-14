// app/api/survey/work-report/route.ts

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import {
  categoryToStudyType,
} from "@/lib/parseSurveyBulk";

import type { SurveyCategory } from "@/lib/survey-fields";

type ReportRange = "weekly" | "monthly";

interface ReportRow {
  Date: string;
  "Project No": string;
  PID: string;
  "Supplier ID": string;
  "Type of Study (B2B/Genpop/Healthcare)": string;
  "Account Type (GMS/TRN)": string;
  Count: number;
}

interface SurveyRecord {
  _id: unknown;
  category?: SurveyCategory;
  accountType?: string;
  projectNo?: string;
  pid?: string;
  supplierId?: string;
  country?: string;
  status?: string;
  data?: Record<string, unknown>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * ---------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------
 */

function clean(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function getDataValue(
  data: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  if (!data) return "";

  for (const key of keys) {
    if (
      data[key] !== undefined &&
      data[key] !== null &&
      String(data[key]).trim() !== ""
    ) {
      return String(data[key]).trim();
    }
  }

  // Case-insensitive fallback
  const entries = Object.entries(data);

  for (const key of keys) {
    const found = entries.find(
      ([existingKey]) =>
        existingKey.trim().toLowerCase() === key.trim().toLowerCase()
    );

    if (found && found[1] !== undefined && found[1] !== null) {
      return String(found[1]).trim();
    }
  }

  return "";
}

/**
 * Get a field from the proper top-level database field first.
 *
 * Falls back to data{} so that old records created before the
 * parser fix can still appear correctly in the report.
 */
function getField(
  record: SurveyRecord,
  topLevelValue: unknown,
  ...fallbackKeys: string[]
): string {
  const topValue = clean(topLevelValue);

  if (topValue) {
    return topValue;
  }

  return getDataValue(record.data, ...fallbackKeys);
}

/**
 * Convert a date into YYYY-MM-DD.
 */
function formatDate(dateValue: unknown): string {
  if (!dateValue) {
    return "";
  }

  const date = new Date(String(dateValue));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Get start/end date for report.
 *
 * Weekly:
 *   Current week, Monday -> today
 *
 * Monthly:
 *   Current month, first day -> today
 */
function getReportDateRange(range: ReportRange) {
  const now = new Date();

  // Start of today
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  let start: Date;
  let end: Date;

  if (range === "weekly") {
    const day = today.getDay();

    // JS Sunday = 0
    // Convert to Monday-based offset
    const daysFromMonday = day === 0 ? 6 : day - 1;

    start = new Date(today);
    start.setDate(today.getDate() - daysFromMonday);

    end = new Date(today);
    end.setHours(23, 59, 59, 999);
  } else {
    start = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
      0,
      0,
      0,
      0
    );

    end = new Date(today);
    end.setHours(23, 59, 59, 999);
  }

  return {
    start,
    end,
  };
}

/**
 * Escape Excel formula-like values.
 *
 * Prevents values beginning with =, +, -, @ from being
 * interpreted as Excel formulas.
 */
function safeExcelValue(value: string): string {
  if (!value) return "";

  if (/^[=+\-@]/.test(value)) {
    return `'${value}`;
  }

  return value;
}

/**
 * ---------------------------------------------------------
 * GET /api/survey/work-report
 * ---------------------------------------------------------
 *
 * Examples:
 *
 * /api/survey/work-report?range=weekly
 * /api/survey/work-report?range=monthly
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const requestedRange = searchParams.get("range") || "weekly";

    if (
      requestedRange !== "weekly" &&
      requestedRange !== "monthly"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Range must be weekly or monthly",
        },
        {
          status: 400,
        }
      );
    }

    const range = requestedRange as ReportRange;

    const { start, end } = getReportDateRange(range);

    console.log("====================================");
    console.log("WORK REPORT");
    console.log("====================================");
    console.log("Range:", range);
    console.log("Start:", start);
    console.log("End:", end);

    /**
     * -------------------------------------------------------
     * Query survey records
     * -------------------------------------------------------
     *
     * IMPORTANT:
     * Read the fields that are actually stored by
     * /api/survey/route.ts:
     *
     * category
     * accountType
     * projectNo
     * pid
     * supplierId
     * createdAt
     */
    const records = (await SurveyData.find({
      createdAt: {
        $gte: start,
        $lte: end,
      },
    })
      .select({
        category: 1,
        accountType: 1,
        projectNo: 1,
        pid: 1,
        supplierId: 1,
        country: 1,
        status: 1,
        data: 1,
        createdAt: 1,
      })
      .sort({
        createdAt: 1,
      })
      .lean()) as SurveyRecord[];

    console.log("Records found:", records.length);

    /**
     * -------------------------------------------------------
     * Convert records to report rows
     * -------------------------------------------------------
     */
    const reportRows: ReportRow[] = records.map((record) => {
      const category = clean(record.category).toUpperCase() as SurveyCategory;

      const projectNo = getField(
        record,
        record.projectNo,
        "ProjectID",
        "Project Id",
        "Project No",
        "ProjectNo",
        "projectNo"
      );

      const pid = getField(
        record,
        record.pid,
        "PID",
        "Pid",
        "pid"
      );

      const supplierId = getField(
        record,
        record.supplierId,
        "SupplierID",
        "Supplier Id",
        "Supplier ID",
        "supplierId"
      );

      const accountType = getField(
        record,
        record.accountType,
        "Account Type",
        "AccountType",
        "accountType"
      );

      /**
       * Convert:
       *
       * B2C -> Genpop
       * B2H -> Healthcare
       * B2B -> B2B
       */
      let studyType = "";

      if (
        category === "B2B" ||
        category === "B2H" ||
        category === "B2C"
      ) {
        studyType = categoryToStudyType(category);
      }

      const date = formatDate(record.createdAt);

      console.log("REPORT RECORD:", {
        date,
        category,
        projectNo,
        pid,
        supplierId,
        accountType,
        studyType,
      });

      return {
        Date: safeExcelValue(date),

        "Project No": safeExcelValue(projectNo),

        PID: safeExcelValue(pid),

        "Supplier ID": safeExcelValue(supplierId),

        "Type of Study (B2B/Genpop/Healthcare)": safeExcelValue(
          studyType
        ),

        "Account Type (GMS/TRN)": safeExcelValue(
          accountType
        ),

        Count: 1,
      };
    });

    /**
     * -------------------------------------------------------
     * Group identical rows
     * -------------------------------------------------------
     *
     * Example:
     *
     * 2026-09-08 | 79053 | 79054 | supplier1 | Genpop | GMS | 1
     * 2026-09-08 | 79053 | 79054 | supplier1 | Genpop | GMS | 1
     *
     * becomes:
     *
     * 2026-09-08 | 79053 | 79054 | supplier1 | Genpop | GMS | 2
     */
    const grouped = new Map<string, ReportRow>();

    for (const row of reportRows) {
      const key = [
        row.Date,
        row["Project No"],
        row.PID,
        row["Supplier ID"],
        row["Type of Study (B2B/Genpop/Healthcare)"],
        row["Account Type (GMS/TRN)"],
      ].join("|");

      const existing = grouped.get(key);

      if (existing) {
        existing.Count += row.Count;
      } else {
        grouped.set(key, {
          ...row,
          Count: row.Count,
        });
      }
    }

    const finalRows = Array.from(grouped.values());

    /**
     * -------------------------------------------------------
     * Sort
     * -------------------------------------------------------
     */
    finalRows.sort((a, b) => {
      const dateCompare =
        a.Date.localeCompare(b.Date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      const projectCompare =
        a["Project No"].localeCompare(
          b["Project No"]
        );

      if (projectCompare !== 0) {
        return projectCompare;
      }

      return a.PID.localeCompare(b.PID);
    });

    /**
     * -------------------------------------------------------
     * Excel workbook
     * -------------------------------------------------------
     */
    const worksheet = XLSX.utils.json_to_sheet(
      finalRows,
      {
        header: [
          "Date",
          "Project No",
          "PID",
          "Supplier ID",
          "Type of Study (B2B/Genpop/Healthcare)",
          "Account Type (GMS/TRN)",
          "Count",
        ],
      }
    );

    /**
     * Column widths
     */
    worksheet["!cols"] = [
      {
        wch: 14,
      },
      {
        wch: 16,
      },
      {
        wch: 20,
      },
      {
        wch: 28,
      },
      {
        wch: 38,
      },
      {
        wch: 30,
      },
      {
        wch: 10,
      },
    ];

    /**
     * Freeze header row
     */
    worksheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
    };

    /**
     * -------------------------------------------------------
     * Summary sheet
     * -------------------------------------------------------
     */
    const summaryRows = [
      {
        Metric: "Report Type",
        Value:
          range === "weekly"
            ? "Weekly"
            : "Monthly",
      },
      {
        Metric: "Start Date",
        Value: formatDate(start),
      },
      {
        Metric: "End Date",
        Value: formatDate(end),
      },
      {
        Metric: "Total Records",
        Value: records.length,
      },
      {
        Metric: "Report Rows",
        Value: finalRows.length,
      },
    ];

    const summarySheet =
      XLSX.utils.json_to_sheet(summaryRows);

    summarySheet["!cols"] = [
      {
        wch: 25,
      },
      {
        wch: 30,
      },
    ];

    /**
     * -------------------------------------------------------
     * Workbook
     * -------------------------------------------------------
     */
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "IDs"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Summary"
    );

    /**
     * -------------------------------------------------------
     * Generate XLSX buffer
     * -------------------------------------------------------
     */
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const filename = `work-report-${range}-${formatDate(
      new Date()
    )}.xlsx`;

    console.log("Report generated:", filename);
    console.log("Rows:", finalRows.length);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          `attachment; filename="${filename}"`,

        "X-Report-Record-Count": String(records.length),
        "X-Report-From": start.toISOString(),
        "X-Report-To": end.toISOString(),

        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("====================================");
    console.error("WORK REPORT ERROR");
    console.error("====================================");
    console.error("Name:", error?.name);
    console.error("Message:", error?.message);
    console.error("Stack:", error?.stack);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate work report",
        error:
          error?.message ||
          String(error),
      },
      {
        status: 500,
      }
    );
  }
}