// // app/api/survey/work-report/route.ts

// import { NextRequest, NextResponse } from "next/server";
// import * as XLSX from "xlsx";

// import { connectDB } from "@/config/db";
// import SurveyData from "@/models/SurveyData";
// import {
//   categoryToStudyType,
// } from "@/lib/parseSurveyBulk";

// import type { SurveyCategory } from "@/lib/survey-fields";

// type ReportRange = "weekly" | "monthly";

// interface ReportRow {
//   Date: string;
//   "Project No": string;
//   PID: string;
//   "Supplier ID": string;
//   "Type of Study (B2B/Genpop/Healthcare)": string;
//   "Account Type (GMS/TRN)": string;
//   Count: number;
// }

// interface SurveyRecord {
//   _id: unknown;
//   category?: SurveyCategory;
//   accountType?: string;
//   projectNo?: string;
//   pid?: string;
//   supplierId?: string;
//   country?: string;
//   status?: string;
//   data?: Record<string, unknown>;
//   createdAt?: Date | string;
//   updatedAt?: Date | string;
// }

// /**
//  * ---------------------------------------------------------
//  * Helpers
//  * ---------------------------------------------------------
//  */

// function clean(value: unknown): string {
//   if (value === null || value === undefined) {
//     return "";
//   }

//   return String(value).trim();
// }

// function getDataValue(
//   data: Record<string, unknown> | undefined,
//   ...keys: string[]
// ): string {
//   if (!data) return "";

//   for (const key of keys) {
//     if (
//       data[key] !== undefined &&
//       data[key] !== null &&
//       String(data[key]).trim() !== ""
//     ) {
//       return String(data[key]).trim();
//     }
//   }

//   // Case-insensitive fallback
//   const entries = Object.entries(data);

//   for (const key of keys) {
//     const found = entries.find(
//       ([existingKey]) =>
//         existingKey.trim().toLowerCase() === key.trim().toLowerCase()
//     );

//     if (found && found[1] !== undefined && found[1] !== null) {
//       return String(found[1]).trim();
//     }
//   }

//   return "";
// }

// /**
//  * Get a field from the proper top-level database field first.
//  *
//  * Falls back to data{} so that old records created before the
//  * parser fix can still appear correctly in the report.
//  */
// function getField(
//   record: SurveyRecord,
//   topLevelValue: unknown,
//   ...fallbackKeys: string[]
// ): string {
//   const topValue = clean(topLevelValue);

//   if (topValue) {
//     return topValue;
//   }

//   return getDataValue(record.data, ...fallbackKeys);
// }

// /**
//  * Convert a date into YYYY-MM-DD.
//  */
// function formatDate(dateValue: unknown): string {
//   if (!dateValue) {
//     return "";
//   }

//   const date = new Date(String(dateValue));

//   if (Number.isNaN(date.getTime())) {
//     return "";
//   }

//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const day = String(date.getDate()).padStart(2, "0");

//   return `${year}-${month}-${day}`;
// }

// /**
//  * Get start/end date for report.
//  *
//  * Weekly:
//  *   Current week, Monday -> today
//  *
//  * Monthly:
//  *   Current month, first day -> today
//  */
// function getReportDateRange(range: ReportRange) {
//   const now = new Date();

//   // Start of today
//   const today = new Date(
//     now.getFullYear(),
//     now.getMonth(),
//     now.getDate(),
//     0,
//     0,
//     0,
//     0
//   );

//   let start: Date;
//   let end: Date;

//   if (range === "weekly") {
//     const day = today.getDay();

//     // JS Sunday = 0
//     // Convert to Monday-based offset
//     const daysFromMonday = day === 0 ? 6 : day - 1;

//     start = new Date(today);
//     start.setDate(today.getDate() - daysFromMonday);

//     end = new Date(today);
//     end.setHours(23, 59, 59, 999);
//   } else {
//     start = new Date(
//       today.getFullYear(),
//       today.getMonth(),
//       1,
//       0,
//       0,
//       0,
//       0
//     );

//     end = new Date(today);
//     end.setHours(23, 59, 59, 999);
//   }

//   return {
//     start,
//     end,
//   };
// }

// /**
//  * Escape Excel formula-like values.
//  *
//  * Prevents values beginning with =, +, -, @ from being
//  * interpreted as Excel formulas.
//  */
// function safeExcelValue(value: string): string {
//   if (!value) return "";

//   if (/^[=+\-@]/.test(value)) {
//     return `'${value}`;
//   }

//   return value;
// }

// /**
//  * ---------------------------------------------------------
//  * GET /api/survey/work-report
//  * ---------------------------------------------------------
//  *
//  * Examples:
//  *
//  * /api/survey/work-report?range=weekly
//  * /api/survey/work-report?range=monthly
//  */
// export async function GET(req: NextRequest) {
//   try {
//     await connectDB();

//     const { searchParams } = new URL(req.url);

//     const requestedRange = searchParams.get("range") || "weekly";

//     if (
//       requestedRange !== "weekly" &&
//       requestedRange !== "monthly"
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Range must be weekly or monthly",
//         },
//         {
//           status: 400,
//         }
//       );
//     }

//     const range = requestedRange as ReportRange;

//     const { start, end } = getReportDateRange(range);

//     console.log("====================================");
//     console.log("WORK REPORT");
//     console.log("====================================");
//     console.log("Range:", range);
//     console.log("Start:", start);
//     console.log("End:", end);

//     /**
//      * -------------------------------------------------------
//      * Query survey records
//      * -------------------------------------------------------
//      *
//      * IMPORTANT:
//      * Read the fields that are actually stored by
//      * /api/survey/route.ts:
//      *
//      * category
//      * accountType
//      * projectNo
//      * pid
//      * supplierId
//      * createdAt
//      */
//     const records = (await SurveyData.find({
//       createdAt: {
//         $gte: start,
//         $lte: end,
//       },
//     })
//       .select({
//         category: 1,
//         accountType: 1,
//         projectNo: 1,
//         pid: 1,
//         supplierId: 1,
//         country: 1,
//         status: 1,
//         data: 1,
//         createdAt: 1,
//       })
//       .sort({
//         createdAt: 1,
//       })
//       .lean()) as SurveyRecord[];

//     console.log("Records found:", records.length);

