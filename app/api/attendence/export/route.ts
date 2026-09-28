// import { NextRequest, NextResponse } from "next/server";
// import mongoose from "mongoose";
// import ExcelJS from "exceljs";
// import { format } from "date-fns";

// import { connectDB } from "@/config/db";
// import Attendance from "@/models/Attendance";
// import Auth from "@/models/Auth";
// import Team from "@/models/Team";
// import { getCurrentUser } from "@/lib/getuser";
// import { createAuditLog } from "@/lib/auditLog";
// import { formatLateTime } from "@/lib/shiftValidation";

// function normalizeRole(role: unknown) {
//   return String(role || "")
//     .toLowerCase()
//     .replace(/[-_\s]/g, "");
// }

// function toObjectId(value: unknown) {
//   if (!value) return null;

//   if (value instanceof mongoose.Types.ObjectId) {
//     return value;
//   }

//   if (mongoose.Types.ObjectId.isValid(String(value))) {
//     return new mongoose.Types.ObjectId(String(value));
//   }

//   return null;
// }

// /**
//  * Creates a valid and unique Excel worksheet name.
//  *
//  * Excel rules:
//  * - Maximum 31 characters
//  * - Cannot contain: \ / * ? : [ ]
//  * - Cannot be blank
//  * - Sheet names are case-insensitive
//  */
// function getSafeSheetName(
//   used: Set<string>,
//   rawName: string
// ): string {
//   let base = String(rawName || "Unknown")
//     .replace(/[\\/*?:[\]]/g, "")
//     .trim();

//   if (!base) {
//     base = "Unknown";
//   }

//   // Excel worksheet name max length = 31
//   base = base.slice(0, 31);

//   const normalize = (name: string) =>
//     name.toLowerCase();

//   // First attempt
//   if (!used.has(normalize(base))) {
//     used.add(normalize(base));
//     return base;
//   }

//   // Duplicate name
//   // Example:
//   // Jasmeet
//   // Jasmeet_1
//   // Jasmeet_2
//   // Jasmeet_3
//   for (let i = 1; i < 100000; i++) {
//     const suffix = `_${i}`;
//     const maxBaseLength = 31 - suffix.length;

//     const candidate =
//       `${base.slice(0, maxBaseLength)}${suffix}`;

//     if (!used.has(normalize(candidate))) {
//       used.add(normalize(candidate));
//       return candidate;
//     }
//   }

//   // Extremely unlikely fallback
//   const fallback =
//     `Sheet_${Date.now()}`.slice(0, 31);

//   used.add(normalize(fallback));

//   return fallback;
// }

// export async function GET(req: NextRequest) {
//   try {
//     console.log("========================================");
//     console.log("[EXPORT] ATTENDANCE EXPORT START");
//     console.log("[EXPORT] Timestamp:", new Date().toISOString());
//     console.log("========================================");

//     // ============================================================
//     // DATABASE
//     // ============================================================
//     await connectDB();

//     // ============================================================
//     // CURRENT USER
//     // ============================================================
//     const currentUser = await getCurrentUser();

//     if (!currentUser?.userId) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Unauthorized",
//         },
//         { status: 401 }
//       );
//     }

//     const role = normalizeRole(
//       currentUser.role
//     );

//     const userOid = toObjectId(
//       currentUser.userId
//     );

//     if (!userOid) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Invalid user session",
//         },
//         { status: 400 }
//       );
//     }

//     // ============================================================
//     // QUERY PARAMETERS
//     // ============================================================
//     const { searchParams } =
//       new URL(req.url);

//     const from =
//       searchParams.get("from") ||
//       searchParams.get("startDate");

//     const to =
//       searchParams.get("to") ||
//       searchParams.get("endDate");

//     const requestedUserId =
//       searchParams.get("userId");

//     const requestedTeamId =
//       searchParams.get("teamId");

//     const query: any = {};

//     // ============================================================
//     // ROLE-BASED SCOPING
//     // ============================================================

//     // ------------------------------------------------------------
//     // ADMIN / HR
//     // ------------------------------------------------------------
//     if (
//       role === "admin" ||
//       role === "hr"
//     ) {
//       // Specific user selected
//       if (requestedUserId) {
//         const requestedUserOid =
//           toObjectId(requestedUserId);

//         if (!requestedUserOid) {
//           return NextResponse.json(
//             {
//               success: false,
//               message: "Invalid user ID",
//             },
//             { status: 400 }
//           );
//         }

//         query.userId =
//           requestedUserOid;
//       }

//       // Specific team selected
//       else if (
//         requestedTeamId &&
//         requestedTeamId !== "all"
//       ) {
//         const teamOid =
//           toObjectId(requestedTeamId);

