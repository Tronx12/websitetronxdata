// import { NextRequest, NextResponse } from "next/server";
// import mongoose from "mongoose";
// import ExcelJS from "exceljs";

// import { connectDB } from "@/config/db";
// import SurveyData from "@/models/SurveyData";
// import Auth from "@/models/Auth";
// import { getCurrentUser } from "@/lib/getuser";
// import { createAuditLog } from "@/lib/auditLog";
// import { buildSurveySearchClause } from "@/lib/surveySearch";
// import Team from "@/models/Team";



// // =========================================================
// // HELPERS
// // =========================================================

// function normalizeRole(role: unknown) {
//   return String(role || "")
//     .toLowerCase()
//     .replace(/[-_\s]/g, "");
// }

// function toObjectId(value: unknown) {
//   if (!value) return null;

//   if (
//     value instanceof mongoose.Types.ObjectId
//   ) {
//     return value;
//   }

//   if (
//     mongoose.Types.ObjectId.isValid(
//       String(value)
//     )
//   ) {
//     return new mongoose.Types.ObjectId(
//       String(value)
//     );
//   }

//   return null;
// }


// /**
//  * Get the active users in the Team Lead's team.
//  * The Team Lead himself is excluded.
//  *
//  * The current export route already uses Auth.teamId for
//  * the Team Lead's team lookup, so this keeps the same
//  * team relationship instead of introducing a new model
//  * assumption.
//  */
// // async function getTeamMemberIdsForLead(
// //   teamLeadId: mongoose.Types.ObjectId,
// //   teamId: unknown
// // ): Promise<mongoose.Types.ObjectId[]> {
// //   const teamOid =
// //     toObjectId(teamId);

// //   if (!teamOid) {
// //     return [];
// //   }

// //   const members =
// //     await Auth.find(
// //       {
// //         teamId: teamOid,
// //         _id: {
// //           $ne: teamLeadId,
// //         },
// //         isDeleted: {
// //           $ne: true,
// //         },
// //         isActive: {
// //           $ne: false,
// //         },
// //       },
// //       {
// //         _id: 1,
// //       }
// //     ).lean();

// //   return members.map(
// //     (member) =>
// //       member._id
// //   );
// // }

// async function getTeamMemberIdsForLead(
//   teamLeadId: mongoose.Types.ObjectId
// ): Promise<mongoose.Types.ObjectId[]> {
//   const teams = await Team.find({ teamLead: teamLeadId, isActive: true })
//     .select("members")
//     .lean();

//   const ids = new Set<string>();
//   teams.forEach((t: any) =>
//     (t.members || []).forEach((m: any) => ids.add(String(m)))
//   );
//   ids.delete(String(teamLeadId));

//   return [...ids]
//     .filter((id) => mongoose.Types.ObjectId.isValid(id))
//     .map((id) => new mongoose.Types.ObjectId(id));
// }
// /**
//  * Resolve Team Lead export scope.
//  *
//  * createdBy=<userId>
//  *   -> Team Lead himself OR one of his team members.
//  *
//  * scope=team
//  *   -> all team-member records.
//  *
//  * nothing specified
//  *   -> Team Lead's own records.
//  */
// // async function resolveTeamLeadCreatedByFilter(
// //   searchParams: URLSearchParams,
// //   user: any,
// //   userOid: mongoose.Types.ObjectId
// // ): Promise<Record<string, any> | null> {
// //   const scope =
// //     searchParams.get(
// //       "scope"
// //     );

// //   const createdBy =
// //     searchParams.get(
// //       "createdBy"
// //     );

// //   const teamMemberIds =
// //     await getTeamMemberIdsForLead(
// //       userOid,
// //       user?.teamId
// //     );

// //   // Whole team.
// //   if (scope === "team") {
// //     return {
// //       createdBy: {
// //         $in: teamMemberIds,
// //       },
// //     };
// //   }

// //   // One person: Team Lead himself or a member
// //   // of his team.
// //   if (createdBy) {
// //     const createdByOid =
// //       toObjectId(
// //         createdBy
// //       );

// //     if (!createdByOid) {
// //       return null;
// //     }

// //     if (
// //       createdByOid.toString() ===
// //       userOid.toString()
// //     ) {
// //       return {
// //         createdBy: userOid,
// //       };
// //     }

// //     const isTeamMember =
// //       teamMemberIds.some(
// //         (id) =>
// //           id.toString() ===
// //           createdByOid.toString()
// //       );

// //     if (!isTeamMember) {
// //       return null;
// //     }

// //     return {
// //       createdBy: createdByOid,
// //     };
// //   }

// //   // Default: Team Lead's own records.
// //   return {
// //     createdBy: userOid,
// //   };
// // }


// // =========================================================
// // DATE RANGE
// // =========================================================

// async function resolveTeamLeadCreatedByFilter(
//   searchParams: URLSearchParams,
//   user: any,
//   userOid: mongoose.Types.ObjectId
// ): Promise<Record<string, any> | null> {
//   const scope = searchParams.get("scope");
//   const createdBy = searchParams.get("createdBy");

//   // Same Team lookup as GET /api/survey (one argument only)
//   const teamMemberIds = await getTeamMemberIdsForLead(userOid);

//   // Whole team
//   if (scope === "team") {
//     return { createdBy: { $in: teamMemberIds } };
//   }

//   // One person: the Team Lead or one of his members
//   if (createdBy) {
//     const createdByOid = toObjectId(createdBy);
//     if (!createdByOid) return null;

//     if (createdByOid.toString() === userOid.toString()) {
//       return { createdBy: userOid };
//     }

//     const isTeamMember = teamMemberIds.some(
//       (id) => id.toString() === createdByOid.toString()
//     );
//     if (!isTeamMember) return null;

//     return { createdBy: createdByOid };
//   }

//   // Default: own records
//   return { createdBy: userOid };
// }

// function getDateRange(
//   range: string | null,
//   startDate: string | null,
//   endDate: string | null,
//   tzOffset: number = 0
// ) {
//   const now = new Date();

//   // -------------------------------------------------------
//   // CUSTOM
//   // -------------------------------------------------------
//   //
//   // startDate/endDate are YYYY-MM-DD in the user's local
//   // timezone. tzOffset uses JavaScript's sign convention:
//   // IST = -330.
//   //
//   // Example:
//   // 2026-09-30 + -330 minutes
//   // => 2026-09-29T18:30:00.000Z
//   //
//   // The custom end is exclusive, so the selected end date
//   // includes the complete local day.

//   if (range === "custom" && startDate && endDate) {
//     const [sy, sm, sd] =
//       startDate.split("-").map(Number);

//     const [ey, em, ed] =
//       endDate.split("-").map(Number);

//     if (
//       !sy ||
//       !sm ||
//       !sd ||
//       !ey ||
//       !em ||
//       !ed ||
//       !Number.isFinite(tzOffset)
//     ) {
//       return {
//         start: null,
//         end: null,
//         exclusiveEnd: false,
//         invalid: true,
//       };
//     }