//     /**
//      * -------------------------------------------------------
//      * Convert records to report rows
//      * -------------------------------------------------------
//      */
//     const reportRows: ReportRow[] = records.map((record) => {
//       const category = clean(record.category).toUpperCase() as SurveyCategory;

//       const projectNo = getField(
//         record,
//         record.projectNo,
//         "ProjectID",
//         "Project Id",
//         "Project No",
//         "ProjectNo",
//         "projectNo"
//       );

//       const pid = getField(
//         record,
//         record.pid,
//         "PID",
//         "Pid",
//         "pid"
//       );

//       const supplierId = getField(
//         record,
//         record.supplierId,
//         "SupplierID",
//         "Supplier Id",
//         "Supplier ID",
//         "supplierId"
//       );

//       const accountType = getField(
//         record,
//         record.accountType,
//         "Account Type",
//         "AccountType",
//         "accountType"
//       );

//       /**
//        * Convert:
//        *
//        * B2C -> Genpop
//        * B2H -> Healthcare
//        * B2B -> B2B
//        */
//       let studyType = "";

//       if (
//         category === "B2B" ||
//         category === "B2H" ||
//         category === "B2C"
//       ) {
//         studyType = categoryToStudyType(category);
//       }

//       const date = formatDate(record.createdAt);

//       console.log("REPORT RECORD:", {
//         date,
//         category,
//         projectNo,
//         pid,
//         supplierId,
//         accountType,
//         studyType,
//       });

//       return {
//         Date: safeExcelValue(date),

//         "Project No": safeExcelValue(projectNo),

//         PID: safeExcelValue(pid),

//         "Supplier ID": safeExcelValue(supplierId),

//         "Type of Study (B2B/Genpop/Healthcare)": safeExcelValue(
//           studyType
//         ),

//         "Account Type (GMS/TRN)": safeExcelValue(
//           accountType
//         ),

//         Count: 1,
//       };
//     });

//     /**
//      * -------------------------------------------------------
//      * Group identical rows
//      * -------------------------------------------------------
//      *
//      * Example:
//      *
//      * 2026-09-08 | 79053 | 79054 | supplier1 | Genpop | GMS | 1
//      * 2026-09-08 | 79053 | 79054 | supplier1 | Genpop | GMS | 1
//      *
//      * becomes:
//      *
//      * 2026-09-08 | 79053 | 79054 | supplier1 | Genpop | GMS | 2
//      */
//     const grouped = new Map<string, ReportRow>();

//     for (const row of reportRows) {
//       const key = [
//         row.Date,
//         row["Project No"],
//         row.PID,
//         row["Supplier ID"],
//         row["Type of Study (B2B/Genpop/Healthcare)"],
//         row["Account Type (GMS/TRN)"],
//       ].join("|");

//       const existing = grouped.get(key);

//       if (existing) {
//         existing.Count += row.Count;
//       } else {
//         grouped.set(key, {
//           ...row,
//           Count: row.Count,
//         });
//       }
//     }

//     const finalRows = Array.from(grouped.values());

//     /**
//      * -------------------------------------------------------
//      * Sort
//      * -------------------------------------------------------
//      */
//     finalRows.sort((a, b) => {
//       const dateCompare =
//         a.Date.localeCompare(b.Date);

//       if (dateCompare !== 0) {
//         return dateCompare;
//       }

//       const projectCompare =
//         a["Project No"].localeCompare(
//           b["Project No"]
//         );

//       if (projectCompare !== 0) {
//         return projectCompare;
//       }

//       return a.PID.localeCompare(b.PID);
//     });

//     /**
//      * -------------------------------------------------------
//      * Excel workbook
//      * -------------------------------------------------------
//      */
//     const worksheet = XLSX.utils.json_to_sheet(
//       finalRows,
//       {
//         header: [
//           "Date",
//           "Project No",
//           "PID",
//           "Supplier ID",
//           "Type of Study (B2B/Genpop/Healthcare)",
//           "Account Type (GMS/TRN)",
//           "Count",
//         ],
//       }
//     );

//     /**
//      * Column widths
//      */
//     worksheet["!cols"] = [
//       {
//         wch: 14,
//       },
//       {
//         wch: 16,
//       },
//       {
//         wch: 20,
//       },
//       {
//         wch: 28,
//       },
//       {
//         wch: 38,
//       },
//       {
//         wch: 30,
//       },
//       {
//         wch: 10,
//       },
//     ];

//     /**
//      * Freeze header row
//      */
//     worksheet["!freeze"] = {
//       xSplit: 0,
//       ySplit: 1,
//     };

//     /**
//      * -------------------------------------------------------
//      * Summary sheet
//      * -------------------------------------------------------
//      */
//     const summaryRows = [
//       {
//         Metric: "Report Type",
//         Value:
//           range === "weekly"
//             ? "Weekly"
//             : "Monthly",
//       },
//       {
//         Metric: "Start Date",
//         Value: formatDate(start),
//       },
//       {
//         Metric: "End Date",
//         Value: formatDate(end),
//       },
//       {
//         Metric: "Total Records",
//         Value: records.length,
//       },
//       {
//         Metric: "Report Rows",
//         Value: finalRows.length,
//       },
//     ];

//     const summarySheet =
//       XLSX.utils.json_to_sheet(summaryRows);

//     summarySheet["!cols"] = [
//       {
//         wch: 25,
//       },
//       {
//         wch: 30,
//       },
//     ];

//     /**
//      * -------------------------------------------------------
//      * Workbook
//      * -------------------------------------------------------
//      */
//     const workbook = XLSX.utils.book_new();

//     XLSX.utils.book_append_sheet(
//       workbook,
//       worksheet,
//       "IDs"
//     );

//     XLSX.utils.book_append_sheet(
//       workbook,
//       summarySheet,
//       "Summary"
//     );

//     /**
//      * -------------------------------------------------------
//      * Generate XLSX buffer
//      * -------------------------------------------------------
//      */
//     const buffer = XLSX.write(workbook, {
//       type: "buffer",
//       bookType: "xlsx",
//     });

//     const filename = `work-report-${range}-${formatDate(
//       new Date()
//     )}.xlsx`;

//     console.log("Report generated:", filename);
//     console.log("Rows:", finalRows.length);

//     return new NextResponse(buffer, {
//       status: 200,
//       headers: {
//         "Content-Type":
//           "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

//         "Content-Disposition":
//           `attachment; filename="${filename}"`,