//         if (!teamOid) {
//           return NextResponse.json(
//             {
//               success: false,
//               message: "Invalid team ID",
//             },
//             { status: 400 }
//           );
//         }

//         const teamUsers =
//           await Auth.find(
//             {
//               teamId: teamOid,
//               isDeleted: {
//                 $ne: true,
//               },
//             },
//             {
//               _id: 1,
//             }
//           ).lean();

//         query.userId = {
//           $in: teamUsers.map(
//             (u) => u._id
//           ),
//         };
//       }

//       // No user/team selected
//       // => ALL USERS
//     }

//     // ------------------------------------------------------------
//     // TEAM LEAD
//     // ------------------------------------------------------------
//     else if (role === "teamlead") {
//       const teams =
//         await Team.find({
//           teamLead: userOid,
//           isActive: true,
//         })
//           .select("members")
//           .lean();

//       const memberIds =
//         Array.from(
//           new Set(
//             teams.flatMap(
//               (team: any) =>
//                 (team.members || []).map(
//                   (member: any) =>
//                     String(member)
//                 )
//             )
//           )
//         );

//       // Always include Team Lead
//       if (
//         !memberIds.includes(
//           String(userOid)
//         )
//       ) {
//         memberIds.push(
//           String(userOid)
//         );
//       }

//       // Specific user selected
//       if (requestedUserId) {
//         if (
//           !memberIds.includes(
//             requestedUserId
//           )
//         ) {
//           return NextResponse.json(
//             {
//               success: false,
//               message:
//                 "Cannot export data outside your team",
//             },
//             { status: 403 }
//           );
//         }

//         const requestedUserOid =
//           toObjectId(
//             requestedUserId
//           );

//         if (!requestedUserOid) {
//           return NextResponse.json(
//             {
//               success: false,
//               message: "Invalid user ID",
//             },
//             { status: 400 }
//           );
//         }

//         query.userId =
//           requestedUserOid;
//       }

//       // All team members
//       else {
//         query.userId = {
//           $in: memberIds.map(
//             (id) =>
//               new mongoose.Types.ObjectId(
//                 id
//               )
//           ),
//         };
//       }
//     }

//     // ------------------------------------------------------------
//     // NORMAL EMPLOYEE
//     // ------------------------------------------------------------
//     else {
//       query.userId = userOid;
//     }

//     // ============================================================
//     // DATE FILTER
//     // ============================================================
//     if (from || to) {
//       query.date = {};

//       if (from) {
//         query.date.$gte = new Date(
//           from.includes("T")
//             ? from
//             : `${from}T00:00:00+05:30`
//         );
//       }

//       if (to) {
//         query.date.$lte = new Date(
//           to.includes("T")
//             ? to
//             : `${to}T23:59:59.999+05:30`
//         );
//       }
//     }

//     console.log(
//       "[EXPORT] MongoDB query:",
//       JSON.stringify(query)
//     );

//     // ============================================================
//     // FETCH ATTENDANCE
//     // ============================================================
//     const records =
//       await Attendance.find(query)
//         .populate(
//           "userId",
//           "name email role workingShift"
//         )
//         .populate(
//           "updatedBy",
//           "name email"
//         )
//         .sort({
//           date: -1,
//         })
//         .lean();

//     console.log(
//       `[EXPORT] Fetched ${records.length} attendance records`
//     );

//     // ============================================================
//     // CREATE WORKBOOK
//     // ============================================================
//     const workbook =
//       new ExcelJS.Workbook();

//     workbook.creator =
//       "TronX CRM";

//     workbook.created =
//       new Date();

//     // ============================================================
//     // GROUP RECORDS BY USER
//     // ============================================================
//     const recordsByUser =
//       new Map<
//         string,
//         {
//           user: any;
//           records: any[];
//         }
//       >();

//     for (const record of records) {
//       const user =
//         record.userId;

//       if (
//         !user ||
//         !user._id
//       ) {
//         console.warn(
//           "[EXPORT] Skipping record without populated user:",
//           record._id
//         );

//         continue;
//       }

//       const userId =
//         String(user._id);

//       if (
//         !recordsByUser.has(
//           userId
//         )
//       ) {
//         recordsByUser.set(
//           userId,
//           {
//             user,
//             records: [],
//           }
//         );
//       }

//       recordsByUser
//         .get(userId)!
//         .records.push(record);
//     }

//     console.log(
//       `[EXPORT] Unique users: ${recordsByUser.size}`
//     );

//     // ============================================================
//     // CREATE ONE WORKSHEET PER USER
//     // ============================================================
//     const usedSheetNames =
//       new Set<string>();