//     const start =
//       new Date(
//         Date.UTC(
//           sy,
//           sm - 1,
//           sd
//         ) +
//           tzOffset * 60000
//       );

//     const end =
//       new Date(
//         Date.UTC(
//           ey,
//           em - 1,
//           ed
//         ) +
//           tzOffset * 60000 +
//           24 * 60 * 60 * 1000
//       );

//     return {
//       start,
//       end,
//       exclusiveEnd: true,
//       invalid: false,
//     };
//   }

//   // -------------------------------------------------------
//   // TODAY
//   // -------------------------------------------------------

//   if (range === "today") {
//     const date =
//       new Intl.DateTimeFormat(
//         "en-CA",
//         {
//           timeZone: "Asia/Kolkata",
//         }
//       ).format(now);

//     return {
//       start: new Date(
//         `${date}T00:00:00+05:30`
//       ),

//       end: new Date(
//         `${date}T23:59:59.999+05:30`
//       ),

//       exclusiveEnd: false,
//       invalid: false,
//     };
//   }

//   // -------------------------------------------------------
//   // WEEKLY
//   // Monday -> Sunday
//   // -------------------------------------------------------

//   if (range === "weekly") {
//     const indiaNow =
//       new Date(
//         now.toLocaleString(
//           "en-US",
//           {
//             timeZone:
//               "Asia/Kolkata",
//           }
//         )
//       );

//     const day =
//       indiaNow.getDay();

//     const diff =
//       day === 0
//         ? 6
//         : day - 1;

//     const startLocal =
//       new Date(indiaNow);

//     startLocal.setDate(
//       indiaNow.getDate() -
//       diff
//     );

//     startLocal.setHours(
//       0,
//       0,
//       0,
//       0
//     );

//     const endLocal =
//       new Date(startLocal);

//     endLocal.setDate(
//       startLocal.getDate() +
//       6
//     );

//     endLocal.setHours(
//       23,
//       59,
//       59,
//       999
//     );

//     const start =
//       new Date(
//         startLocal.toLocaleString(
//           "en-US",
//           {
//             timeZone:
//               "Asia/Kolkata",
//           }
//         )
//       );

//     const end =
//       new Date(
//         endLocal.toLocaleString(
//           "en-US",
//           {
//             timeZone:
//               "Asia/Kolkata",
//           }
//         )
//       );

//     return {
//       start,
//       end,
//       exclusiveEnd: false,
//       invalid: false,
//     };
//   }

//   // -------------------------------------------------------
//   // MONTHLY
//   // -------------------------------------------------------

//   if (range === "monthly") {
//     const indiaNow =
//       new Date(
//         now.toLocaleString(
//           "en-US",
//           {
//             timeZone:
//               "Asia/Kolkata",
//           }
//         )
//       );

//     const year =
//       indiaNow.getFullYear();

//     const month =
//       indiaNow.getMonth();

//     const startLocal =
//       new Date(
//         year,
//         month,
//         1,
//         0,
//         0,
//         0,
//         0
//       );

//     const endLocal =
//       new Date(
//         year,
//         month + 1,
//         0,
//         23,
//         59,
//         59,
//         999
//       );

//     const start =
//       new Date(
//         startLocal.toLocaleString(
//           "en-US",
//           {
//             timeZone:
//               "Asia/Kolkata",
//           }
//         )
//       );

//     const end =
//       new Date(
//         endLocal.toLocaleString(
//           "en-US",
//           {
//             timeZone:
//               "Asia/Kolkata",
//           }
//         )
//       );

//     return {
//       start,
//       end,
//       exclusiveEnd: false,
//       invalid: false,
//     };
//   }

//   // -------------------------------------------------------
//   // ALL
//   // -------------------------------------------------------

//   return {
//     start: null,
//     end: null,
//     exclusiveEnd: false,
//     invalid: false,
//   };
// }



// // =========================================================
// // EXCEL VALUE
// // =========================================================

// function excelValue(
//   value: any
// ): any {
//   if (
//     value === null ||
//     value === undefined
//   ) {
//     return "";
//   }

//   if (
//     value instanceof Date
//   ) {
//     return value;
//   }

//   if (
//     typeof value ===
//     "object"
//   ) {
//     // ObjectId
//     if (
//       value?._bsontype ===
//       "ObjectId"
//     ) {
//       return value.toString();
//     }

//     // Map
//     if (
//       value instanceof Map
//     ) {
//       return JSON.stringify(
//         Object.fromEntries(
//           value
//         )
//       );
//     }

//     try {
//       return JSON.stringify(
//         value
//       );
//     } catch {
//       return String(
//         value
//       );
//     }
//   }

//   return value;
// }


// // =========================================================
// // GET EXPORT
// // =========================================================

// export async function GET(
//   req: NextRequest
// ) {
//   try {
//     await connectDB();

//     // =======================================================
//     // AUTHENTICATED USER
//     // =======================================================

//     const user =
//       await getCurrentUser();

//     if (!user?.userId) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "Unauthorized",
//         },
//         {
//           status: 401,
//         }
//       );
//     }

//     const role =
//       normalizeRole(
//         user.role
//       );

//     const userOid =
//       toObjectId(
//         user.userId
//       );

//     if (!userOid) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "Invalid logged-in user",
//         },
//         {
//           status: 400,
//         }
//       );
//     }


//     // =======================================================
//     // QUERY
//     // =======================================================

//     const {
//       searchParams,
//     } = new URL(
//       req.url
//     );

//     const category =
//       searchParams.get(
//         "category"
//       );

//     const range =
//       searchParams.get(
//         "range"
//       );

//     const startDate =
//       searchParams.get(
//         "startDate"
//       ) ||
//       searchParams.get(
//         "from"
//       );

//     const endDate =
//       searchParams.get(
//         "endDate"
//       ) ||
//       searchParams.get(
//         "to"
//       );

//     const scope =
//       searchParams.get(
//         "scope"
//       );

//     const createdBy =
//       searchParams.get(
//         "createdBy"
//       );

//     const tzOffsetRaw =
//       searchParams.get(
//         "tzOffset"
//       );

//     const tzOffset =
//       tzOffsetRaw === null
//         ? 0
//         : Number(tzOffsetRaw);

//     const search =
//       searchParams.get("search")?.trim() || "";

//     /*
//      * ONLY ADMIN / HR CAN SEND teamId.
//      *
//      * Survey users and Team Leads must NEVER
//      * be allowed to choose another team.
//      */
//     const requestedTeamId =
//       searchParams.get(
//         "teamId"
//       );


//     // =======================================================
//     // BASE FILTER
//     // =======================================================

//     const filter: any = {};


//     // =======================================================
//     // ROLE-BASED ACCESS
//     // =======================================================

//     // -------------------------------------------------------
//     // SURVEY
//     //
//     // ONLY records created by this logged-in user
//     // -------------------------------------------------------