//         "X-Report-Record-Count": String(records.length),
//         "X-Report-From": start.toISOString(),
//         "X-Report-To": end.toISOString(),

//         "Cache-Control":
//           "no-store, no-cache, must-revalidate",
//       },
//     });
//   } catch (error: any) {
//     console.error("====================================");
//     console.error("WORK REPORT ERROR");
//     console.error("====================================");
//     console.error("Name:", error?.name);
//     console.error("Message:", error?.message);
//     console.error("Stack:", error?.stack);

//     return NextResponse.json(
//       {
//         success: false,
//         message: "Failed to generate work report",
//         error:
//           error?.message ||
//           String(error),
//       },
//       {
//         status: 500,
//       }
//     );
//   }
// }

// app/api/survey/work-report/route.ts

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import ExcelJS from "exceljs";

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import Auth from "@/models/Auth";
import Team from "@/models/Team";
import { getCurrentUser } from "@/lib/getuser";

type ReportRange = "weekly" | "monthly";

function normalizeRole(role: unknown) {
  return String(role || "")
    .toLowerCase()
    .replace(/[-_\s]/g, "");
}

function toObjectId(value: unknown) {
  if (!value) return null;

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (mongoose.Types.ObjectId.isValid(String(value))) {
    return new mongoose.Types.ObjectId(String(value));
  }

  return null;
}

async function getTeamMemberIdsForLead(
  teamLeadId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
  const ids = new Set<string>();

  const leadId = String(teamLeadId);

  // Always include the Team Lead himself
  ids.add(leadId);

  // ---------------------------------------------------------
  // 1. Find teams where the user is:
  //    - teamLead
  //    - OR directly inside members
  // ---------------------------------------------------------
  const teams = await Team.find({
    $or: [
      { teamLead: teamLeadId },
      { members: teamLeadId },
    ],
    isActive: true,
  })
    .select("_id members teamLead")
    .lean();

  // ---------------------------------------------------------
  // 2. Collect users stored directly in Team.members
  // ---------------------------------------------------------
  for (const team of teams as any[]) {
    for (const member of team.members || []) {
      const memberId =
        member?._id ??
        member?.id ??
        member;

      const id = String(memberId);

      if (mongoose.Types.ObjectId.isValid(id)) {
        ids.add(id);
      }
    }

    // Also include the team lead stored in the Team document
    if (team.teamLead) {
      const id = String(
        team.teamLead?._id ??
        team.teamLead?.id ??
        team.teamLead
      );

      if (mongoose.Types.ObjectId.isValid(id)) {
        ids.add(id);
      }
    }
  }

  // ---------------------------------------------------------
  // 3. Collect users through Auth.teamId
  // ---------------------------------------------------------
  const teamIds = teams
    .map((team: any) => team._id)
    .filter(Boolean);

  if (teamIds.length > 0) {
    const teamUsers = await Auth.find(
      {
        teamId: { $in: teamIds },
        isDeleted: { $ne: true },
        isActive: { $ne: false },
      },
      { _id: 1 }
    ).lean();

    for (const user of teamUsers as any[]) {
      const id = String(user._id);

      if (mongoose.Types.ObjectId.isValid(id)) {
        ids.add(id);
      }
    }
  }

  // ---------------------------------------------------------
  // 4. Return valid ObjectIds
  // ---------------------------------------------------------
  return [...ids]
    .filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    )
    .map(
      (id) =>
        new mongoose.Types.ObjectId(id)
    );
}

// async function getTeamMemberIdsForLead(
//   teamLeadId: mongoose.Types.ObjectId
// ): Promise<mongoose.Types.ObjectId[]> {
//   const teams = await Team.find({
//     teamLead: teamLeadId,
//     isActive: true,
//   })
//     .select("members")
//     .lean();

//   const ids = new Set<string>();

//   teams.forEach((team: any) => {
//     (team.members || []).forEach((member: any) => {
//       ids.add(String(member));
//     });
//   });

//   ids.delete(String(teamLeadId));

//   return [...ids]
//     .filter((id) => mongoose.Types.ObjectId.isValid(id))
//     .map((id) => new mongoose.Types.ObjectId(id));
// }

// async function getTeamMemberIdsForLead(
//   teamLeadId: mongoose.Types.ObjectId
// ): Promise<mongoose.Types.ObjectId[]> {
//   const ids = new Set<string>();

//   // ---------------------------------------------------------
//   // 1. Get teams where this user is Team Lead
//   // ---------------------------------------------------------
//   const teams = await Team.find({
//     teamLead: teamLeadId,
//     isActive: true,
//   })
//     .select("_id members")
//     .lean();

//   // Add members stored directly in Team.members
//   for (const team of teams as any[]) {
//     for (const member of team.members || []) {
//       const id = String(member);

//       if (mongoose.Types.ObjectId.isValid(id)) {
//         ids.add(id);
//       }
//     }
//   }

//   // ---------------------------------------------------------
//   // 2. Also get users through Auth.teamId
//   // ---------------------------------------------------------
//   // This handles projects where the user's team relationship
//   // is stored in Auth instead of Team.members.
//   const teamIds = teams
//     .map((team: any) => team._id)
//     .filter(Boolean);

//   if (teamIds.length > 0) {
//     const teamUsers = await Auth.find(
//       {
//         teamId: { $in: teamIds },
//         isDeleted: { $ne: true },
//         isActive: { $ne: false },
//       },
//       { _id: 1 }
//     ).lean();

//     for (const user of teamUsers as any[]) {
//       const id = String(user._id);

//       if (mongoose.Types.ObjectId.isValid(id)) {
//         ids.add(id);
//       }
//     }
//   }

//   // ---------------------------------------------------------
//   // 3. Do NOT remove Team Lead
//   // ---------------------------------------------------------
//   // Team Lead should also be able to see/download their own
//   // submitted survey data.
//   ids.add(String(teamLeadId));

//   return [...ids]
//     .filter((id) => mongoose.Types.ObjectId.isValid(id))
//     .map((id) => new mongoose.Types.ObjectId(id));
// }

// async function resolveTeamLeadFilter(
//   searchParams: URLSearchParams,
//   userOid: mongoose.Types.ObjectId
// ) {
//   const scope = searchParams.get("scope");
//   const createdBy = searchParams.get("createdBy");

//   const teamMemberIds = await getTeamMemberIdsForLead(userOid);