//     for (
//       const [
//         userId,
//         userData,
//       ] of recordsByUser.entries()
//     ) {
//       const user =
//         userData.user;

//       const userRecords =
//         userData.records;

//       const userName =
//         user?.name ||
//         "Unknown User";

//       // Make sure worksheet name
//       // is valid + unique
//       const sheetName =
//         getSafeSheetName(
//           usedSheetNames,
//           userName
//         );

//       console.log(
//         `[EXPORT] User: ${userName} | ID: ${userId} | Records: ${userRecords.length} | Sheet: ${sheetName}`
//       );

//       const worksheet =
//         workbook.addWorksheet(
//           sheetName
//         );

//       // ========================================================
//       // COLUMNS
//       // ========================================================
//       worksheet.columns = [
//         {
//           header: "Date",
//           key: "date",
//           width: 15,
//         },
//         {
//           header: "Status",
//           key: "status",
//           width: 12,
//         },
//         {
//           header: "Login Time",
//           key: "loggingTime",
//           width: 15,
//         },
//         {
//           header: "Logout Time",
//           key: "logoutTime",
//           width: 15,
//         },
//         {
//           header: "Late Status",
//           key: "isLate",
//           width: 14,
//         },
//         {
//           header: "Late By",
//           key: "lateBy",
//           width: 14,
//         },
//         {
//           header: "Lunch Start",
//           key: "lunchStart",
//           width: 15,
//         },
//         {
//           header: "Lunch End",
//           key: "lunchEnd",
//           width: 15,
//         },
//         {
//           header: "Lunch Duration",
//           key: "lunchDuration",
//           width: 17,
//         },
//         {
//           header: "Excess Lunch",
//           key: "excessLunch",
//           width: 15,
//         },
//         {
//           header: "Remarks",
//           key: "remarks",
//           width: 30,
//         },
//         {
//           header: "Location Address",
//           key: "location",
//           width: 40,
//         },
//       ];

//       // ========================================================
//       // HEADER STYLE
//       // ========================================================
//       const headerRow =
//         worksheet.getRow(1);

//       headerRow.font = {
//         bold: true,
//         color: {
//           argb: "FFFFFF",
//         },
//       };

//       headerRow.fill = {
//         type: "pattern",
//         pattern: "solid",
//         fgColor: {
//           argb: "1E293B",
//         },
//       };

//       headerRow.alignment = {
//         vertical: "middle",
//         horizontal: "center",
//       };

//       headerRow.height = 24;

//       // ========================================================
//       // ADD USER ATTENDANCE
//       // ========================================================
//       for (
//         const r of userRecords
//       ) {
//         worksheet.addRow({
//           date: r.date
//             ? format(
//                 new Date(r.date),
//                 "dd MMM yyyy"
//               )
//             : "-",

//           status:
//             String(
//               r.status ||
//                 "present"
//             ).toUpperCase(),

//           loggingTime:
//             r.loggingTime
//               ? format(
//                   new Date(
//                     r.loggingTime
//                   ),
//                   "hh:mm a"
//                 )
//               : "-",

//           logoutTime:
//             r.logoutTime
//               ? format(
//                   new Date(
//                     r.logoutTime
//                   ),
//                   "hh:mm a"
//                 )
//               : "-",

//           isLate:
//             r.isLate
//               ? "YES"
//               : "NO",

//           lateBy:
//             r.isLate &&
//             r.lateByMinutes
//               ? formatLateTime(
//                   r.lateByMinutes
//                 )
//               : "-",

//           lunchStart:
//             r.lunchStart
//               ? format(
//                   new Date(
//                     r.lunchStart
//                   ),
//                   "hh:mm a"
//                 )
//               : "-",

//           lunchEnd:
//             r.lunchEnd
//               ? format(
//                   new Date(
//                     r.lunchEnd
//                   ),
//                   "hh:mm a"
//                 )
//               : "-",

//           lunchDuration:
//             r.lunchDurationMinutes
//               ? `${r.lunchDurationMinutes} mins`
//               : "-",

//           excessLunch:
//             r.excessLunchMinutes
//               ? `${r.excessLunchMinutes} mins`
//               : "0 mins",

//           remarks:
//             r.remarks ||
//             "-",

//           location:
//             r.loginLocationAddress ||
//             "-",
//         });
//       }

//       // ========================================================
//       // STYLE DATA ROWS
//       // ========================================================
//       worksheet.eachRow(
//         (
//           row,
//           rowNumber
//         ) => {
//           if (
//             rowNumber > 1
//           ) {
//             row.alignment = {
//               vertical:
//                 "middle",
//             };

//             row.height = 20;
//           }
//         }
//       );