//     if (
//       role === "survey" ||
//       role === "surveytester"
//     ) {
//       // Survey Tester can export ONLY their own uploaded data
//       filter.createdBy = userOid;
//     }


//     // -------------------------------------------------------
//     // TEAM LEAD
//     //
//     // TEAM LEAD + ALL TEAM MEMBERS
//     // -------------------------------------------------------

//     else if (
//       role === "teamlead"
//     ) {
//       /*
//        * Team Lead export scope:
//        *
//        * createdBy=<userId>
//        *   -> own records OR one of this lead's members.
//        *
//        * scope=team
//        *   -> all records created by this lead's
//        *      team members.
//        *
//        * no createdBy/scope
//        *   -> own records.
//        *
//        * The requested createdBy is validated against
//        * the logged-in Team Lead's own team.
//        */
//       const scopeFilter =
//         await resolveTeamLeadCreatedByFilter(
//           searchParams,
//           user,
//           userOid
//         );

//       if (!scopeFilter) {
//         return NextResponse.json(
//           {
//             success: false,
//             message:
//               "Forbidden",
//           },
//           {
//             status: 403,
//           }
//         );
//       }

//       Object.assign(
//         filter,
//         scopeFilter
//       );
//     }


//     // -------------------------------------------------------
//     // ADMIN
//     // HR
//     //
//     // Selected team only
//     // -------------------------------------------------------

//     else if (
//       role === "admin" ||
//       role === "hr"
//     ) {
//       if (
//         requestedTeamId &&
//         requestedTeamId !== "all"
//       ) {
//         const teamOid =
//           toObjectId(
//             requestedTeamId
//           );

//         if (!teamOid) {
//           return NextResponse.json(
//             {
//               success: false,
//               message:
//                 "Invalid teamId",
//             },
//             {
//               status: 400,
//             }
//           );
//         }

//         /*
//          * Get all users belonging to
//          * selected team.
//          */
//         const teamUsers =
//           await Auth.find(
//             {
//               teamId:
//                 teamOid,

//               isDeleted: {
//                 $ne: true,
//               },

//               isActive: {
//                 $ne: false,
//               },
//             },
//             {
//               _id: 1,
//             }
//           ).lean();

//         const memberIds =
//           teamUsers.map(
//             (member) =>
//               member._id
//           );

//         if (
//           memberIds.length === 0
//         ) {
//           filter.createdBy = {
//             $in: [],
//           };
//         } else {
//           filter.createdBy = {
//             $in: memberIds,
//           };
//         }
//       }
//     }



//     // -------------------------------------------------------
//     // OTHER ROLES
//     // -------------------------------------------------------

//     else {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "You do not have permission to export survey data",
//         },
//         {
//           status: 403,
//         }
//       );
//     }


//     // =======================================================
//     // CATEGORY
//     // =======================================================

//     if (
//       category &&
//       [
//         "B2B",
//         "B2H",
//         "B2C",
//       ].includes(
//         category
//       )
//     ) {
//       filter.category =
//         category;
//     }


//     // =======================================================
//     // SEARCH
//     // =======================================================
//     // Search works across survey fields AND the submitting user's
//     // name/email/username. The user lookup is kept inside the already
//     // authorized scope so a Team Lead cannot search/export another team.
//     // if (search) {
//     //   const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//     //   const searchRegex = new RegExp(escapedSearch, "i");

//     //   const userMatches = await Auth.find(
//     //     {
//     //       $or: [
//     //         { name: searchRegex },
//     //         { fullName: searchRegex },
//     //         { username: searchRegex },
//     //         { email: searchRegex },
//     //       ],
//     //       isDeleted: { $ne: true },
//     //       isActive: { $ne: false },
//     //     },
//     //     { _id: 1 }
//     //   ).lean();

//     //   const matchingUserIds = userMatches.map((u: any) => u._id);

//     //   const surveySearch: any[] = [
//     //     { pid: searchRegex },
//     //     { projectNo: searchRegex },
//     //     { supplierId: searchRegex },
//     //     { country: searchRegex },
//     //     { accountType: searchRegex },
//     //     { panelCode: searchRegex },
//     //     { description: searchRegex },
//     //     { ip: searchRegex },
//     //     { status: searchRegex },
//     //   ];

//     //   if (matchingUserIds.length > 0) {
//     //     surveySearch.push({ createdBy: { $in: matchingUserIds } });
//     //   }

//     //   surveySearch.push({
//     //     $expr: {
//     //       $gt: [
//     //         {
//     //           $size: {
//     //             $filter: {
//     //               input: { $objectToArray: { $ifNull: ["$data", {}] } },
//     //               as: "field",
//     //               cond: {
//     //                 $or: [
//     //                   {
//     //                     $regexMatch: {
//     //                       input: { $toString: "$$field.k" },
//     //                       regex: escapedSearch,
//     //                       options: "i",
//     //                     },
//     //                   },
//     //                   {
//     //                     $regexMatch: {
//     //                       input: { $toString: "$$field.v" },
//     //                       regex: escapedSearch,
//     //                       options: "i",
//     //                     },
//     //                   },
//     //                 ],
//     //               },
//     //             },
//     //           },
//     //         },
//     //         0,
//     //       ],
//     //     },
//     //   });

//     //   filter.$or = surveySearch;
//     // }

//         // =======================================================
//     // SEARCH (shared with GET /api/survey)
//     // =======================================================

//     const searchClause = await buildSurveySearchClause(search);
//     if (searchClause) {
//       filter.$and = [...(filter.$and || []), searchClause];
//     }

//     // =======================================================
//     // DATE
//     // =======================================================

//     const dateRange =
//       getDateRange(
//         range,
//         startDate,
//         endDate,
//         tzOffset
//       );

//     if (dateRange.invalid) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "Invalid custom date range or tzOffset",
//         },
//         {
//           status: 400,
//         }
//       );
//     }

//     const {
//       start,
//       end,
//       exclusiveEnd,
//     } = dateRange;

//     if (
//       start &&
//       end
//     ) {
//       filter.createdAt =
//         exclusiveEnd
//           ? {
//               $gte: start,
//               $lt: end,
//             }
//           : {
//               $gte: start,
//               $lte: end,
//             };
//     }


//     // =======================================================
//     // DEBUG
//     // =======================================================

//     console.log(
//       "=========================================="
//     );

//     console.log(
//       "SURVEY EXPORT"
//     );

//     console.log(
//       "USER:",
//       user.userId
//     );

//     console.log(
//       "ROLE:",
//       user.role
//     );

//     console.log(
//       "TEAM:",
//       (user as any).teamId
//     );

//     console.log(
//       "REQUESTED TEAM:",
//       requestedTeamId
//     );

//     console.log(
//       "SCOPE:",
//       scope
//     );

//     console.log(
//       "CREATED BY:",
//       createdBy
//     );

//     console.log(
//       "SEARCH:",
//       search
//     );

//     console.log(
//       "SCOPE:",
//       scope
//     );