//   if (scope === "team") {
//     return {
//       createdBy: {
//         $in: teamMemberIds,
//       },
//     };
//   }

//   if (createdBy) {
//     const createdByOid = toObjectId(createdBy);

//     if (!createdByOid) return null;

//     if (createdByOid.toString() === userOid.toString()) {
//       return {
//         createdBy: userOid,
//       };
//     }

//     const isTeamMember = teamMemberIds.some(
//       (id) => id.toString() === createdByOid.toString()
//     );

//     if (!isTeamMember) return null;

//     return {
//       createdBy: createdByOid,
//     };
//   }

//   return {
//     createdBy: userOid,
//   };
// }
// async function resolveTeamLeadFilter(
//   searchParams: URLSearchParams,
//   userOid: mongoose.Types.ObjectId
// ) {
//   const scope = searchParams.get("scope");
//   const createdBy = searchParams.get("createdBy");

//   const teamMemberIds = await getTeamMemberIdsForLead(userOid);

//   // ---------------------------------------------------------
//   // TEAM SCOPE
//   // ---------------------------------------------------------
//   if (scope === "team") {
//     return {
//       createdBy: {
//         $in: teamMemberIds,
//       },
//     };
//   }

//   // ---------------------------------------------------------
//   // SPECIFIC USER
//   // ---------------------------------------------------------
//   if (createdBy) {
//     const createdByOid = toObjectId(createdBy);

//     if (!createdByOid) {
//       return null;
//     }

//     const isAllowed = teamMemberIds.some(
//       (id) => id.toString() === createdByOid.toString()
//     );

//     if (!isAllowed) {
//       return null;
//     }

//     return {
//       createdBy: createdByOid,
//     };
//   }

//   // ---------------------------------------------------------
//   // DEFAULT TEAM LEAD VIEW
//   // ---------------------------------------------------------
//   return {
//     createdBy: {
//       $in: teamMemberIds,
//     },
//   };
// }

async function resolveTeamLeadFilter(
  searchParams: URLSearchParams,
  userOid: mongoose.Types.ObjectId
) {
  const scope = searchParams.get("scope");
  const createdBy = searchParams.get("createdBy");

  const teamMemberIds =
    await getTeamMemberIdsForLead(userOid);

  console.log(
    "[WORK REPORT] Team Lead:",
    String(userOid)
  );

  console.log(
    "[WORK REPORT] Team Member IDs:",
    teamMemberIds.map((id) => String(id))
  );

  // ---------------------------------------------------------
  // Team Lead wants complete team report
  // ---------------------------------------------------------
  if (scope === "team") {
    return {
      createdBy: {
        $in: teamMemberIds,
      },
    };
  }

  // ---------------------------------------------------------
  // Specific user selected
  // ---------------------------------------------------------
  if (createdBy) {
    const createdByOid =
      toObjectId(createdBy);

    if (!createdByOid) {
      return null;
    }

    const isAllowed =
      teamMemberIds.some(
        (id) =>
          id.toString() ===
          createdByOid.toString()
      );

    if (!isAllowed) {
      return null;
    }

    return {
      createdBy: createdByOid,
    };
  }

  // ---------------------------------------------------------
  // Default = complete Team Lead team
  // ---------------------------------------------------------
  return {
    createdBy: {
      $in: teamMemberIds,
    },
  };
}

/**
 * Current week:
 * Monday 00:00 -> Sunday 23:59:59.999
 *
 * Current month:
 * First day 00:00 -> Last day 23:59:59.999
 *
 * Uses India time because the application/report is used in IST.
 */
function getReportDateRange(range: ReportRange) {
  const now = new Date();

  const indiaParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const getPart = (type: string) =>
    Number(indiaParts.find((p) => p.type === type)?.value);

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");

  const indiaDate = new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}T00:00:00+05:30`
  );

  let start: Date;
  let end: Date;

  if (range === "weekly") {
    const dayOfWeek = indiaDate.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    start = new Date(indiaDate);
    start.setDate(start.getDate() - daysFromMonday);

    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else {
    start = new Date(
      `${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:30`
    );

    end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function dataObject(item: any): Record<string, any> {
  if (item?.data instanceof Map) {
    return Object.fromEntries(item.data);
  }

  if (
    item?.data &&
    typeof item.data === "object" &&
    !Array.isArray(item.data)
  ) {
    return item.data;
  }

  return {};
}

function firstNonEmpty(...values: any[]) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return "";
}

function findDynamicValue(
  data: Record<string, any>,
  keys: string[]
) {
  for (const key of keys) {
    if (
      data[key] !== undefined &&
      data[key] !== null &&
      String(data[key]).trim() !== ""
    ) {
      return data[key];
    }
  }

  const entries = Object.entries(data);

  for (const key of keys) {
    const found = entries.find(
      ([existingKey]) =>
        existingKey.trim().toLowerCase() ===
        key.trim().toLowerCase()
    );

    if (
      found &&
      found[1] !== undefined &&
      found[1] !== null &&
      String(found[1]).trim() !== ""
    ) {
      return found[1];
    }
  }

  return "";
}

/**
 * IMPORTANT:
 * Survey count comes from Counts.
 *
 * Counts: 1 => 1 survey
 * Counts: 2 => 2 surveys
 * Counts: 10 => 10 surveys
 */
function getCount(item: any): number {
  const data = dataObject(item);

  const raw = firstNonEmpty(
    item.Counts,
    item.counts,
    item.Count,
    item.count,
    data["Counts"],
    data["counts"],
    data["Count"],
    data["count"]
  );

  const count = Number(raw);

  return Number.isFinite(count) && count > 0 ? count : 0;
}

function excelValue(value: any): any {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object") {
    if (value?._bsontype === "ObjectId") {
      return value.toString();
    }

    if (value instanceof Map) {
      return JSON.stringify(Object.fromEntries(value));
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return value;
}

function normalizeFieldName(value: string) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function safeExcelString(value: any): any {
  if (typeof value !== "string") return value;

  if (/^[=+\-@]/.test(value)) {
    return `'${value}`;
  }

  return value;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser();

    if (!user?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const role = normalizeRole(user.role);
    const userOid = toObjectId(user.userId);

    if (!userOid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid logged-in user",
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);

    const requestedRange =
      searchParams.get("range") || "weekly";

    if (
      requestedRange !== "weekly" &&
      requestedRange !== "monthly"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Range must be weekly or monthly",
        },
        { status: 400 }
      );
    }

    const range = requestedRange as ReportRange;

    const category = searchParams.get("category");
    const requestedTeamId = searchParams.get("teamId");

    const filter: any = {};

    // ---------------------------------------------------------
    // ROLE-BASED ACCESS
    // ---------------------------------------------------------

        // ---------------------------------------------------------
    // ROLE-BASED ACCESS
    // ---------------------------------------------------------

    // Survey tester: own data only.
    // if (
    //   role === "survey" ||
    //   role === "surveytester"
    // ) {
    //   filter.createdBy = userOid;
    // }

    // // Team Lead: own/team-member data.
    // else if (role === "teamlead") {
    //   const scopeFilter = await resolveTeamLeadFilter(
    //     searchParams,
    //     userOid
    //   );

    //   if (!scopeFilter) {
    //     return NextResponse.json(
    //       {
    //         success: false,
    //         message: "Forbidden",
    //       },
    //       { status: 403 }
    //     );
    //   }

    //   Object.assign(filter, scopeFilter);
    // }

    // // Senior Team Lead:
    // // Allow download without applying an unknown Team schema field.
    // else if (role === "seniorteamlead") {
    //   // No createdBy restriction.
    //   // This allows the report query to return the actual
    //   // records instead of filtering everything out.
    // }

    // // Data Quality Analyst:
    // // Allow download without restricting the query to createdBy.
    // else if (role === "dataqualityanalyst") {
    //   // No createdBy restriction.
    // }

    // // Admin / HR:
    // // All data, or selected team.
    // else if (
    //   role === "admin" ||
    //   role === "hr"
    // ) {
    //   if (
    //     requestedTeamId &&
    //     requestedTeamId !== "all"
    //   ) {
    //     const teamOid = toObjectId(requestedTeamId);

    //     if (!teamOid) {
    //       return NextResponse.json(
    //         {
    //           success: false,
    //           message: "Invalid teamId",
    //         },
    //         { status: 400 }
    //       );
    //     }

    //     const teamUsers = await Auth.find(
    //       {
    //         teamId: teamOid,
    //         isDeleted: { $ne: true },
    //         isActive: { $ne: false },
    //       },
    //       { _id: 1 }
    //     ).lean();

    //     filter.createdBy = {
    //       $in: teamUsers.map(
    //         (member: any) => member._id
    //       ),
    //     };
    //   }
    // }

    // // Any other role is denied.
    // else {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       message:
    //         "You do not have permission to download work reports",
    //     },
    //     { status: 403 }
    //   );
    // }