//       // ========================================================
//       // FREEZE HEADER
//       // ========================================================
//       worksheet.views = [
//         {
//           state: "frozen",
//           ySplit: 1,
//         },
//       ];

//       // ========================================================
//       // ENABLE FILTER
//       // ========================================================
//       worksheet.autoFilter = {
//         from: "A1",
//         to: "L1",
//       };
//     }

//     // ============================================================
//     // NO RECORDS FOUND
//     // ============================================================
//     if (
//       recordsByUser.size === 0
//     ) {
//       const worksheet =
//         workbook.addWorksheet(
//           "No Data"
//         );

//       worksheet.getCell(
//         "A1"
//       ).value =
//         "No attendance records found for the selected filters.";

//       worksheet.getCell(
//         "A1"
//       ).font = {
//         bold: true,
//       };

//       worksheet.getColumn(
//         "A"
//       ).width = 60;
//     }

//     // ============================================================
//     // FINAL SHEET LOG
//     // ============================================================
//     console.log(
//       "[EXPORT] Final worksheets:",
//       workbook.worksheets.map(
//         (worksheet) =>
//           worksheet.name
//       )
//     );

//     // ============================================================
//     // GENERATE XLSX
//     // ============================================================
//     const buffer =
//       await workbook.xlsx.writeBuffer();

//     const filename =
//       `attendance-report-${from || "all"}_to_${
//         to || "all"
//       }-${Date.now()}.xlsx`;

//     // ============================================================
//     // AUDIT LOG
//     // ============================================================
//     await createAuditLog({
//       userId:
//         currentUser.userId,

//       action:
//         "EXPORT",

//       module:
//         "Attendance",

//       description:
//         `Exported attendance XLSX (${records.length} records, ${recordsByUser.size} users)`,

//       entityType:
//         "Attendance",

//       metadata: {
//         from:
//           from || null,

//         to:
//           to || null,

//         totalRecords:
//           records.length,

//         totalUsers:
//           recordsByUser.size,

//         role:
//           currentUser.role,

//         requestedUserId:
//           requestedUserId ||
//           null,

//         requestedTeamId:
//           requestedTeamId ||
//           null,
//       },
//     });

//     // ============================================================
//     // DOWNLOAD
//     // ============================================================
//     return new NextResponse(
//       buffer,
//       {
//         status: 200,

//         headers: {
//           "Content-Type":
//             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

//           "Content-Disposition":
//             `attachment; filename="${filename}"`,

//           "Content-Length":
//             buffer.byteLength.toString(),

//           "Cache-Control":
//             "no-store",
//         },
//       }
//     );
//   } catch (
//     error: any
//   ) {
//     console.error(
//       "[EXPORT] ERROR:",
//       error
//     );

//     return NextResponse.json(
//       {
//         success: false,

//         message:
//           "Failed to export attendance records",

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


import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import ExcelJS from "exceljs";
import { format } from "date-fns";

import { connectDB } from "@/config/db";
import Attendance from "@/models/Attendance";
import Auth from "@/models/Auth";
import Team from "@/models/Team";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";
import { formatLateTime } from "@/lib/shiftValidation";

// ============================================================
// HELPERS
// ============================================================

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

  if (
    mongoose.Types.ObjectId.isValid(
      String(value)
    )
  ) {
    return new mongoose.Types.ObjectId(
      String(value)
    );
  }

  return null;
}

// ============================================================
// SAFE EXCEL SHEET NAME
// ============================================================