//     console.log(
//       "CREATED BY:",
//       createdBy
//     );

//     console.log(
//       "TZ OFFSET:",
//       tzOffset
//     );

//     console.log(
//       "FILTER:",
//       JSON.stringify(
//         filter,
//         null,
//         2
//       )
//     );

//     console.log(
//       "=========================================="
//     );


//     // =======================================================
//     // GET SURVEY DATA
//     // =======================================================

//     const items =
//       await SurveyData.find(
//         filter
//       )
//         .sort({
//           createdAt: -1,
//         })
//         .lean();


//     // =======================================================
//     // WORKBOOK
//     // =======================================================

//     const workbook = new ExcelJS.Workbook();
//     workbook.creator = "Survey Data Module";
//     workbook.created = new Date();
//     workbook.modified = new Date();

//     // Resolve submitter details once. This also makes the Excel user sheets
//     // readable instead of exposing only ObjectIds.
//     const createdByIds = Array.from(
//       new Set(
//         items
//           .map((item: any) => item.createdBy?.toString?.() || String(item.createdBy || ""))
//           .filter(Boolean)
//       )
//     );

//     const users = createdByIds.length
//       ? await Auth.find(
//           { _id: { $in: createdByIds.map((id) => new mongoose.Types.ObjectId(id)) } },
//           { _id: 1, name: 1, fullName: 1, username: 1, email: 1 }
//         ).lean()
//       : [];

//     const userMap = new Map<string, any>();
//     users.forEach((u: any) => userMap.set(String(u._id), u));

//     const getUserInfo = (item: any) => {
//       const id = item.createdBy?.toString?.() || String(item.createdBy || "");
//       const u = userMap.get(id);
//       return {
//         id,
//         name: u?.name || u?.fullName || u?.username || (id ? `User ${id.slice(-6)}` : "Unassigned"),
//         email: u?.email || "",
//       };
//     };

//     const dataObject = (item: any) =>
//       item.data instanceof Map ? Object.fromEntries(item.data) : item.data || {};

//     const summary = workbook.addWorksheet("Summary");
//     summary.columns = [
//       { header: "Field", key: "field", width: 30 },
//       { header: "Value", key: "value", width: 55 },
//     ];
//     summary.mergeCells("A1:B1");
//     summary.getCell("A1").value = "SURVEY DATA EXPORT";
//     summary.getCell("A1").font = { bold: true, size: 20 };
//     summary.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
//     summary.getRow(1).height = 35;

//     const scopeText = scope === "team"
//       ? "All team members"
//       : createdBy
//         ? (getUserInfo(items[0] || { createdBy }).name)
//         : "My data";

//     summary.addRow({ field: "Scope", value: scopeText });
//     summary.addRow({ field: "Selected User ID", value: createdBy || "" });
//     summary.addRow({ field: "Search", value: search || "" });
//     summary.addRow({ field: "Category", value: category || "ALL" });
//     summary.addRow({ field: "Date Range", value: range || "ALL" });
//     summary.addRow({ field: "Total Records", value: items.length });
//     summary.addRow({ field: "Generated At", value: new Date() });
//     summary.getColumn(1).font = { bold: true };

//     const baseFields = [
//       "User Name", "User Email", "User ID", "Record ID", "Category",
//       "Account Type", "Project No", "Panel Code", "Description", "PID",
//       "Supplier ID", "Location", "IP", "Status", "Created At", "Updated At",
//     ];

//     const dynamicFields = new Set<string>();
//     items.forEach((item: any) => Object.keys(dataObject(item)).forEach((key) => dynamicFields.add(key)));
//     const columns = [...baseFields, ...Array.from(dynamicFields).sort()];

//     const safeSheetName = (name: string, used: Set<string>) => {
//       const cleaned = (name || "Unassigned").replace(/[\\/*?:\[\]]/g, " ").trim() || "Unassigned";
//       let candidate = cleaned.slice(0, 31);
//       let n = 2;
//       while (used.has(candidate.toLowerCase())) {
//         const suffix = ` ${n++}`;
//         candidate = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`;
//       }
//       used.add(candidate.toLowerCase());
//       return candidate;
//     };

//     const usedSheetNames = new Set<string>(["summary"]);

//     const addDataSheet = (sheetName: string, rows: any[]) => {
//       const ws = workbook.addWorksheet(sheetName);
//       ws.columns = columns.map((header) => ({ header, key: header, width: 18 }));

//       rows.forEach((item: any) => {
//         const u = getUserInfo(item);
//         const d = dataObject(item);
//         const row: Record<string, any> = {
//           "User Name": u.name,
//           "User Email": u.email,
//           "User ID": u.id,
//           "Record ID": excelValue(item._id),
//           "Category": item.category,
//           "Account Type": item.accountType,
//           "Project No": item.projectNo,
//           "Panel Code": item.panelCode,
//           "Description": item.description,
//           "PID": item.pid,
//           "Supplier ID": item.supplierId,
//           "Location": item.country,
//           "IP": item.ip,
//           "Status": item.status,
//           "Created At": excelValue(item.createdAt ? new Date(item.createdAt) : ""),
//           "Updated At": excelValue(item.updatedAt ? new Date(item.updatedAt) : ""),
//         };
//         Object.keys(d).forEach((key) => { row[key] = excelValue(d[key]); });
//         ws.addRow(row);
//       });

//       const header = ws.getRow(1);
//       header.height = 32;
//       header.eachCell((cell) => {
//         cell.font = { bold: true, size: 11 };
//         cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
//         cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
//       });

//       ws.eachRow((row, rowNumber) => {
//         if (rowNumber === 1) return;
//         row.height = 22;
//         row.eachCell((cell) => {
//           cell.alignment = { vertical: "middle", wrapText: true };
//           if (cell.value instanceof Date) cell.numFmt = "dd-mmm-yyyy hh:mm:ss";
//         });
//       });

//       if (rows.length > 0) {
//         ws.autoFilter = { from: "A1", to: { row: rows.length + 1, column: columns.length } };
//       }
//       ws.views = [{ state: "frozen", ySplit: 1 }];
//       columns.forEach((field, index) => {
//         let max = field.length;
//         rows.forEach((item: any) => {
//           const u = getUserInfo(item); const d = dataObject(item);
//           const values: Record<string, any> = {
//             "User Name": u.name, "User Email": u.email, "User ID": u.id,
//             "Record ID": item._id, "Category": item.category, "Account Type": item.accountType,
//             "Project No": item.projectNo, "Panel Code": item.panelCode, "Description": item.description,
//             "PID": item.pid, "Supplier ID": item.supplierId, "Location": item.country,
//             "IP": item.ip, "Status": item.status, "Created At": item.createdAt, "Updated At": item.updatedAt,
//             ...d,
//           };
//           max = Math.max(max, String(values[field] ?? "").length);
//         });
//         ws.getColumn(index + 1).width = Math.min(Math.max(max + 2, 12), 40);
//       });
//       ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
//       ws.pageSetup.printTitlesRow = "1:1";
//       return ws;
//     };