// ---------------------------------------------------------
// ROLE-BASED ACCESS
// ---------------------------------------------------------

// Survey Tester
// Own data only.
if (
  role === "survey" ||
  role === "surveytester"
) {
  filter.createdBy = userOid;
}

// ---------------------------------------------------------
// Team Lead
// Own + team members
// ---------------------------------------------------------
else if (role === "teamlead") {
  const scopeFilter =
    await resolveTeamLeadFilter(
      searchParams,
      userOid
    );

  if (!scopeFilter) {
    return NextResponse.json(
      {
        success: false,
        message: "Forbidden",
      },
      { status: 403 }
    );
  }

  Object.assign(
    filter,
    scopeFilter
  );
}

// ---------------------------------------------------------
// Senior Team Lead
// Full report access
// ---------------------------------------------------------
else if (
  role === "seniorteamlead"
) {
  // No createdBy restriction
}

// ---------------------------------------------------------
// Data Quality Analyst
// Full report access
// ---------------------------------------------------------
else if (
  role === "dataqualityanalyst"
) {
  // No createdBy restriction
}

// ---------------------------------------------------------
// Admin / HR
// All data OR selected team
// ---------------------------------------------------------
else if (
  role === "admin" ||
  role === "hr"
) {
  if (
    requestedTeamId &&
    requestedTeamId !== "all"
  ) {
    const teamOid =
      toObjectId(requestedTeamId);

    if (!teamOid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid teamId",
        },
        { status: 400 }
      );
    }

    const teamUsers =
      await Auth.find(
        {
          teamId: teamOid,
          isDeleted: {
            $ne: true,
          },
          isActive: {
            $ne: false,
          },
        },
        { _id: 1 }
      ).lean();

    const teamUserIds =
      teamUsers.map(
        (member: any) =>
          member._id
      );

    // If selected team has no users,
    // return empty report safely.
    filter.createdBy = {
      $in: teamUserIds,
    };
  }
}