function getSafeSheetName(
  used: Set<string>,
  rawName: string
) {
  let base = String(
    rawName || "Unknown"
  )
    .replace(
      /[\\/*?:[\]]/g,
      ""
    )
    .trim();

  if (!base) {
    base = "Unknown";
  }

  // Excel max = 31 chars
  base = base.slice(0, 31);

  const normalize = (
    name: string
  ) => name.toLowerCase();

  // First name
  if (
    !used.has(
      normalize(base)
    )
  ) {
    used.add(
      normalize(base)
    );

    return base;
  }

  // Duplicate name
  for (
    let i = 1;
    i < 100000;
    i++
  ) {
    const suffix = `_${i}`;

    const maxBaseLength =
      31 - suffix.length;

    const candidate =
      `${base.slice(
        0,
        maxBaseLength
      )}${suffix}`;

    if (
      !used.has(
        normalize(candidate)
      )
    ) {
      used.add(
        normalize(candidate)
      );

      return candidate;
    }
  }

  const fallback =
    `Sheet_${Date.now()}`.slice(
      0,
      31
    );

  used.add(
    normalize(fallback)
  );

  return fallback;
}

// ============================================================
// MONTH RANGE
// ============================================================

function getMonthRange(
  month: string
) {
  const match =
    /^(\d{4})-(\d{2})$/.exec(
      month
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const monthNumber =
    Number(match[2]);

  if (
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return null;
  }

  const lastDay =
    new Date(
      year,
      monthNumber,
      0
    ).getDate();

  return {
    from: new Date(
      `${month}-01T00:00:00+05:30`
    ),

    to: new Date(
      `${month}-${String(
        lastDay
      ).padStart(
        2,
        "0"
      )}T23:59:59.999+05:30`
    ),
  };
}

// ============================================================
// REPORT TYPE
// ============================================================

function normalizeReportType(
  value: string | null
) {
  const allowed =
    new Set([
      "month-performance",
      "late-in",
      "absent",
      "in-out",
      "summary",
      "half-day",
      "office-off",
    ]);

  if (
    value &&
    allowed.has(value)
  ) {
    return value;
  }

  return "month-performance";
}

// ============================================================
// FILTER REPORT
// ============================================================

function filterByReportType(
  records: any[],
  reportType: string
) {
  switch (reportType) {

    case "late-in":
      return records.filter(
        (record) =>
          record.isLate === true
      );

    case "absent":
      return records.filter(
        (record) =>
          String(
            record.status || ""
          ).toLowerCase() ===
          "absent"
      );

    case "half-day":
      return records.filter(
        (record) =>
          String(
            record.status || ""
          ).toLowerCase() ===
          "half-day"
      );

    case "office-off":
      return records.filter(
        (record) =>
          String(
            record.status || ""
          ).toLowerCase() ===
          "office-off"
      );

    case "in-out":
    case "summary":
    case "month-performance":
    default:
      return records;
  }
}

// ============================================================
// EXCEL COLUMNS
// ============================================================

function addDetailedColumns(
  worksheet: ExcelJS.Worksheet
) {
  worksheet.columns = [
    {
      header: "Date",
      key: "date",
      width: 15,
    },

    {
      header: "Status",
      key: "status",
      width: 14,
    },

    {
      header: "Login Time",
      key: "loggingTime",
      width: 15,
    },

    {
      header: "Logout Time",
      key: "logoutTime",
      width: 15,
    },

    {
      header: "Late Status",
      key: "isLate",
      width: 14,
    },

    {
      header: "Late By",
      key: "lateBy",
      width: 14,
    },

    {
      header: "Lunch Start",
      key: "lunchStart",
      width: 15,
    },

    {
      header: "Lunch End",
      key: "lunchEnd",
      width: 15,
    },

    {
      header: "Lunch Duration",
      key: "lunchDuration",
      width: 17,
    },

    {
      header: "Excess Lunch",
      key: "excessLunch",
      width: 15,
    },

    {
      header: "Remarks",
      key: "remarks",
      width: 30,
    },

    {
      header: "Location Address",
      key: "location",
      width: 40,
    },
  ];
}

// ============================================================
// HEADER STYLE
// ============================================================

function styleHeader(
  row: ExcelJS.Row
) {
  row.font = {
    bold: true,

    color: {
      argb: "FFFFFF",
    },
  };

  row.fill = {
    type: "pattern",

    pattern: "solid",

    fgColor: {
      argb: "1E293B",
    },
  };

  row.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  row.height = 24;
}

// ============================================================
// ADD ATTENDANCE ROWS
// ============================================================

function addAttendanceRows(
  worksheet: ExcelJS.Worksheet,
  userRecords: any[]
) {
  for (
    const record of userRecords
  ) {

    worksheet.addRow({

      date: record.date
        ? format(
            new Date(
              record.date
            ),
            "dd MMM yyyy"
          )
        : "-",

      status: String(
        record.status ||
          "present"
      ).toUpperCase(),

      loggingTime:
        record.loggingTime
          ? format(
              new Date(
                record.loggingTime
              ),
              "hh:mm a"
            )
          : "-",

      logoutTime:
        record.logoutTime
          ? format(
              new Date(
                record.logoutTime
              ),
              "hh:mm a"
            )
          : "-",

      isLate:
        record.isLate
          ? "YES"
          : "NO",

      lateBy:
        record.isLate &&
        record.lateByMinutes
          ? formatLateTime(
              record.lateByMinutes
            )
          : "-",

      lunchStart:
        record.lunchStart
          ? format(
              new Date(
                record.lunchStart
              ),
              "hh:mm a"
            )
          : "-",

      lunchEnd:
        record.lunchEnd
          ? format(
              new Date(
                record.lunchEnd
              ),
              "hh:mm a"
            )
          : "-",

      lunchDuration:
        record.lunchDurationMinutes
          ? `${record.lunchDurationMinutes} mins`
          : "-",

      excessLunch:
        record.excessLunchMinutes
          ? `${record.excessLunchMinutes} mins`
          : "0 mins",

      remarks:
        record.remarks ||
        "-",

      location:
        record.loginLocationAddress ||
        "-",
    });
  }
}

// ============================================================
// SUMMARY SHEET
// ============================================================

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  user: any,
  records: any[],
  usedSheetNames: Set<string>
) {
  const sheetName =
    getSafeSheetName(
      usedSheetNames,
      `${user?.name || "Unknown"} Summary`
    );

  const worksheet =
    workbook.addWorksheet(
      sheetName
    );

  worksheet.columns = [
    {
      header: "Employee",
      key: "employee",
      width: 28,
    },

    {
      header: "Email",
      key: "email",
      width: 32,
    },

    {
      header: "Role",
      key: "role",
      width: 20,
    },

    {
      header: "Total Records",
      key: "total",
      width: 16,
    },

    {
      header: "Present",
      key: "present",
      width: 12,
    },

    {
      header: "Absent",
      key: "absent",
      width: 12,
    },

    {
      header: "Half Day",
      key: "halfDay",
      width: 14,
    },

    {
      header: "Office Off",
      key: "officeOff",
      width: 14,
    },

    {
      header: "Late",
      key: "late",
      width: 12,
    },
  ];

  const count = (
    status: string
  ) =>
    records.filter(
      (record) =>
        String(
          record.status ||
            "present"
        ).toLowerCase() ===
        status
    ).length;

  worksheet.addRow({

    employee:
      user?.name ||
      "Unknown",

    email:
      user?.email ||
      "-",

    role:
      user?.role ||
      "-",

    total:
      records.length,

    present:
      count("present"),

    absent:
      count("absent"),

    halfDay:
      count("half-day"),

    officeOff:
      count("office-off"),

    late:
      records.filter(
        (record) =>
          record.isLate === true
      ).length,
  });

  styleHeader(
    worksheet.getRow(1)
  );

  worksheet.eachRow(
    (
      row,
      rowNumber
    ) => {
      if (
        rowNumber > 1
      ) {
        row.alignment = {
          vertical:
            "middle",
        };

        row.height = 20;
      }
    }
  );

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];
}

// ============================================================
// GET
// ============================================================

export async function GET(
  req: NextRequest
) {
  try {

    console.log(
      "========================================"
    );

    console.log(
      "[EXPORT] ATTENDANCE EXPORT START"
    );

    console.log(
      "[EXPORT] Timestamp:",
      new Date().toISOString()
    );

    console.log(
      "========================================"
    );

    // ========================================================
    // DATABASE
    // ========================================================

    await connectDB();

    // ========================================================
    // CURRENT USER
    // ========================================================

    const currentUser =
      await getCurrentUser();

    if (
      !currentUser?.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const role =
      normalizeRole(
        currentUser.role
      );

    const userOid =
      toObjectId(
        currentUser.userId
      );

    if (!userOid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid user session",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // QUERY PARAMETERS
    // ========================================================

    const {
      searchParams,
    } = new URL(
      req.url
    );

    const month =
      searchParams.get(
        "month"
      );

    const from =
      searchParams.get(
        "from"
      ) ||
      searchParams.get(
        "startDate"
      );

    const to =
      searchParams.get(
        "to"
      ) ||
      searchParams.get(
        "endDate"
      );

    const requestedUserId =
      searchParams.get(
        "userId"
      );

    const requestedUserIdsRaw =
      searchParams.get(
        "userIds"
      );

    const requestedTeamId =
      searchParams.get(
        "teamId"
      );

    const reportType =
      normalizeReportType(
        searchParams.get(
          "reportType"
        )
      );

    const sortBy =
      searchParams.get(
        "sortBy"
      ) === "role"
        ? "role"
        : "employee";

    // ========================================================
    // USER IDS
    // ========================================================

    const requestedUserIds =
      requestedUserIdsRaw
        ? requestedUserIdsRaw
            .split(",")
            .map(
              (id) =>
                id.trim()
            )
            .filter(Boolean)
        : requestedUserId
          ? [
              requestedUserId,
            ]
          : [];

    const query: any = {};

    // ========================================================
    // ADMIN / HR
    // ========================================================

    if (
      role === "admin" ||
      role === "hr"
    ) {

      // Selected employees
      if (
        requestedUserIds.length >
        0
      ) {

        const objectIds =
          requestedUserIds.map(
            toObjectId
          );

        if (
          objectIds.some(
            (id) => !id
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Invalid employee ID",
            },
            {
              status: 400,
            }
          );
        }

        query.userId = {
          $in: objectIds,
        };
      }

      // Selected team
      else if (
        requestedTeamId &&
        requestedTeamId !==
          "all"
      ) {

        const teamOid =
          toObjectId(
            requestedTeamId
          );

        if (!teamOid) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Invalid team ID",
            },
            {
              status: 400,
            }
          );
        }

        const teamUsers =
          await Auth.find(
            {
              teamId:
                teamOid,

              isDeleted: {
                $ne: true,
              },
            },
            {
              _id: 1,
            }
          ).lean();

        query.userId = {
          $in:
            teamUsers.map(
              (user) =>
                user._id
            ),
        };
      }

      // No selection = ALL USERS
    }

    // ========================================================
    // TEAM LEAD
    // ========================================================

    else if (
      role ===
      "teamlead"
    ) {

      const teams =
        await Team.find(
          {
            teamLead:
              userOid,

            isActive:
              true,
          }
        )
          .select(
            "members"
          )
          .lean();

      const memberIds =
        Array.from(
          new Set(
            teams.flatMap(
              (
                team: any
              ) =>
                (
                  team.members ||
                  []
                ).map(
                  (
                    member: any
                  ) =>
                    String(
                      member
                    )
                )
            )
          )
        );

      // Include Team Lead
      if (
        !memberIds.includes(
          String(
            userOid
          )
        )
      ) {
        memberIds.push(
          String(
            userOid
          )
        );
      }

      // Selected employees
      if (
        requestedUserIds.length >
        0
      ) {

        const invalid =
          requestedUserIds.some(
            (id) =>
              !memberIds.includes(
                String(id)
              )
          );

        if (invalid) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Cannot export data outside your team",
            },
            {
              status: 403,
            }
          );
        }

        const objectIds =
          requestedUserIds.map(
            toObjectId
          );

        if (
          objectIds.some(
            (id) => !id
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Invalid employee ID",
            },
            {
              status: 400,
            }
          );
        }

        query.userId = {
          $in: objectIds,
        };
      }

      // All team members
      else {

        query.userId = {
          $in:
            memberIds.map(
              (id) =>
                new mongoose.Types.ObjectId(
                  id
                )
            ),
        };
      }
    }

    // ========================================================
    // NORMAL EMPLOYEE
    // ========================================================

    else {

      query.userId =
        userOid;
    }

    // ========================================================
    // DATE FILTER
    // ========================================================

    if (month) {

      const range =
        getMonthRange(
          month
        );

      if (!range) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid month. Expected YYYY-MM.",
          },
          {
            status: 400,
          }
        );
      }

      query.date = {
        $gte:
          range.from,

        $lte:
          range.to,
      };
    }

    else if (
      from ||
      to
    ) {

      query.date = {};

      if (from) {
        query.date.$gte =
          new Date(
            from.includes("T")
              ? from
              : `${from}T00:00:00+05:30`
          );
      }

      if (to) {
        query.date.$lte =
          new Date(
            to.includes("T")
              ? to
              : `${to}T23:59:59.999+05:30`
          );
      }
    }

    console.log(
      "[EXPORT] MongoDB query:",
      JSON.stringify(
        query
      )
    );

    console.log(
      "[EXPORT] Report type:",
      reportType
    );

    // ========================================================
    // FETCH RECORDS
    // ========================================================

    let records =
      await Attendance.find(
        query
      )
        .populate(
          "userId",
          "name email role workingShift"
        )
        .populate(
          "updatedBy",
          "name email"
        )
        .sort({
          date: -1,
        })
        .lean();

    console.log(
      `[EXPORT] Database records: ${records.length}`
    );

    // ========================================================
    // REPORT FILTER
    // ========================================================

    records =
      filterByReportType(
        records,
        reportType
      );

    console.log(
      `[EXPORT] Records after report filter: ${records.length}`
    );

    // ========================================================
    // GROUP BY USER
    // ========================================================

    const recordsByUser =
      new Map<
        string,
        {
          user: any;
          records: any[];
        }
      >();

    for (
      const record of records
    ) {

      const user =
        record.userId;

      if (
        !user ||
        !user._id
      ) {
        console.warn(
          "[EXPORT] Skipping record without user:",
          record._id
        );

        continue;
      }

      const userId =
        String(
          user._id
        );

      if (
        !recordsByUser.has(
          userId
        )
      ) {

        recordsByUser.set(
          userId,
          {
            user,
            records: [],
          }
        );
      }

      recordsByUser
        .get(userId)!
        .records.push(
          record
        );
    }

    // ========================================================
    // SORT USERS
    // ========================================================

    const userGroups =
      Array.from(
        recordsByUser.values()
      ).sort(
        (a, b) => {

          if (
            sortBy ===
            "role"
          ) {

            return (
              String(
                a.user?.role ||
                  ""
              ).localeCompare(
                String(
                  b.user?.role ||
                    ""
                )
              ) ||

              String(
                a.user?.name ||
                  ""
              ).localeCompare(
                String(
                  b.user?.name ||
                    ""
                )
              )
            );
          }

          return String(
            a.user?.name ||
              ""
          ).localeCompare(
            String(
              b.user?.name ||
                ""
            )
          );
        }
      );

    console.log(
      `[EXPORT] Unique users: ${userGroups.length}`
    );

    // ========================================================
    // WORKBOOK
    // ========================================================

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      "TronX CRM";

    workbook.created =
      new Date();

    const usedSheetNames =
      new Set<string>();

    // ========================================================
    // ONE SHEET PER USER
    // ========================================================

    for (
      const userData of
        userGroups
    ) {

      const user =
        userData.user;

      const userRecords =
        userData.records;

      // ------------------------------------------------------
      // SUMMARY REPORT
      // ------------------------------------------------------

      if (
        reportType ===
        "summary"
      ) {

        addSummarySheet(
          workbook,
          user,
          userRecords,
          usedSheetNames
        );

        continue;
      }

      // ------------------------------------------------------
      // NORMAL REPORT
      // ------------------------------------------------------

      const sheetName =
        getSafeSheetName(
          usedSheetNames,
          user?.name ||
            "Unknown User"
        );

      console.log(
        `[EXPORT] User: ${user?.name} | Records: ${userRecords.length} | Sheet: ${sheetName}`
      );

      const worksheet =
        workbook.addWorksheet(
          sheetName
        );

      addDetailedColumns(
        worksheet
      );

      styleHeader(
        worksheet.getRow(1)
      );

      addAttendanceRows(
        worksheet,
        userRecords
      );

      // ------------------------------------------------------
      // STYLE ROWS
      // ------------------------------------------------------

      worksheet.eachRow(
        (
          row,
          rowNumber
        ) => {

          if (
            rowNumber > 1
          ) {

            row.alignment = {
              vertical:
                "middle",
            };

            row.height = 20;
          }
        }
      );

      // ------------------------------------------------------
      // FREEZE HEADER
      // ------------------------------------------------------

      worksheet.views = [
        {
          state:
            "frozen",

          ySplit: 1,
        },
      ];

      // ------------------------------------------------------
      // FILTER
      // ------------------------------------------------------

      worksheet.autoFilter = {
        from: "A1",
        to: "L1",
      };
    }

    // ========================================================
    // NO DATA
    // ========================================================

    if (
      userGroups.length ===
      0
    ) {

      const worksheet =
        workbook.addWorksheet(
          "No Data"
        );

      worksheet.getCell(
        "A1"
      ).value =
        "No attendance records found for the selected filters.";

      worksheet.getCell(
        "A2"
      ).value =
        "Change the month, employee selection, or report type and try again.";

      worksheet.getCell(
        "A1"
      ).font = {
        bold: true,
      };

      worksheet.getColumn(
        "A"
      ).width = 75;
    }

    // ========================================================
    // FINAL SHEETS
    // ========================================================

    console.log(
      "[EXPORT] Final worksheets:",
      workbook.worksheets.map(
        (
          worksheet
        ) =>
          worksheet.name
      )
    );

    // ========================================================
    // CREATE XLSX
    // ========================================================

    const buffer =
      await workbook.xlsx.writeBuffer();

    const safeMonth =
      month ||
      "custom";

    const filename =
      `attendance-${reportType}-${safeMonth}-${Date.now()}.xlsx`;

    // ========================================================
    // AUDIT LOG
    // ========================================================

    await createAuditLog({
      userId:
        currentUser.userId,

      action:
        "EXPORT",

      module:
        "Attendance",

      description:
        `Exported attendance XLSX (${records.length} records, ${userGroups.length} users, ${reportType})`,

      entityType:
        "Attendance",

      metadata: {
        month:
          month ||
          null,

        from:
          from ||
          null,

        to:
          to ||
          null,

        reportType,

        sortBy,

        totalRecords:
          records.length,

        totalUsers:
          userGroups.length,

        role:
          currentUser.role,

        requestedUserId:
          requestedUserId ||
          null,

        requestedUserIds,

        requestedTeamId:
          requestedTeamId ||
          null,
      },
    });

    // ========================================================
    // DOWNLOAD
    // ========================================================

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

          "Cache-Control":
            "no-store",
        },
      }
    );

  } catch (
    error: any
  ) {

    console.error(
      "[EXPORT] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to export attendance records",

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