//     // Exactly the filtered records returned by the same server-side query
//     // are placed into All Data and then grouped into one sheet per user.
//     addDataSheet("All Data", items);

//     const grouped = new Map<string, any[]>();
//     items.forEach((item: any) => {
//       const u = getUserInfo(item);
//       const key = u.id || "unassigned";
//       if (!grouped.has(key)) grouped.set(key, []);
//       grouped.get(key)!.push(item);
//     });

//     for (const [key, rows] of grouped) {
//       const u = getUserInfo(rows[0]);
//       const sheetName = safeSheetName(u.name, usedSheetNames);
//       addDataSheet(sheetName, rows);
//     }

//     // =======================================================
//     // CREATE XLSX
//     // =======================================================

//     const buffer =
//       await workbook.xlsx.writeBuffer();


//     const filename =
//       `survey-${role}-${category || "all"}-${range || "all"}-${Date.now()}.xlsx`;

//     // AUDIT LOG
//     await createAuditLog({
//       userId: user.userId,
//       action: "EXPORT",
//       module: "Survey",
//       description: `Exported survey data XLSX report (${category || "All categories"}, ${range || "custom/all"})`,
//       entityType: "SurveyData",
//       metadata: {
//         category: category || "all",
//         range: range || "all",
//         startDate: startDate || null,
//         endDate: endDate || null,
//         teamId: requestedTeamId || null,
//         scope: scope || null,
//         createdBy: createdBy || null,
//         tzOffset,
//         totalRecords: items.length,
//       },
//     });


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

//   } catch (error) {
//     console.error(
//       "Survey export error:",
//       error
//     );

//     return NextResponse.json(
//       {
//         success: false,
//         message:
//           "Export failed",
//         error:
//           error instanceof Error
//             ? error.message
//             : String(error),
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

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import Auth from "@/models/Auth";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";
import { buildSurveySearchClause } from "@/lib/surveySearch";
import Team from "@/models/Team";



// =========================================================
// HELPERS
// =========================================================

function normalizeRole(role: unknown) {
  return String(role || "")
    .toLowerCase()
    .replace(/[-_\s]/g, "");
}

function toObjectId(value: unknown) {
  if (!value) return null;

  if (
    value instanceof mongoose.Types.ObjectId
  ) {
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


/**
 * Get the active users in the Team Lead's team.
 * The Team Lead himself is excluded.
 *
 * The current export route already uses Auth.teamId for
 * the Team Lead's team lookup, so this keeps the same
 * team relationship instead of introducing a new model
 * assumption.
 */
// async function getTeamMemberIdsForLead(
//   teamLeadId: mongoose.Types.ObjectId,
//   teamId: unknown
// ): Promise<mongoose.Types.ObjectId[]> {
//   const teamOid =
//     toObjectId(teamId);

//   if (!teamOid) {
//     return [];
//   }

//   const members =
//     await Auth.find(
//       {
//         teamId: teamOid,
//         _id: {
//           $ne: teamLeadId,
//         },
//         isDeleted: {
//           $ne: true,
//         },
//         isActive: {
//           $ne: false,
//         },
//       },
//       {
//         _id: 1,
//       }
//     ).lean();

//   return members.map(
//     (member) =>
//       member._id
//   );
// }

async function getTeamMemberIdsForLead(
  teamLeadId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
  const teams = await Team.find({ teamLead: teamLeadId, isActive: true })
    .select("members")
    .lean();

  const ids = new Set<string>();
  teams.forEach((t: any) =>
    (t.members || []).forEach((m: any) => ids.add(String(m)))
  );
  ids.delete(String(teamLeadId));

  return [...ids]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}
/**
 * Resolve Team Lead export scope.
 *
 * createdBy=<userId>
 *   -> Team Lead himself OR one of his team members.
 *
 * scope=team
 *   -> all team-member records.
 *
 * nothing specified
 *   -> Team Lead's own records.
 */
// async function resolveTeamLeadCreatedByFilter(
//   searchParams: URLSearchParams,
//   user: any,
//   userOid: mongoose.Types.ObjectId
// ): Promise<Record<string, any> | null> {
//   const scope =
//     searchParams.get(
//       "scope"
//     );

//   const createdBy =
//     searchParams.get(
//       "createdBy"
//     );

//   const teamMemberIds =
//     await getTeamMemberIdsForLead(
//       userOid,
//       user?.teamId
//     );

//   // Whole team.
//   if (scope === "team") {
//     return {
//       createdBy: {
//         $in: teamMemberIds,
//       },
//     };
//   }

//   // One person: Team Lead himself or a member
//   // of his team.
//   if (createdBy) {
//     const createdByOid =
//       toObjectId(
//         createdBy
//       );

//     if (!createdByOid) {
//       return null;
//     }

//     if (
//       createdByOid.toString() ===
//       userOid.toString()
//     ) {
//       return {
//         createdBy: userOid,
//       };
//     }

//     const isTeamMember =
//       teamMemberIds.some(
//         (id) =>
//           id.toString() ===
//           createdByOid.toString()
//       );

//     if (!isTeamMember) {
//       return null;
//     }

//     return {
//       createdBy: createdByOid,
//     };
//   }

//   // Default: Team Lead's own records.
//   return {
//     createdBy: userOid,
//   };
// }


// =========================================================
// DATE RANGE
// =========================================================

async function resolveTeamLeadCreatedByFilter(
  searchParams: URLSearchParams,
  user: any,
  userOid: mongoose.Types.ObjectId
): Promise<Record<string, any> | null> {
  const scope = searchParams.get("scope");
  const createdBy = searchParams.get("createdBy");

  // Same Team lookup as GET /api/survey (one argument only)
  const teamMemberIds = await getTeamMemberIdsForLead(userOid);

  // Whole team
  if (scope === "team") {
    return { createdBy: { $in: teamMemberIds } };
  }

  // One person: the Team Lead or one of his members
  if (createdBy) {
    const createdByOid = toObjectId(createdBy);
    if (!createdByOid) return null;

    if (createdByOid.toString() === userOid.toString()) {
      return { createdBy: userOid };
    }

    const isTeamMember = teamMemberIds.some(
      (id) => id.toString() === createdByOid.toString()
    );
    if (!isTeamMember) return null;

    return { createdBy: createdByOid };
  }

  // Default: own records
  return { createdBy: userOid };
}

function getDateRange(
  range: string | null,
  startDate: string | null,
  endDate: string | null,
  tzOffset: number = 0
) {
  const now = new Date();

  // -------------------------------------------------------
  // CUSTOM
  // -------------------------------------------------------
  //
  // startDate/endDate are YYYY-MM-DD in the user's local
  // timezone. tzOffset uses JavaScript's sign convention:
  // IST = -330.
  //
  // Example:
  // 2026-09-30 + -330 minutes
  // => 2026-09-29T18:30:00.000Z
  //
  // The custom end is exclusive, so the selected end date
  // includes the complete local day.

  if (range === "custom" && startDate && endDate) {
    const [sy, sm, sd] =
      startDate.split("-").map(Number);

    const [ey, em, ed] =
      endDate.split("-").map(Number);

    if (
      !sy ||
      !sm ||
      !sd ||
      !ey ||
      !em ||
      !ed ||
      !Number.isFinite(tzOffset)
    ) {
      return {
        start: null,
        end: null,
        exclusiveEnd: false,
        invalid: true,
      };
    }

    const start =
      new Date(
        Date.UTC(
          sy,
          sm - 1,
          sd
        ) +
          tzOffset * 60000
      );

    const end =
      new Date(
        Date.UTC(
          ey,
          em - 1,
          ed
        ) +
          tzOffset * 60000 +
          24 * 60 * 60 * 1000
      );

    return {
      start,
      end,
      exclusiveEnd: true,
      invalid: false,
    };
  }

  // -------------------------------------------------------
  // TODAY
  // -------------------------------------------------------

  if (range === "today") {
    const date =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "Asia/Kolkata",
        }
      ).format(now);

    return {
      start: new Date(
        `${date}T00:00:00+05:30`
      ),

      end: new Date(
        `${date}T23:59:59.999+05:30`
      ),

      exclusiveEnd: false,
      invalid: false,
    };
  }

  // -------------------------------------------------------
  // WEEKLY
  // Monday -> Sunday
  // -------------------------------------------------------

  if (range === "weekly") {
    const indiaNow =
      new Date(
        now.toLocaleString(
          "en-US",
          {
            timeZone:
              "Asia/Kolkata",
          }
        )
      );

    const day =
      indiaNow.getDay();

    const diff =
      day === 0
        ? 6
        : day - 1;

    const startLocal =
      new Date(indiaNow);

    startLocal.setDate(
      indiaNow.getDate() -
      diff
    );

    startLocal.setHours(
      0,
      0,
      0,
      0
    );

    const endLocal =
      new Date(startLocal);

    endLocal.setDate(
      startLocal.getDate() +
      6
    );

    endLocal.setHours(
      23,
      59,
      59,
      999
    );

    const start =
      new Date(
        startLocal.toLocaleString(
          "en-US",
          {
            timeZone:
              "Asia/Kolkata",
          }
        )
      );

    const end =
      new Date(
        endLocal.toLocaleString(
          "en-US",
          {
            timeZone:
              "Asia/Kolkata",
          }
        )
      );

    return {
      start,
      end,
      exclusiveEnd: false,
      invalid: false,
    };
  }

  // -------------------------------------------------------
  // MONTHLY
  // -------------------------------------------------------

  if (range === "monthly") {
    const indiaNow =
      new Date(
        now.toLocaleString(
          "en-US",
          {
            timeZone:
              "Asia/Kolkata",
          }
        )
      );

    const year =
      indiaNow.getFullYear();

    const month =
      indiaNow.getMonth();

    const startLocal =
      new Date(
        year,
        month,
        1,
        0,
        0,
        0,
        0
      );

    const endLocal =
      new Date(
        year,
        month + 1,
        0,
        23,
        59,
        59,
        999
      );

    const start =
      new Date(
        startLocal.toLocaleString(
          "en-US",
          {
            timeZone:
              "Asia/Kolkata",
          }
        )
      );

    const end =
      new Date(
        endLocal.toLocaleString(
          "en-US",
          {
            timeZone:
              "Asia/Kolkata",
          }
        )
      );

    return {
      start,
      end,
      exclusiveEnd: false,
      invalid: false,
    };
  }

  // -------------------------------------------------------
  // ALL
  // -------------------------------------------------------

  return {
    start: null,
    end: null,
    exclusiveEnd: false,
    invalid: false,
  };
}