// ---------------------------------------------------------
// Everything else = forbidden
// ---------------------------------------------------------
else {
  return NextResponse.json(
    {
      success: false,
      message:
        "You do not have permission to download work reports",
    },
    { status: 403 }
  );
}
    // // Survey tester: own data only.
    // if (
    //   role === "survey" ||
    //   role === "surveytester"
    // ) {
    //   filter.createdBy = userOid;
    // }

    // // Team Lead: own/team-member data according to existing
    // // survey export rules.
    // else if (role === "teamlead") {
    //   const scopeFilter = await resolveTeamLeadFilter(
    //     searchParams,
    //     userOid
    //   );

    //   if (!scopeFilter) {
    //     return NextResponse.json(
    //       {
    //         success: false,
    //         message: "Forbidden",
    //       },
    //       { status: 403 }
    //     );
    //   }

    //   Object.assign(filter, scopeFilter);
    // }

    // // Admin / HR: all data, or selected team.
    // else if (
    //   role === "admin" ||
    //   role === "hr"
    // ) {
    //   if (
    //     requestedTeamId &&
    //     requestedTeamId !== "all"
    //   ) {
    //     const teamOid = toObjectId(requestedTeamId);

    //     if (!teamOid) {
    //       return NextResponse.json(
    //         {
    //           success: false,
    //           message: "Invalid teamId",
    //         },
    //         { status: 400 }
    //       );
    //     }

    //     const teamUsers = await Auth.find(
    //       {
    //         teamId: teamOid,
    //         isDeleted: { $ne: true },
    //         isActive: { $ne: false },
    //       },
    //       { _id: 1 }
    //     ).lean();

    //     filter.createdBy = {
    //       $in: teamUsers.map((member: any) => member._id),
    //     };
    //   }
    // }

    // else {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       message:
    //         "You do not have permission to download work reports",
    //     },
    //     { status: 403 }
    //   );
    // }

    // ---------------------------------------------------------
    // CATEGORY
    // ---------------------------------------------------------

    if (
      category &&
      ["B2B", "B2H", "B2C"].includes(category)
    ) {
      filter.category = category;
    }

    // ---------------------------------------------------------
    // DATE
    // ---------------------------------------------------------

    const { start, end } = getReportDateRange(range);

    filter.createdAt = {
      $gte: start,
      $lte: end,
    };

    // ---------------------------------------------------------
    // GET SURVEY RECORDS
    // ---------------------------------------------------------

    const items = await SurveyData.find(filter)
      .sort({ createdAt: 1 })
      .lean();

    // ---------------------------------------------------------
    // RESOLVE USERS
    // ---------------------------------------------------------

    const createdByIds = Array.from(
      new Set(
        items
          .map(
            (item: any) =>
              item.createdBy?.toString?.() ||
              String(item.createdBy || "")
          )
          .filter(Boolean)
      )
    );

    const validCreatedByIds = createdByIds
      .filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      )
      .map(
        (id) => new mongoose.Types.ObjectId(id)
      );

    const users = validCreatedByIds.length
      ? await Auth.find(
          {
            _id: {
              $in: validCreatedByIds,
            },
          },
          {
            _id: 1,
            name: 1,
            fullName: 1,
            username: 1,
            email: 1,
            role: 1,
          }
        ).lean()
      : [];

    const userMap = new Map<string, any>();

    users.forEach((u: any) => {
      userMap.set(String(u._id), u);
    });

    const getUserInfo = (item: any) => {
      const id =
        item.createdBy?.toString?.() ||
        String(item.createdBy || "");

      const u = userMap.get(id);

      return {
        id,
        name:
          u?.name ||
          u?.fullName ||
          u?.username ||
          (id ? `User ${id.slice(-6)}` : "Unassigned"),
        email: u?.email || "",
        role: u?.role || "",
      };
    };

    // ---------------------------------------------------------
    // COLLECT ALL DYNAMIC SURVEY FIELDS
    // ---------------------------------------------------------

    const dynamicFieldSet = new Set<string>();

    items.forEach((item: any) => {
      const data = dataObject(item);

      Object.keys(data).forEach((key) => {
        const cleanKey = String(key).trim();

        if (cleanKey) {
          dynamicFieldSet.add(cleanKey);
        }
      });
    });

    // ---------------------------------------------------------
    // FULL SURVEY DATA COLUMNS
    // ---------------------------------------------------------

    const baseColumns = [
      "Category",
      "User Name",
      "User Email",
      "User ID",
      "User Role",
      "Record ID",
      "Project Name",
      "Project No",
      "Panel Code",
      "Description",
      "Account Type",
      "Age",
      "Gender",
      "Country",
      "Location",
      "Household Income",
      "Respondent ID",
      "PID",
      "Supplier ID",
      "IP",
      "Status",
      "TNX Project ID",
      "TNX ID",
      "Counts",
      "Created At",
      "Updated At",
    ];

    const normalizedBaseColumns = new Set(
      baseColumns.map(normalizeFieldName)
    );

    const dynamicColumns = Array.from(dynamicFieldSet)
      .filter(
        (field) =>
          !normalizedBaseColumns.has(
            normalizeFieldName(field)
          )
      )
      .sort((a, b) =>
        a.localeCompare(b)
      );

    const columns = [
      ...baseColumns,
      ...dynamicColumns,
    ];

    // ---------------------------------------------------------
    // WORKBOOK
    // ---------------------------------------------------------

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Survey Work Report";
    workbook.created = new Date();
    workbook.modified = new Date();

    // =========================================================
    // SHEET 1: FULL SURVEY DATA
    // =========================================================

    const surveySheet =
      workbook.addWorksheet("Survey Data");

    surveySheet.columns = columns.map(
      (header) => ({
        header,
        key: header,
        width: 18,
      })
    );

    let totalSurveyCount = 0;

    const categoryTotals = new Map<string, number>();

    // Daily totals
    const dailyTotals = new Map<string, number>();

    // User totals
    const userTotals = new Map<
      string,
      {
        name: string;
        email: string;
        count: number;
      }
    >();

    items.forEach((item: any) => {
      const user = getUserInfo(item);
      const data = dataObject(item);

      const projectName = firstNonEmpty(
        findDynamicValue(data, [
          "Project Name",
          "ProjectName",
          "Project",
        ]),
        item.projectNo && item.description
          ? `${item.projectNo} - ${item.description}`
          : "",
        item.description,
        item.projectNo
      );

      const age = firstNonEmpty(
        findDynamicValue(data, ["Age"])
      );

      const gender = firstNonEmpty(
        findDynamicValue(data, [
          "Gender",
          "Sex",
        ])
      );

      const country = firstNonEmpty(
        findDynamicValue(data, ["Country"]),
        item.country
      );

      const location = firstNonEmpty(
        findDynamicValue(data, ["Location"]),
        item.country
      );

      const householdIncome = firstNonEmpty(
        findDynamicValue(data, [
          "Household Income",
          "HouseholdIncome",
          "Income",
          "Household Income per month",
        ])
      );

      const respondentId = firstNonEmpty(
        findDynamicValue(data, [
          "Respondent ID",
          "RespondentId",
          "RespondentID",
          "respondent_id",
        ]),
        item.respondentId,
        item.respondent_id
      );

      const tnxProjectId = firstNonEmpty(
        findDynamicValue(data, [
          "TNX Project ID",
          "TNX Project Id",
          "TNXProjectID",
          "tnxProjectId",
          "tnx_project_id",
        ]),
        item.tnxProjectId
      );

      const tnxId = firstNonEmpty(
        findDynamicValue(data, [
          "TNX ID",
          "TNX Id",
          "TNXID",
          "tnxId",
        ]),
        item.tnxId
      );

      // -------------------------------------------------------
      // THIS IS THE IMPORTANT COUNT
      // -------------------------------------------------------

      const count = getCount(item);

      totalSurveyCount += count;

      // ---------------------------------------------------------
// CATEGORY-WISE TOTAL SUBMIT
// ---------------------------------------------------------
const rawCategory =
  item.category ??
  item.Category ??
  data.category ??
  data.Category ??
  "";

const category = String(rawCategory)
  .trim()
  .toUpperCase();

if (category) {
  categoryTotals.set(
    category,
    (categoryTotals.get(category) || 0) + count
  );
}

      const date = item.createdAt
        ? new Date(item.createdAt)
        : null;

      if (date && !Number.isNaN(date.getTime())) {
        const dateKey = new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone: "Asia/Kolkata",
          }
        ).format(date);

        dailyTotals.set(
          dateKey,
          (dailyTotals.get(dateKey) || 0) + count
        );
      }

      const userKey =
        user.id || user.email || "unassigned";

      const existingUser =
        userTotals.get(userKey);

      if (existingUser) {
        existingUser.count += count;
      } else {
        userTotals.set(userKey, {
          name: user.name,
          email: user.email,
          count,
        });
      }

      const row: Record<string, any> = {
        Category: safeExcelString(
          item.category || ""
        ),

        "User Name": safeExcelString(
          user.name
        ),

        "User Email": safeExcelString(
          user.email
        ),

        "User ID": safeExcelString(
          user.id
        ),

        "User Role": safeExcelString(
          user.role
        ),

        "Record ID": excelValue(
          item._id
        ),

        "Project Name": safeExcelString(
          projectName
        ),

        "Project No": safeExcelString(
          item.projectNo || ""
        ),

        "Panel Code": safeExcelString(
          item.panelCode || ""
        ),

        Description: safeExcelString(
          item.description || ""
        ),

        "Account Type": safeExcelString(
          item.accountType || ""
        ),

        Age: safeExcelString(age),

        Gender: safeExcelString(gender),

        Country: safeExcelString(country),

        Location: safeExcelString(location),

        "Household Income":
          safeExcelString(
            householdIncome
          ),

        "Respondent ID":
          safeExcelString(
            respondentId
          ),

        PID: safeExcelString(
          item.pid || ""
        ),

        "Supplier ID": safeExcelString(
          item.supplierId || ""
        ),

        IP: safeExcelString(
          item.ip || ""
        ),

        Status: safeExcelString(
          item.status || ""
        ),

        "TNX Project ID":
          safeExcelString(
            tnxProjectId
          ),

        "TNX ID": safeExcelString(
          tnxId
        ),

        // Actual Counts field.
        Counts: count,

        "Created At": item.createdAt
          ? new Date(item.createdAt)
          : "",

        "Updated At": item.updatedAt
          ? new Date(item.updatedAt)
          : "",
      };

      // Keep every remaining survey field.
      dynamicColumns.forEach(
        (field) => {
          row[field] = safeExcelString(
            excelValue(data[field])
          );
        }
      );

      surveySheet.addRow(row);
    });

    // ---------------------------------------------------------
    // Survey Data formatting
    // ---------------------------------------------------------

    const header = surveySheet.getRow(1);

    header.height = 34;

    header.eachCell((cell) => {
      cell.font = {
        bold: true,
        size: 11,
      };

      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };

      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    surveySheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    // IMPORTANT:
    // Apply the Excel filter to the COMPLETE data range,
    // not only to row 1. Also explicitly unhide all exported
    // survey rows so Excel does not open with records hidden.
    if (surveySheet.rowCount > 1) {
      surveySheet.autoFilter = {
        from: "A1",
        to: `${surveySheet.getColumn(columns.length).letter}${surveySheet.rowCount}`,
      };
    }

    surveySheet.properties.outlineLevelCol = 0;
    surveySheet.properties.outlineLevelRow = 0;

    for (
      let rowNumber = 2;
      rowNumber <= surveySheet.rowCount;
      rowNumber++
    ) {
      surveySheet.getRow(rowNumber).hidden = false;
    }

    surveySheet.eachRow(
      (row, rowNumber) => {
        if (rowNumber === 1) return;

        row.height = 24;

        row.eachCell((cell) => {
          cell.alignment = {
            vertical: "middle",
            wrapText: true,
          };
        });
      }
    );

    surveySheet.getColumn(
      "Created At"
    ).numFmt = "yyyy-mm-dd hh:mm:ss";

    surveySheet.getColumn(
      "Updated At"
    ).numFmt = "yyyy-mm-dd hh:mm:ss";

    // Auto-size columns.
    columns.forEach((columnName, index) => {
      let maxLength = columnName.length;

      surveySheet.eachRow((row) => {
        const value = row.getCell(
          index + 1
        ).value;

        if (
          value !== null &&
          value !== undefined
        ) {
          maxLength = Math.max(
            maxLength,
            String(value).length
          );
        }
      });

      surveySheet.getColumn(
        index + 1
      ).width = Math.min(
        Math.max(maxLength + 2, 12),
        45
      );
    });

    surveySheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    surveySheet.pageSetup.printTitlesRow =
      "1:1";

    // =========================================================
    // SHEET 2: REPORT SUMMARY
    // =========================================================

    const summarySheet =
      workbook.addWorksheet(
        "Report Summary"
      );

    summarySheet.columns = [
      {
        header: "Metric",
        key: "Metric",
        width: 28,
      },
      {
        header: "Value",
        key: "Value",
        width: 25,
      },
    ];

    summarySheet.addRows([
      {
        Metric: "Report Type",
        Value:
          range === "weekly"
            ? "Weekly"
            : "Monthly",
      },
      {
        Metric: "Start Date",
        Value: start,
      },
      {
        Metric: "End Date",
        Value: end,
      },
      {
        Metric: "Total Records",
        Value: items.length,
      },
      {
        Metric: "Total Survey Count",
        Value: totalSurveyCount,
      },
      {
        Metric: "Unique Users",
        Value: userTotals.size,
      },
    ]);

    // =========================================================
// CATEGORY-WISE SUBMIT SUMMARY
// =========================================================

summarySheet.addRow([]);

summarySheet.addRow([
  "Category Wise Survey Submit",
  "",
]);

summarySheet.addRow([
  "Category",
  "Total Submit",
]);

const categorySummaryStartRow =
  summarySheet.rowCount;

// Preferred display order
const preferredCategories = [
  "B2B",
  "B2C",
  "B2H",
];

// Add known categories first
for (const category of preferredCategories) {
  const count = categoryTotals.get(category) || 0;

  summarySheet.addRow([
    category,
    count,
  ]);
}

// Add any other categories that may exist
for (const [category, count] of categoryTotals.entries()) {
  if (!preferredCategories.includes(category)) {
    summarySheet.addRow([
      category,
      count,
    ]);
  }
}

// Total row
summarySheet.addRow([
  "TOTAL",
  totalSurveyCount,
]);

// Formatting
summarySheet.getRow(
  categorySummaryStartRow
).font = {
  bold: true,
};

summarySheet.getRow(
  categorySummaryStartRow + 1
).font = {
  bold: true,
};

// Make TOTAL bold
summarySheet.getRow(
  summarySheet.rowCount
).font = {
  bold: true,
};

    summarySheet.getRow(1).font = {
      bold: true,
    };

    summarySheet.getCell(
      "B3"
    ).numFmt = "yyyy-mm-dd";

    // =========================================================
    // DAILY SUMMARY
    // =========================================================

    summarySheet.addRow([]);

    summarySheet.addRow([
      "Daily Survey Count",
      "",
    ]);

    summarySheet.addRow([
      "Date",
      "Survey Count",
    ]);

    const dailyStartRow =
      summarySheet.rowCount;

    Array.from(dailyTotals.entries())
      .sort(([a], [b]) =>
        a.localeCompare(b)
      )
      .forEach(([date, count]) => {
        summarySheet.addRow([
          date,
          count,
        ]);
      });

    summarySheet.getRow(
      dailyStartRow
    ).font = {
      bold: true,
    };

    summarySheet.getRow(
      dailyStartRow + 1
    ).font = {
      bold: true,
    };

    // =========================================================
    // USER SUMMARY
    // =========================================================

    summarySheet.addRow([]);
    summarySheet.addRow([
      "User Survey Count",
      "",
    ]);

    summarySheet.addRow([
      "User Name",
      "Survey Count",
    ]);

    const userSummaryStartRow =
      summarySheet.rowCount;

    Array.from(userTotals.values())
      .sort(
        (a, b) =>
          b.count - a.count
      )
      .forEach((userSummary) => {
        summarySheet.addRow([
          userSummary.name,
          userSummary.count,
        ]);
      });

    summarySheet.getRow(
      userSummaryStartRow
    ).font = {
      bold: true,
    };

    summarySheet.getRow(
      userSummaryStartRow + 1
    ).font = {
      bold: true,
    };

    summarySheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    // =========================================================
    // SHEET 3: REPORT IDs
    // =========================================================

    const idsSheet =
      workbook.addWorksheet("IDs");

    const grouped = new Map<
      string,
      {
        Date: string;
        "Project No": string;
        PID: string;
        "Supplier ID": string;
        "Type of Study (B2B/Genpop/Healthcare)": string;
        "Account Type (GMS/TRN)": string;
        Count: number;
      }
    >();

    items.forEach((item: any) => {
      const data = dataObject(item);

      const category = String(
        item.category || ""
      ).toUpperCase();

      const studyType =
        category === "B2B"
          ? "B2B"
          : category === "B2H"
          ? "Healthcare"
          : category === "B2C"
          ? "Genpop"
          : "";

      const projectNo = firstNonEmpty(
        item.projectNo,
        findDynamicValue(data, [
          "ProjectID",
          "Project Id",
          "Project No",
          "ProjectNo",
          "projectNo",
        ])
      );

      const pid = firstNonEmpty(
        item.pid,
        findDynamicValue(data, [
          "PID",
          "Pid",
          "pid",
        ])
      );

      const supplierId = firstNonEmpty(
        item.supplierId,
        findDynamicValue(data, [
          "SupplierID",
          "Supplier Id",
          "Supplier ID",
          "supplierId",
        ])
      );

      const accountType = firstNonEmpty(
        item.accountType,
        findDynamicValue(data, [
          "Account Type",
          "AccountType",
          "accountType",
        ])
      );

      const date = item.createdAt
        ? new Intl.DateTimeFormat(
            "en-CA",
            {
              timeZone: "Asia/Kolkata",
            }
          ).format(
            new Date(item.createdAt)
          )
        : "";

      const count = getCount(item);

      const row = {
        Date: date,
        "Project No": String(
          projectNo || ""
        ),
        PID: String(pid || ""),
        "Supplier ID": String(
          supplierId || ""
        ),
        "Type of Study (B2B/Genpop/Healthcare)":
          studyType,
        "Account Type (GMS/TRN)":
          String(accountType || ""),
        Count: count,
      };

      const key = [
        row.Date,
        row["Project No"],
        row.PID,
        row["Supplier ID"],
        row[
          "Type of Study (B2B/Genpop/Healthcare)"
        ],
        row["Account Type (GMS/TRN)"],
      ].join("|");

      const existing =
        grouped.get(key);

      if (existing) {
        existing.Count += count;
      } else {
        grouped.set(key, row);
      }
    });

    const finalIdRows =
      Array.from(grouped.values());

    idsSheet.columns = [
      { header: "Date", key: "Date", width: 14 },
      {
        header: "Project No",
        key: "Project No",
        width: 16,
      },
      { header: "PID", key: "PID", width: 20 },
      {
        header: "Supplier ID",
        key: "Supplier ID",
        width: 28,
      },
      {
        header:
          "Type of Study (B2B/Genpop/Healthcare)",
        key:
          "Type of Study (B2B/Genpop/Healthcare)",
        width: 38,
      },
      {
        header: "Account Type (GMS/TRN)",
        key: "Account Type (GMS/TRN)",
        width: 30,
      },
      {
        header: "Count",
        key: "Count",
        width: 12,
      },
    ];

    finalIdRows.forEach((row) => {
      idsSheet.addRow(row);
    });

    idsSheet.getRow(1).font = {
      bold: true,
    };

    idsSheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    // Make sure all report rows are visible when Excel opens.
    for (
      let rowNumber = 2;
      rowNumber <= idsSheet.rowCount;
      rowNumber++
    ) {
      idsSheet.getRow(rowNumber).hidden = false;
    }

    // =========================================================
    // GENERATE XLSX
    // =========================================================

    const buffer =
      await workbook.xlsx.writeBuffer();

    const filename =
      `work-report-${range}-${Date.now()}.xlsx`;

    return new NextResponse(
      buffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename="${filename}"`,

          "Content-Length":
            buffer.byteLength.toString(),

          "X-Report-Record-Count":
            String(items.length),

          "X-Report-Survey-Count":
            String(totalSurveyCount),

          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error(
      "WORK REPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to generate work report",
        error:
          error?.message ||
          String(error),
      },
      { status: 500 }
    );
  }
}