// =========================================================
// EXCEL VALUE
// =========================================================

function excelValue(
  value: any
): any {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    value instanceof Date
  ) {
    return value;
  }

  if (
    typeof value ===
    "object"
  ) {
    // ObjectId
    if (
      value?._bsontype ===
      "ObjectId"
    ) {
      return value.toString();
    }

    // Map
    if (
      value instanceof Map
    ) {
      return JSON.stringify(
        Object.fromEntries(
          value
        )
      );
    }

    try {
      return JSON.stringify(
        value
      );
    } catch {
      return String(
        value
      );
    }
  }

  return value;
}


// =========================================================
// GET EXPORT
// =========================================================

export async function GET(
  req: NextRequest
) {
  try {
    await connectDB();

    // =======================================================
    // AUTHENTICATED USER
    // =======================================================

    const user =
      await getCurrentUser();

    if (!user?.userId) {
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
        user.role
      );

    const userOid =
      toObjectId(
        user.userId
      );

    if (!userOid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid logged-in user",
        },
        {
          status: 400,
        }
      );
    }


    // =======================================================
    // QUERY
    // =======================================================

    const {
      searchParams,
    } = new URL(
      req.url
    );

    const category =
      searchParams.get(
        "category"
      );

    const range =
      searchParams.get(
        "range"
      );

    const startDate =
      searchParams.get(
        "startDate"
      ) ||
      searchParams.get(
        "from"
      );

    const endDate =
      searchParams.get(
        "endDate"
      ) ||
      searchParams.get(
        "to"
      );

    const scope =
      searchParams.get(
        "scope"
      );

    const createdBy =
      searchParams.get(
        "createdBy"
      );

    const tzOffsetRaw =
      searchParams.get(
        "tzOffset"
      );

    const tzOffset =
      tzOffsetRaw === null
        ? 0
        : Number(tzOffsetRaw);

    const search =
      searchParams.get("search")?.trim() || "";

    /*
     * ONLY ADMIN / HR CAN SEND teamId.
     *
     * Survey users and Team Leads must NEVER
     * be allowed to choose another team.
     */
    const requestedTeamId =
      searchParams.get(
        "teamId"
      );


    // =======================================================
    // BASE FILTER
    // =======================================================

    const filter: any = {};


    // =======================================================
    // ROLE-BASED ACCESS
    // =======================================================

    // -------------------------------------------------------
    // SURVEY
    //
    // ONLY records created by this logged-in user
    // -------------------------------------------------------

    if (
      role === "survey" ||
      role === "surveytester"
    ) {
      // Survey Tester can export ONLY their own uploaded data
      filter.createdBy = userOid;
    }


    // -------------------------------------------------------
    // TEAM LEAD
    //
    // TEAM LEAD + ALL TEAM MEMBERS
    // -------------------------------------------------------

    else if (
      role === "teamlead"
    ) {
      /*
       * Team Lead export scope:
       *
       * createdBy=<userId>
       *   -> own records OR one of this lead's members.
       *
       * scope=team
       *   -> all records created by this lead's
       *      team members.
       *
       * no createdBy/scope
       *   -> own records.
       *
       * The requested createdBy is validated against
       * the logged-in Team Lead's own team.
       */
      const scopeFilter =
        await resolveTeamLeadCreatedByFilter(
          searchParams,
          user,
          userOid
        );

      if (!scopeFilter) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Forbidden",
          },
          {
            status: 403,
          }
        );
      }

      Object.assign(
        filter,
        scopeFilter
      );
    }


    // -------------------------------------------------------
    // ADMIN
    // HR
    //
    // Selected team only
    // -------------------------------------------------------

    else if (
      role === "admin" ||
      role === "hr"
    ) {
      if (
        requestedTeamId &&
        requestedTeamId !== "all"
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
                "Invalid teamId",
            },
            {
              status: 400,
            }
          );
        }

        /*
         * Get all users belonging to
         * selected team.
         */
        const teamUsers =
          await Auth.find(
            {
              teamId:
                teamOid,

              isDeleted: {
                $ne: true,
              },

              isActive: {
                $ne: false,
              },
            },
            {
              _id: 1,
            }
          ).lean();

        const memberIds =
          teamUsers.map(
            (member) =>
              member._id
          );

        if (
          memberIds.length === 0
        ) {
          filter.createdBy = {
            $in: [],
          };
        } else {
          filter.createdBy = {
            $in: memberIds,
          };
        }
      }
    }



    // -------------------------------------------------------
    // OTHER ROLES
    // -------------------------------------------------------

    else {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to export survey data",
        },
        {
          status: 403,
        }
      );
    }


    // =======================================================
    // CATEGORY
    // =======================================================

    if (
      category &&
      [
        "B2B",
        "B2H",
        "B2C",
      ].includes(
        category
      )
    ) {
      filter.category =
        category;
    }


    // =======================================================
    // SEARCH
    // =======================================================
    // Search works across survey fields AND the submitting user's
    // name/email/username. The user lookup is kept inside the already
    // authorized scope so a Team Lead cannot search/export another team.
    // if (search) {
    //   const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    //   const searchRegex = new RegExp(escapedSearch, "i");

    //   const userMatches = await Auth.find(
    //     {
    //       $or: [
    //         { name: searchRegex },
    //         { fullName: searchRegex },
    //         { username: searchRegex },
    //         { email: searchRegex },
    //       ],
    //       isDeleted: { $ne: true },
    //       isActive: { $ne: false },
    //     },
    //     { _id: 1 }
    //   ).lean();

    //   const matchingUserIds = userMatches.map((u: any) => u._id);

    //   const surveySearch: any[] = [
    //     { pid: searchRegex },
    //     { projectNo: searchRegex },
    //     { supplierId: searchRegex },
    //     { country: searchRegex },
    //     { accountType: searchRegex },
    //     { panelCode: searchRegex },
    //     { description: searchRegex },
    //     { ip: searchRegex },
    //     { status: searchRegex },
    //   ];

    //   if (matchingUserIds.length > 0) {
    //     surveySearch.push({ createdBy: { $in: matchingUserIds } });
    //   }

    //   surveySearch.push({
    //     $expr: {
    //       $gt: [
    //         {
    //           $size: {
    //             $filter: {
    //               input: { $objectToArray: { $ifNull: ["$data", {}] } },
    //               as: "field",
    //               cond: {
    //                 $or: [
    //                   {
    //                     $regexMatch: {
    //                       input: { $toString: "$$field.k" },
    //                       regex: escapedSearch,
    //                       options: "i",
    //                     },
    //                   },
    //                   {
    //                     $regexMatch: {
    //                       input: { $toString: "$$field.v" },
    //                       regex: escapedSearch,
    //                       options: "i",
    //                     },
    //                   },
    //                 ],
    //               },
    //             },
    //           },
    //         },
    //         0,
    //       ],
    //     },
    //   });

    //   filter.$or = surveySearch;
    // }

        // =======================================================
    // SEARCH (shared with GET /api/survey)
    // =======================================================

    const searchClause = await buildSurveySearchClause(search);
    if (searchClause) {
      filter.$and = [...(filter.$and || []), searchClause];
    }

    // =======================================================
    // DATE
    // =======================================================

    const dateRange =
      getDateRange(
        range,
        startDate,
        endDate,
        tzOffset
      );

    if (dateRange.invalid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid custom date range or tzOffset",
        },
        {
          status: 400,
        }
      );
    }

    const {
      start,
      end,
      exclusiveEnd,
    } = dateRange;

    if (
      start &&
      end
    ) {
      filter.createdAt =
        exclusiveEnd
          ? {
              $gte: start,
              $lt: end,
            }
          : {
              $gte: start,
              $lte: end,
            };
    }


    // =======================================================
    // DEBUG
    // =======================================================

    console.log(
      "=========================================="
    );

    console.log(
      "SURVEY EXPORT"
    );

    console.log(
      "USER:",
      user.userId
    );

    console.log(
      "ROLE:",
      user.role
    );

    console.log(
      "TEAM:",
      (user as any).teamId
    );

    console.log(
      "REQUESTED TEAM:",
      requestedTeamId
    );

    console.log(
      "SCOPE:",
      scope
    );

    console.log(
      "CREATED BY:",
      createdBy
    );

    console.log(
      "SEARCH:",
      search
    );

    console.log(
      "SCOPE:",
      scope
    );

    console.log(
      "CREATED BY:",
      createdBy
    );

    console.log(
      "TZ OFFSET:",
      tzOffset
    );

    console.log(
      "FILTER:",
      JSON.stringify(
        filter,
        null,
        2
      )
    );

    console.log(
      "=========================================="
    );


    // =======================================================
    // GET SURVEY DATA
    // =======================================================

    const items =
      await SurveyData.find(
        filter
      )
        .sort({
          createdAt: -1,
        })
        .lean();


    // =======================================================
    // WORKBOOK - FULL FILTERED SURVEY DATA
    // =======================================================

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Survey Data Module";
    workbook.created = new Date();
    workbook.modified = new Date();

    // -------------------------------------------------------
    // Resolve submitter/user information once
    // -------------------------------------------------------

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
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

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
      };
    };

    // -------------------------------------------------------
    // Normalize dynamic survey data
    // -------------------------------------------------------

    const dataObject = (item: any): Record<string, any> => {
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
    };

    // -------------------------------------------------------
    // Excel-safe values
    // -------------------------------------------------------

    const excelValue = (value: any): any => {
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
          try {
            return JSON.stringify(Object.fromEntries(value));
          } catch {
            return String(value);
          }
        }

        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      }

      return value;
    };

    // -------------------------------------------------------
    // Normalize field names for matching
    // -------------------------------------------------------

    const normalizeFieldName = (value: any): string =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

    const findDynamicValue = (
      data: Record<string, any>,
      possibleNames: string[]
    ): any => {
      const wanted = possibleNames.map(normalizeFieldName);

      for (const [key, value] of Object.entries(data)) {
        if (wanted.includes(normalizeFieldName(key))) {
          return value;
        }
      }

      return "";
    };

    const firstNonEmpty = (...values: any[]) => {
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
    };

    // -------------------------------------------------------
    // Collect EVERY dynamic survey field from ALL matching
    // records. This is important: search-filtered records
    // determine the Excel rows, while all their data fields
    // determine the Excel columns.
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // Main columns
    // -------------------------------------------------------

    const baseColumns = [
      "Category",
      "User Name",
      "User Email",
      "User ID",
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

      "Created At",
      "Updated At",
    ];

    // -------------------------------------------------------
    // Prevent duplicate dynamic columns
    // -------------------------------------------------------

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
      .sort((a, b) => a.localeCompare(b));

    const columns = [
      ...baseColumns,
      ...dynamicColumns,
    ];

    // -------------------------------------------------------
    // Create ONE main sheet containing the actual downloaded
    // survey records.
    //
    // No Summary sheet.
    // No filter metadata as the actual exported rows.
    // -------------------------------------------------------

    const ws = workbook.addWorksheet("Survey Data");

    ws.columns = columns.map((header) => ({
      header,
      key: header,
      width: 18,
    }));

    // -------------------------------------------------------
    // Add all filtered records
    // -------------------------------------------------------

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

      const row: Record<string, any> = {
        "Category": item.category || "",

        "User Name": user.name,
        "User Email": user.email,
        "User ID": user.id,

        "Record ID": excelValue(item._id),

        "Project Name": projectName,
        "Project No": item.projectNo || "",
        "Panel Code": item.panelCode || "",
        "Description": item.description || "",
        "Account Type": item.accountType || "",

        "Age": age,
        "Gender": gender,

        "Country": country,
        "Location": location,

        "Household Income": householdIncome,

        "Respondent ID": respondentId,

        "PID": item.pid || "",
        "Supplier ID": item.supplierId || "",

        "IP": item.ip || "",
        "Status": item.status || "",

        "TNX Project ID": tnxProjectId,
        "TNX ID": tnxId,

        "Created At": excelValue(
          item.createdAt
            ? new Date(item.createdAt)
            : ""
        ),

        "Updated At": excelValue(
          item.updatedAt
            ? new Date(item.updatedAt)
            : ""
        ),
      };

      // Add every remaining dynamic field exactly as stored.
      dynamicColumns.forEach((field) => {
        row[field] = excelValue(data[field]);
      });

      ws.addRow(row);
    });

    // -------------------------------------------------------
    // Header formatting
    // -------------------------------------------------------

    const header = ws.getRow(1);

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

    // -------------------------------------------------------
    // Data formatting
    // -------------------------------------------------------

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      row.height = 24;

      row.eachCell((cell) => {
        cell.alignment = {
          vertical: "middle",
          wrapText: true,
        };

        if (cell.value instanceof Date) {
          cell.numFmt = "dd-mmm-yyyy hh:mm:ss";
        }
      });
    });

    // -------------------------------------------------------
    // Excel filter
    // -------------------------------------------------------

    if (items.length > 0) {
      ws.autoFilter = {
        from: "A1",
        to: {
          row: items.length + 1,
          column: columns.length,
        },
      };
    }

    // -------------------------------------------------------
    // Freeze header
    // -------------------------------------------------------

    ws.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    // -------------------------------------------------------
    // Calculate useful column widths
    // -------------------------------------------------------

    columns.forEach((field, index) => {
      let maxLength = field.length;

      items.forEach((item: any) => {
        const user = getUserInfo(item);
        const data = dataObject(item);

        const valueMap: Record<string, any> = {
          "Category": item.category,
          "User Name": user.name,
          "User Email": user.email,
          "User ID": user.id,
          "Record ID": item._id,

          "Project Name": firstNonEmpty(
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
          ),

          "Project No": item.projectNo,
          "Panel Code": item.panelCode,
          "Description": item.description,
          "Account Type": item.accountType,

          "Age": findDynamicValue(data, ["Age"]),

          "Gender": findDynamicValue(data, [
            "Gender",
            "Sex",
          ]),

          "Country": firstNonEmpty(
            findDynamicValue(data, ["Country"]),
            item.country
          ),

          "Location": firstNonEmpty(
            findDynamicValue(data, ["Location"]),
            item.country
          ),

          "Household Income": findDynamicValue(data, [
            "Household Income",
            "HouseholdIncome",
            "Income",
            "Household Income per month",
          ]),

          "Respondent ID": firstNonEmpty(
            findDynamicValue(data, [
              "Respondent ID",
              "RespondentId",
              "RespondentID",
              "respondent_id",
            ]),
            item.respondentId,
            item.respondent_id
          ),

          "PID": item.pid,
          "Supplier ID": item.supplierId,
          "IP": item.ip,
          "Status": item.status,

          "TNX Project ID": firstNonEmpty(
            findDynamicValue(data, [
              "TNX Project ID",
              "TNX Project Id",
              "TNXProjectID",
              "tnxProjectId",
              "tnx_project_id",
            ]),
            item.tnxProjectId
          ),

          "TNX ID": firstNonEmpty(
            findDynamicValue(data, [
              "TNX ID",
              "TNX Id",
              "TNXID",
              "tnxId",
            ]),
            item.tnxId
          ),

          "Created At": item.createdAt,
          "Updated At": item.updatedAt,

          ...data,
        };

        maxLength = Math.max(
          maxLength,
          String(
            valueMap[field] ?? ""
          ).length
        );
      });

      ws.getColumn(index + 1).width =
        Math.min(
          Math.max(maxLength + 2, 12),
          45
        );
    });

    // -------------------------------------------------------
    // Print settings
    // -------------------------------------------------------

    ws.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    ws.pageSetup.printTitlesRow = "1:1";

    // =======================================================
    // CREATE XLSX
    // =======================================================

    const buffer =
      await workbook.xlsx.writeBuffer();

    // =======================================================
    // FILE NAME
    // =======================================================

    const searchSlug = search
      ? `-search-${search
          .replace(/[^a-zA-Z0-9_-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60)}`
      : "";

    const filename =
      `survey-${role}-${category || "all"}-${range || "all"}${searchSlug}-full-data-${Date.now()}.xlsx`;

    // =======================================================
    // AUDIT LOG
    // =======================================================

    await createAuditLog({
      userId: user.userId,

      action: "EXPORT",

      module: "Survey",

      description:
        `Exported full survey data XLSX report (${category || "All categories"}, ${range || "custom/all"})`,

      entityType: "SurveyData",

      metadata: {
        category: category || "all",
        range: range || "all",
        startDate: startDate || null,
        endDate: endDate || null,
        teamId: requestedTeamId || null,
        scope: scope || null,
        createdBy: createdBy || null,
        tzOffset,
        search: search || null,
        totalRecords: items.length,
      },
    });

    // =======================================================
    // DOWNLOAD XLSX
    // =======================================================

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

  } catch (error) {
    console.error(
      "Survey export error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Export failed",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}
