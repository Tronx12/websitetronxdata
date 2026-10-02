// import { NextRequest, NextResponse } from "next/server";
// import mongoose from "mongoose";

// import { connectDB } from "@/config/db";
// import SurveyData from "@/models/SurveyData";
// import Auth from "@/models/Auth";
// import { SurveyCategory } from "@/lib/survey-fields";
// import Team from "@/models/Team";
// import { getCurrentUser } from "@/lib/getuser";
// import { createAuditLog } from "@/lib/auditLog";
// import { normalizeSurveyWithGroq } from "@/lib/groqSurveyNormalizer";
// import { buildSurveySearchClause } from "@/lib/surveySearch";


// // ============================================================
// // VALID CATEGORIES
// // ============================================================

// const VALID_CATEGORIES: SurveyCategory[] = [
//   "B2B",
//   "B2H",
//   "B2C",
// ];


// // ============================================================
// // HELPERS
// // ============================================================

// function normalizeRole(role: unknown): string {
//   return String(role || "")
//     .trim()
//     .toLowerCase()
//     .replace(/[\s_-]+/g, "");
// }


// function isValidObjectId(
//   value: unknown
// ): boolean {
//   return (
//     typeof value === "string" &&
//     mongoose.Types.ObjectId.isValid(value)
//   );
// }


// function objectId(
//   value: string
// ): mongoose.Types.ObjectId {
//   return new mongoose.Types.ObjectId(value);
// }


// // ============================================================
// // POST - CREATE SURVEY RECORDS
// // ============================================================

// export async function POST(
//   req: NextRequest
// ) {
//   try {
//     await connectDB();

//     // ========================================================
//     // AUTHENTICATED USER
//     // ========================================================

//     const currentUser =
//       await getCurrentUser();

//     if (!currentUser?.userId) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Unauthorized",
//         },
//         {
//           status: 401,
//         }
//       );
//     }

//     if (
//       !isValidObjectId(
//         currentUser.userId
//       )
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "Invalid authenticated user ID",
//         },
//         {
//           status: 401,
//         }
//       );
//     }

//     const authenticatedUserId =
//       objectId(
//         currentUser.userId
//       );


//     // ========================================================
//     // REQUEST
//     // ========================================================

//     const body =
//       await req.json();

//     const category =
//       body?.category as
//         | SurveyCategory
//         | undefined;

//     const paste =
//       body?.paste;


//     // ========================================================
//     // CATEGORY
//     // ========================================================

//     if (
//       category &&
//       !VALID_CATEGORIES.includes(
//         category
//       )
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "Category must be one of B2B | B2H | B2C",
//         },
//         {
//           status: 400,
//         }
//       );
//     }


//     // ========================================================
//     // PASTE
//     // ========================================================

//     if (
//       typeof paste !== "string" ||
//       !paste.trim()
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "Paste data is required",
//         },
//         {
//           status: 400,
//         }
//       );
//     }


//     const fallbackCategory: SurveyCategory =
//       category &&
//       VALID_CATEGORIES.includes(
//         category
//       )
//         ? category
//         : "B2C";


//     // ========================================================
//     // GROQ AI NORMALIZATION
//     // ========================================================

//     let aiRecords: any[];

//     try {
//       const aiResult =
//         await normalizeSurveyWithGroq(
//           paste
//         );

//       if (
//         !aiResult ||
//         !Array.isArray(
//           aiResult.records
//         )
//       ) {
//         console.error(
//           "GROQ INVALID RESULT:",
//           aiResult
//         );

//         return NextResponse.json(
//           {
//             success: false,
//             message:
//               "AI returned an invalid record list.",
//           },
//           {
//             status: 502,
//           }
//         );
//       }

//       aiRecords =
//         aiResult.records;

//       console.log(
//         `GROQ: normalized ${aiRecords.length} record(s)`
//       );

//       if (
//         aiRecords.length === 0
//       ) {
//         return NextResponse.json(
//           {
//             success: false,
//             message:
//               "AI normalized the input, but returned no survey records.",
//           },
//           {
//             status: 400,
//           }
//         );
//       }

//     } catch (error: any) {
//       console.error(
//         "GROQ NORMALIZATION ERROR:",
//         error
//       );

//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "AI normalization failed",
//           error:
//             error?.message ||
//             "Unknown Groq error",
//         },
//         {
//           status: 502,
//         }
//       );
//     }


//     // ========================================================
//     // VALID RECORDS
//     // ========================================================

//     const validRecords =
//       aiRecords.filter(
//         (record: any) =>
//           record &&
//           typeof record === "object"
//       );

//     if (
//       validRecords.length === 0
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "Groq returned no usable survey records.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }


//     // ========================================================
//     // BATCH ID
//     // ========================================================

//     const batchId =
//       validRecords.length > 1
//         ? new mongoose.Types.ObjectId().toString()
//         : null;


//     // ========================================================
//     // BUILD MONGODB DOCUMENTS
//     // ========================================================

//     const documents =
//       validRecords.map(
//         (record: any) => {

//           const data: Record<
//             string,
//             string
//           > = {
//             ...(record.data &&
//             typeof record.data ===
//               "object"
//               ? record.data
//               : {}),
//           };


//           const addData = (
//             key: string,
//             value: unknown
//           ) => {
//             if (
//               value !== undefined &&
//               value !== null &&
//               String(value).trim() !== ""
//             ) {
//               data[key] =
//                 String(value);
//             }
//           };


//           // --------------------------------------------------
//           // RESPONDENT FIELDS
//           // --------------------------------------------------

//           addData(
//             "Age",
//             record.age
//           );

//           addData(
//             "Gender",
//             record.gender
//           );

//           addData(
//             "Job Title",
//             record.jobTitle
//           );

//           addData(
//             "Industry",
//             record.industry
//           );

//           addData(
//             "Zip code",
//             record.zipCode
//           );

//           addData(
//             "Department",
//             record.department
//           );

//           addData(
//             "Employees",
//             record.employees
//           );

//           addData(
//             "Brand",
//             record.brand
//           );

//           addData(
//             "Revenue",
//             record.revenue
//           );

//           addData(
//             "Company",
//             record.company
//           );

//           addData(
//             "Country",
//             record.country
//           );

//           addData(
//             "Nationality",
//             record.nationality
//           );

//           addData(
//             "Household Income",
//             record.householdIncome
//           );

//           addData(
//             "Oppo",
//             record.oppo
//           );

//           addData(
//             "Study Topic",
//             record.studyTopic
//           );

//           addData(
//             "Record ID",
//             record.recordId
//           );


//           // --------------------------------------------------
//           // TNX / LOCATION
//           // --------------------------------------------------

//           addData(
//             "TNX-ID",
//             record.tnxId
//           );

//           addData(
//             "Location",
//             record.location
//           );


//           // --------------------------------------------------
//           // CREATE DOCUMENT
//           // --------------------------------------------------

//           return {
//             category:
//               record.category ||
//               fallbackCategory,

//             accountType:
//               record.accountType ||
//               undefined,

//             projectNo:
//               record.projectNo ||
//               undefined,

//             panelCode:
//               record.panelCode ||
//               undefined,

//             description:
//               record.surveyName ||
//               record.description ||
//               undefined,

//             pid:
//               record.pid ||
//               undefined,

//             supplierId:
//               record.supplierId ||
//               undefined,

//             country:
//               record.country ||
//               record.location ||
//               undefined,

//             ip:
//               record.ip ||
//               undefined,

//             status:
//               record.status ||
//               undefined,

//             data,

//             // Original user input
//             rawPaste:
//               paste,

//             batchId,

//             // =================================================
//             // IMPORTANT
//             //
//             // NEVER take createdBy from req.body.
//             // Always use authenticated user.
//             // =================================================

//             createdBy:
//               authenticatedUserId,
//           };
//         }
//       );


//     // ========================================================
//     // SAFETY CHECK
//     // ========================================================

//     if (
//       !Array.isArray(documents) ||
//       documents.length === 0
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "No MongoDB documents were created from the AI records.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }


//     console.log(
//       `SURVEY: saving ${documents.length} document(s)`
//     );


//     // ========================================================
//     // SAVE
//     // ========================================================

//     const docs =
//       await SurveyData.insertMany(
//         documents
//       );


//     // ========================================================
//     // AUDIT LOG
//     // ========================================================

//     await createAuditLog({
//       userId:
//         currentUser.userId,

//       action:
//         "UPLOAD",

//       module:
//         "Survey",

//       description:
//         `Uploaded ${docs.length} survey record${
//           docs.length === 1
//             ? ""
//             : "s"
//         } using AI normalization`,

//       entityType:
//         "SurveyData",

//       entityId:
//         docs.length === 1
//           ? docs[0]._id.toString()
//           : batchId ||
//             undefined,

//       metadata: {
//         count:
//           docs.length,

//         categories: [
//           ...new Set(
//             docs.map(
//               (doc) =>
//                 doc.category
//             )
//           ),
//         ],

//         batchId,

//         aiNormalized:
//           true,
//       },
//     });


//     // ========================================================
//     // RESPONSE
//     // ========================================================

//     return NextResponse.json(
//       {
//         success: true,

//         message:
//           docs.length === 1
//             ? "1 record saved"
//             : `${docs.length} records saved`,

//         count:
//           docs.length,

//         errors: [],

//         aiNormalized:
//           true,

//         data:
//           docs.map(
//             (doc) => {
//               const object =
//                 doc.toObject();

//               return {
//                 ...object,
//                 data:
//                   object.data ||
//                   {},
//               };
//             }
//           ),
//       },
//       {
//         status: 201,
//       }
//     );

//   } catch (error: any) {

//     console.error(
//       "SURVEY POST ERROR:",
//       error
//     );


//     // ========================================================
//     // VALIDATION ERROR
//     // ========================================================

//     if (
//       error?.name ===
//       "ValidationError"
//     ) {
//       const validationErrors =
//         Object.entries(
//           error.errors || {}
//         ).map(
//           ([field, err]: [
//             string,
//             any
//           ]) => ({
//             field,

//             message:
//               err?.message ||
//               "Validation failed",

//             value:
//               err?.value,

//             kind:
//               err?.kind,
//           })
//         );

//       return NextResponse.json(
//         {
//           success: false,

//           message:
//             "Survey validation failed",

//           error:
//             error.message,

//           validationErrors,
//         },
//         {
//           status: 400,
//         }
//       );
//     }


//     // ========================================================
//     // CAST ERROR
//     // ========================================================

//     if (
//       error?.name ===
//       "CastError"
//     ) {
//       return NextResponse.json(
//         {
//           success: false,

//           message:
//             `Invalid value for ${error.path}`,

//           error:
//             error.message,

//           path:
//             error.path,

//           value:
//             error.value,
//         },
//         {
//           status: 400,
//         }
//       );
//     }


//     // ========================================================
//     // DUPLICATE
//     // ========================================================

//     if (
//       error?.code === 11000
//     ) {
//       return NextResponse.json(
//         {
//           success: false,

//           message:
//             "Duplicate survey record",

//           error:
//             error.message,

//           keyValue:
//             error.keyValue,
//         },
//         {
//           status: 409,
//         }
//       );
//     }


//     // ========================================================
//     // UNKNOWN
//     // ========================================================

//     return NextResponse.json(
//       {
//         success: false,

//         message:
//           "Failed to save survey data",

//         error:
//           error?.message ||
//           String(error),

//         name:
//           error?.name ||
//           "UnknownError",

//         code:
//           error?.code ||
//           null,
//       },
//       {
//         status: 500,
//       }
//     );
//   }
// }



// /* ======================================================
//    GET - FETCH SURVEY RECORDS
//    ====================================================== */

// export async function GET(req: NextRequest) {
//   try {
//     await connectDB();

//     /* ==================================================
//        AUTHENTICATED USER
//     ================================================== */

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

//     if (
//       !mongoose.Types.ObjectId.isValid(
//         currentUser.userId
//       )
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Invalid authenticated user ID",
//         },
//         { status: 401 }
//       );
//     }

//     const authenticatedUserId =
//       new mongoose.Types.ObjectId(
//         currentUser.userId
//       );

//     /* ==================================================
//        REQUEST PARAMETERS
//     ================================================== */

//     const { searchParams } = new URL(req.url);

//     const category =
//       searchParams.get("category");

//     const projectNo =
//       searchParams.get("projectNo");

//     const accountType =
//       searchParams.get("accountType");

//     const pid =
//       searchParams.get("pid");

//     const country =
//       searchParams.get("country");

//     const status =
//       searchParams.get("status");

//     const requestedCreatedBy =
//       searchParams.get("createdBy");

//     const requestedScope =
//       searchParams.get("scope") || "";

//     const excludeCreatedBy =
//       searchParams.get("excludeCreatedBy");

//     const includeUnassigned =
//       searchParams.get("includeUnassigned");

//     const sortBy =
//       searchParams.get("sortBy") ||
//       "createdAt";

//     const sortOrder =
//       searchParams.get("sortOrder") === "asc"
//         ? 1
//         : -1;

//     const search =
//       searchParams.get("search") || "";

//     const pageNumber = Number(
//       searchParams.get("page") || "1"
//     );

//     const limitNumber = Number(
//       searchParams.get("limit") || "20"
//     );

//     const page = Math.max(
//       1,
//       Number.isFinite(pageNumber)
//         ? pageNumber
//         : 1
//     );

//     const limit = Math.min(
//       100,
//       Math.max(
//         1,
//         Number.isFinite(limitNumber)
//           ? limitNumber
//           : 20
//       )
//     );

//     const skip =
//       (page - 1) * limit;

//     /* ==================================================
//        BASE FILTER
//     ================================================== */

//     const filter: any = {};

//     /* ==================================================
//        CATEGORY
//     ================================================== */

//     if (
//       category &&
//       VALID_CATEGORIES.includes(
//         category as SurveyCategory
//       )
//     ) {
//       filter.category = category;
//     }

//     /* ==================================================
//        PROJECT
//     ================================================== */

//     if (projectNo) {
//       filter.projectNo = projectNo;
//     }

//     /* ==================================================
//        ACCOUNT TYPE
//     ================================================== */

//     if (accountType) {
//       filter.accountType =
//         accountType.toUpperCase();
//     }

//     /* ==================================================
//        PID
//     ================================================== */

//     if (pid) {
//       filter.pid = pid;
//     }

//     /* ==================================================
//        COUNTRY
//     ================================================== */

//     if (country) {
//       filter.country = {
//         $regex: country,
//         $options: "i",
//       };
//     }

//     /* ==================================================
//        STATUS
//     ================================================== */

//     if (status) {
//       filter.status = {
//         $regex: status,
//         $options: "i",
//       };
//     }

//     /* ==================================================
//        TEAM LEAD AUTHORIZATION

//        MY_DATA:
//        - createdBy = logged-in Team Lead

//        TEAM_DATA + scope=team:
//        - createdBy = all members of the Team Lead's active team

//        TEAM_DATA + createdBy=<member>:
//        - createdBy = selected team member
//     ================================================== */

//     const normalizedCurrentRole = normalizeRole(currentUser.role);
//     const isTeamLead =
//       normalizedCurrentRole === "teamlead" ||
//       String(currentUser.role || "").toLowerCase() === "team-lead";

//     if (isTeamLead) {
//       const ownUserId = authenticatedUserId;

//       // My own data.
//       if (
//         requestedCreatedBy &&
//         mongoose.Types.ObjectId.isValid(requestedCreatedBy) &&
//         new mongoose.Types.ObjectId(requestedCreatedBy).equals(ownUserId)
//       ) {
//         filter.createdBy = ownUserId;
//       }

//       // "All team members" from the frontend.
//       else if (
//         requestedScope === "team" &&
//         !requestedCreatedBy
//       ) {
//         const teams = await Team.find({
//           teamLead: ownUserId,
//           isActive: true,
//         })
//           .select("members")
//           .lean();

//         const teamMemberIds = [
//           ...new Set(
//             teams.flatMap((team: any) =>
//               (team.members || []).map((memberId: any) =>
//                 String(memberId)
//               )
//             )
//           ),
//         ].filter((id) => mongoose.Types.ObjectId.isValid(id));

//         filter.createdBy = {
//           $in: teamMemberIds.map(
//             (id) => new mongoose.Types.ObjectId(id)
//           ),
//         };

//         console.log("TEAM DATA SCOPE:", {
//           teamLead: String(ownUserId),
//           teamMemberCount: teamMemberIds.length,
//         });
//       }

//       // One selected team member.
//       else if (requestedCreatedBy) {
//         if (
//           !mongoose.Types.ObjectId.isValid(
//             requestedCreatedBy
//           )
//         ) {
//           return NextResponse.json(
//             {
//               success: false,
//               message: "Invalid createdBy ObjectId",
//               createdBy: requestedCreatedBy,
//             },
//             { status: 400 }
//           );
//         }

//         const requestedCreatorId =
//           new mongoose.Types.ObjectId(requestedCreatedBy);

//         if (requestedCreatorId.equals(ownUserId)) {
//           filter.createdBy = ownUserId;
//         } else {
//           const teams = await Team.find({
//             teamLead: ownUserId,
//             isActive: true,
//           })
//             .select("members")
//             .lean();

//           const teamMemberIds = [
//             ...new Set(
//               teams.flatMap((team: any) =>
//                 (team.members || []).map((memberId: any) =>
//                   String(memberId)
//                 )
//               )
//             ),
//           ];

//           if (!teamMemberIds.includes(String(requestedCreatorId))) {
//             return NextResponse.json(
//               {
//                 success: false,
//                 message:
//                   "You can only view survey data submitted by members of your own team",
//               },
//               { status: 403 }
//             );
//           }

//           filter.createdBy = requestedCreatorId;
//         }
//       }

//       // Safe fallback: never expose team records accidentally.
//       else {
//         filter.createdBy = ownUserId;
//       }
//     }

//     /* ==================================================
//        ADMIN / HR / OTHER AUTHORIZED ROLES
       
//        Preserve normal createdBy filtering.
//     ================================================== */

//     else if (requestedCreatedBy) {
//       if (
//         !mongoose.Types.ObjectId.isValid(
//           requestedCreatedBy
//         )
//       ) {
//         return NextResponse.json(
//           {
//             success: false,
//             message:
//               "Invalid createdBy ObjectId",
//             createdBy:
//               requestedCreatedBy,
//           },
//           { status: 400 }
//         );
//       }

//       filter.createdBy =
//         new mongoose.Types.ObjectId(
//           requestedCreatedBy
//         );
//     }

//     /* ==================================================
//        EXCLUDE CREATOR
//     ================================================== */

//     if (
//       excludeCreatedBy &&
//       currentUser.role !== "team-lead"
//     ) {
//       if (
//         !mongoose.Types.ObjectId.isValid(
//           excludeCreatedBy
//         )
//       ) {
//         return NextResponse.json(
//           {
//             success: false,
//             message:
//               "Invalid excludeCreatedBy ObjectId",
//             excludeCreatedBy,
//           },
//           { status: 400 }
//         );
//       }

//       const excludedId =
//         new mongoose.Types.ObjectId(
//           excludeCreatedBy
//         );

//       /*
//        * If createdBy already exists, don't overwrite it.
//        *
//        * Otherwise apply the exclusion.
//        */
//       if (!filter.createdBy) {
//         if (
//           includeUnassigned ===
//           "true"
//         ) {
//           filter.$or = [
//             {
//               createdBy: null,
//             },
//             {
//               createdBy: {
//                 $ne: excludedId,
//               },
//             },
//           ];
//         } else {
//           filter.createdBy = {
//             $ne: excludedId,
//           };
//         }
//       }
//     }

// /* ==================================================
//    SEARCH
//    Searches:
//    - User name
//    - User email
//    - Full name
//    - Username
//    - IP
//    - Location
//    - Country
//    - PID
//    - Project
//    - Supplier ID
//    - Status
//    - Account Type
//    - Panel Code
//    - Description
//    - Dynamic survey fields
//    - Raw survey text
// ================================================== */

// // if (search.trim()) {
// //   const searchText = search.trim();

// //   /*
// //    * Escape regex characters.
// //    * This prevents searches such as:
// //    *   user.name
// //    *   user+name
// //    *   test()
// //    * from behaving like regex.
// //    */
// //   const escapedSearch = searchText.replace(
// //     /[.*+?^${}()|[\]\\]/g,
// //     "\\$&"
// //   );

// //   /*
// //    * Case-insensitive partial search.
// //    *
// //    * Example:
// //    *   Search: Shiv
// //    *
// //    * Matches:
// //    *   Shivam
// //    *   Shivam Agrahari
// //    *   shiv
// //    *   SHIVAM
// //    */
// //   const searchRegex = new RegExp(
// //     escapedSearch,
// //     "i"
// //   );

// //   /* ==================================================
// //      FIND USERS
// //   ================================================== */

// //   const matchingUsers = await Auth.find(
// //     {
// //       $or: [
// //         {
// //           name: searchRegex,
// //         },
// //         {
// //           fullName: searchRegex,
// //         },
// //         {
// //           username: searchRegex,
// //         },
// //         {
// //           email: searchRegex,
// //         },
// //         {
// //           firstName: searchRegex,
// //         },
// //         {
// //           lastName: searchRegex,
// //         },
// //         {
// //           displayName: searchRegex,
// //         },
// //       ],

// //       isDeleted: {
// //         $ne: true,
// //       },
// //     },
// //     {
// //       _id: 1,
// //     }
// //   ).lean();

// //   const matchingUserIds = matchingUsers.map(
// //     (user: any) => user._id
// //   );

// //   /* ==================================================
// //      SEARCH CONDITIONS
// //   ================================================== */

// //   const searchOr: any[] = [];

// //   /*
// //    * --------------------------------------------------
// //    * USER SEARCH
// //    * --------------------------------------------------
// //    *
// //    * IMPORTANT:
// //    * This searches Auth users and then searches
// //    * SurveyData.createdBy using their IDs.
// //    */
// //   if (matchingUserIds.length > 0) {
// //     searchOr.push({
// //       createdBy: {
// //         $in: matchingUserIds,
// //       },
// //     });
// //   }

// //   /*
// //    * --------------------------------------------------
// //    * NORMAL SURVEY FIELDS
// //    * --------------------------------------------------
// //    */

// //   searchOr.push(
// //     {
// //       rawPaste: searchRegex,
// //     },
// //     {
// //       pid: searchRegex,
// //     },
// //     {
// //       projectNo: searchRegex,
// //     },
// //     {
// //       supplierId: searchRegex,
// //     },
// //     {
// //       country: searchRegex,
// //     },
// //     {
// //       accountType: searchRegex,
// //     },
// //     {
// //       panelCode: searchRegex,
// //     },
// //     {
// //       description: searchRegex,
// //     },
// //     {
// //       ip: searchRegex,
// //     },
// //     {
// //       status: searchRegex,
// //     },

// //     {
// //       tnxProjectId: searchRegex,
// //     },
// //     {
// //       tnxProjectID: searchRegex,
// //     },
// //     {
// //       tnxId: searchRegex,
// //     },
// //     {
// //       parentId: searchRegex,
// //     },
// //     {
// //       parentID: searchRegex,
// //     },
// //     {
// //       childId: searchRegex,
// //     },
// //     {
// //       childID: searchRegex,
// //     },
// //     {
// //       respondentId: searchRegex,
// //     },
// //     {
// //       respondentID: searchRegex,
// //     },
// //     {
// //       respondent_id: searchRegex,
// //     }
// //   );

// //   /*
// //    * --------------------------------------------------
// //    * DYNAMIC SURVEY DATA
// //    * --------------------------------------------------
// //    *
// //    * Searches both:
// //    *
// //    *   field name
// //    *
// //    * and
// //    *
// //    *   field value
// //    *
// //    * Example:
// //    *
// //    *   Company: ABC
// //    *   Location: Delhi
// //    *   Gender: Male
// //    *
// //    * Search "Delhi" -> matches.
// //    */

// //   searchOr.push({
// //     $expr: {
// //       $gt: [
// //         {
// //           $size: {
// //             $filter: {
// //               input: {
// //                 $objectToArray: {
// //                   $ifNull: [
// //                     "$data",
// //                     {},
// //                   ],
// //                 },
// //               },

// //               as: "field",

// //               cond: {
// //                 $or: [
// //                   /*
// //                    * Field name
// //                    */
// //                   {
// //                     $regexMatch: {
// //                       input: {
// //                         $toString:
// //                           "$$field.k",
// //                       },

// //                       regex:
// //                         escapedSearch,

// //                       options: "i",
// //                     },
// //                   },

// //                   /*
// //                    * Field value
// //                    */
// //                   {
// //                     $regexMatch: {
// //                       input: {
// //                         $toString:
// //                           "$$field.v",
// //                       },

// //                       regex:
// //                         escapedSearch,

// //                       options: "i",
// //                     },
// //                   },
// //                 ],
// //               },
// //             },
// //           },
// //         },

// //         0,
// //       ],
// //     },
// //   });

// //   /* ==================================================
// //      PRESERVE EXISTING FILTERS
// //   ================================================== */

// //   const existingConditions: any[] = [];

// //   /*
// //    * Copy normal filters:
// //    *
// //    * category
// //    * projectNo
// //    * accountType
// //    * pid
// //    * country
// //    * status
// //    * createdBy
// //    * etc.
// //    */

// //   for (const [key, value] of Object.entries(
// //     filter
// //   )) {
// //     if (
// //       key !== "$or" &&
// //       key !== "$and"
// //     ) {
// //       existingConditions.push({
// //         [key]: value,
// //       });
// //     }
// //   }

// //   /*
// //    * Preserve an existing $or.
// //    *
// //    * This is important for:
// //    *
// //    * includeUnassigned
// //    * excludeCreatedBy
// //    * other filters
// //    */
// //   if (filter.$or) {
// //     existingConditions.push({
// //       $or: filter.$or,
// //     });
// //   }

// //   /*
// //    * Remove old logical operators before
// //    * rebuilding the final filter.
// //    */
// //   delete filter.$or;
// //   delete filter.$and;

// //   /*
// //    * FINAL QUERY:
// //    *
// //    * Existing security/filter conditions
// //    *
// //    * AND
// //    *
// //    * Search condition
// //    */
// //   filter.$and = [
// //     ...existingConditions,
// //     {
// //       $or: searchOr,
// //     },
// //   ];

// //   /* ==================================================
// //      DEBUG
// //   ================================================== */

// //   console.log(
// //     "======================================"
// //   );

// //   console.log(
// //     "SURVEY SEARCH:"
// //   );

// //   console.log(
// //     "Search text:",
// //     searchText
// //   );

// //   console.log(
// //     "Matching users:",
// //     matchingUserIds.map(
// //       (id: any) =>
// //         String(id)
// //     )
// //   );

// //   console.log(
// //     "Final filter:",
// //     JSON.stringify(
// //       filter,
// //       null,
// //       2
// //     )
// //   );

// //   console.log(
// //     "======================================"
// //   );
// // }

// const searchClause = await buildSurveySearchClause(search);
// if (searchClause) {
//   filter.$and = [...(filter.$and || []), searchClause];
// }


//     /* ==================================================
//        DATABASE QUERY
//     ================================================== */

//     console.log(
//       "===== SURVEY GET ====="
//     );

//     console.log(
//       "User:",
//       {
//         userId:
//           currentUser.userId,
//         role:
//           currentUser.role,
//       }
//     );

//     console.log(
//       "Requested createdBy:",
//       requestedCreatedBy
//     );

//     console.log(
//       "Final survey filter:",
//       JSON.stringify(
//         filter,
//         null,
//         2
//       )
//     );

//     const [
//       items,
//       total,
//     ] = await Promise.all([
//       SurveyData.find(filter)
//         .sort({
//           [sortBy]:
//             sortOrder,
//         })
//         .skip(skip)
//         .limit(limit)
//         .lean(),

//       SurveyData.countDocuments(
//         filter
//       ),
//     ]);

//     /* ==================================================
//        RESPONSE
//     ================================================== */

//     const data =
//       items.map(
//         (item: any) => ({
//           ...item,
//           data:
//             item.data || {},
//         })
//       );

//     return NextResponse.json({
//       success: true,

//       data,

//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages:
//           Math.ceil(
//             total / limit
//           ),
//       },
//     });
//   } catch (error: any) {
//     console.error(
//       "Survey GET error:",
//       error
//     );

//     return NextResponse.json(
//       {
//         success: false,
//         message:
//           "Failed to fetch survey data",
//         error:
//           error?.message ||
//           String(error),
//       },
//       { status: 500 }
//     );
//   }
// }


import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import Auth from "@/models/Auth";
import { SurveyCategory } from "@/lib/survey-fields";
import Team from "@/models/Team";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";
import { normalizeSurveyWithGroq } from "@/lib/groqSurveyNormalizer";
import { buildSurveySearchClause } from "@/lib/surveySearch";


// ============================================================
// VALID CATEGORIES
// ============================================================

const VALID_CATEGORIES: SurveyCategory[] = [
  "B2B",
  "B2H",
  "B2C",
];


// ============================================================
// HELPERS
// ============================================================

function normalizeRole(role: unknown): string {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}


function isValidObjectId(
  value: unknown
): boolean {
  return (
    typeof value === "string" &&
    mongoose.Types.ObjectId.isValid(value)
  );
}


function objectId(
  value: string
): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(value);
}


// ============================================================
// SURVEY BUSINESS DATE - INDIA / NIGHT SHIFT
// ============================================================
//
// Night shift:
//   01 Oct 2026 09:30 PM -> 02 Oct 2026 06:30 AM
//
// If a survey is submitted between 12:00 AM and 06:29 AM,
// it belongs to the previous calendar/login date.
//
// Example:
//   Login:  01 Oct 2026 10:00 PM
//   Submit: 02 Oct 2026 02:00 AM
//   Date:   01 Oct 2026  <- desired survey date
//
// We calculate this in Asia/Kolkata explicitly so the result
// does not depend on the server's timezone.
// ============================================================

function getSurveyBusinessDate(
  date = new Date()
): Date {
  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }
  );

  const parts = formatter.formatToParts(date);

  const getPart = (type: string): string => {
    return (
      parts.find((part) => part.type === type)?.value ||
      ""
    );
  };

  let year = Number(getPart("year"));
  let month = Number(getPart("month"));
  let day = Number(getPart("day"));
  const hour = Number(getPart("hour"));
  const minute = Number(getPart("minute"));

  if (
    !year ||
    !month ||
    !day
  ) {
    throw new Error(
      "Unable to calculate survey business date"
    );
  }

  const currentMinutes =
    hour * 60 + minute;

  // Night shift rollover is 06:30 AM.
  // Anything before 06:30 AM belongs to the previous
  // night's login/business date.
  if (currentMinutes < 6 * 60 + 30) {
    const previousDate = new Date(
      Date.UTC(year, month - 1, day)
    );

    previousDate.setUTCDate(
      previousDate.getUTCDate() - 1
    );

    year = previousDate.getUTCFullYear();
    month = previousDate.getUTCMonth() + 1;
    day = previousDate.getUTCDate();
  }

  // Store the business date as midnight UTC for the
  // calculated India calendar date. The frontend can then
  // format this date as the survey date.
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      0,
      0,
      0,
      0
    )
  );
}


// ============================================================
// POST - CREATE SURVEY RECORDS
// ============================================================

export async function POST(
  req: NextRequest
) {
  try {
    await connectDB();

    // ========================================================
    // AUTHENTICATED USER
    // ========================================================

    const currentUser =
      await getCurrentUser();

    if (!currentUser?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    if (
      !isValidObjectId(
        currentUser.userId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid authenticated user ID",
        },
        {
          status: 401,
        }
      );
    }

    const authenticatedUserId =
      objectId(
        currentUser.userId
      );


    // ========================================================
    // REQUEST
    // ========================================================

    const body =
      await req.json();

    const category =
      body?.category as
        | SurveyCategory
        | undefined;

    const paste =
      body?.paste;


    // ========================================================
    // CATEGORY
    // ========================================================

    if (
      category &&
      !VALID_CATEGORIES.includes(
        category
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category must be one of B2B | B2H | B2C",
        },
        {
          status: 400,
        }
      );
    }


    // ========================================================
    // PASTE
    // ========================================================

    if (
      typeof paste !== "string" ||
      !paste.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Paste data is required",
        },
        {
          status: 400,
        }
      );
    }


    const fallbackCategory: SurveyCategory =
      category &&
      VALID_CATEGORIES.includes(
        category
      )
        ? category
        : "B2C";


    // ========================================================
    // GROQ AI NORMALIZATION
    // ========================================================

    let aiRecords: any[];

    try {
      const aiResult =
        await normalizeSurveyWithGroq(
          paste
        );

      if (
        !aiResult ||
        !Array.isArray(
          aiResult.records
        )
      ) {
        console.error(
          "GROQ INVALID RESULT:",
          aiResult
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "AI returned an invalid record list.",
          },
          {
            status: 502,
          }
        );
      }

      aiRecords =
        aiResult.records;

      console.log(
        `GROQ: normalized ${aiRecords.length} record(s)`
      );

      if (
        aiRecords.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "AI normalized the input, but returned no survey records.",
          },
          {
            status: 400,
          }
        );
      }

    } catch (error: any) {
      console.error(
        "GROQ NORMALIZATION ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "AI normalization failed",
          error:
            error?.message ||
            "Unknown Groq error",
        },
        {
          status: 502,
        }
      );
    }


    // ========================================================
    // VALID RECORDS
    // ========================================================

    const validRecords =
      aiRecords.filter(
        (record: any) =>
          record &&
          typeof record === "object"
      );

    if (
      validRecords.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Groq returned no usable survey records.",
        },
        {
          status: 400,
        }
      );
    }


    // ========================================================
    // BATCH ID
    // ========================================================

    const batchId =
      validRecords.length > 1
        ? new mongoose.Types.ObjectId().toString()
        : null;


    // ========================================================
    // SURVEY BUSINESS DATE
    // ========================================================
    //
    // Keep the user's night-shift date instead of the
    // calendar date after midnight.
    //
    // Example:
    //   01 Oct login -> 02 Oct 02:00 AM submit
    //   survey date = 01 Oct
    // ========================================================

    const surveyBusinessDate =
      getSurveyBusinessDate();


    // ========================================================
    // BUILD MONGODB DOCUMENTS
    // ========================================================

    const documents =
      validRecords.map(
        (record: any) => {

          const data: Record<
            string,
            string
          > = {
            ...(record.data &&
            typeof record.data ===
              "object"
              ? record.data
              : {}),
          };


          const addData = (
            key: string,
            value: unknown
          ) => {
            if (
              value !== undefined &&
              value !== null &&
              String(value).trim() !== ""
            ) {
              data[key] =
                String(value);
            }
          };


          // --------------------------------------------------
          // RESPONDENT FIELDS
          // --------------------------------------------------

          addData(
            "Age",
            record.age
          );

          addData(
            "Gender",
            record.gender
          );

          addData(
            "Job Title",
            record.jobTitle
          );

          addData(
            "Industry",
            record.industry
          );

          addData(
            "Zip code",
            record.zipCode
          );

          addData(
            "Department",
            record.department
          );

          addData(
            "Employees",
            record.employees
          );

          addData(
            "Brand",
            record.brand
          );

          addData(
            "Revenue",
            record.revenue
          );

          addData(
            "Company",
            record.company
          );

          addData(
            "Country",
            record.country
          );

          addData(
            "Nationality",
            record.nationality
          );

          addData(
            "Household Income",
            record.householdIncome
          );

          addData(
            "Oppo",
            record.oppo
          );

          addData(
            "Study Topic",
            record.studyTopic
          );

          addData(
            "Record ID",
            record.recordId
          );


          // --------------------------------------------------
          // TNX / LOCATION
          // --------------------------------------------------

          addData(
            "TNX-ID",
            record.tnxId
          );

          addData(
            "Location",
            record.location
          );


          // --------------------------------------------------
          // CREATE DOCUMENT
          // --------------------------------------------------

          return {
            category:
              record.category ||
              fallbackCategory,

            accountType:
              record.accountType ||
              undefined,

            projectNo:
              record.projectNo ||
              undefined,

            panelCode:
              record.panelCode ||
              undefined,

            description:
              record.surveyName ||
              record.description ||
              undefined,

            pid:
              record.pid ||
              undefined,

            supplierId:
              record.supplierId ||
              undefined,

            country:
              record.country ||
              record.location ||
              undefined,

            ip:
              record.ip ||
              undefined,

            status:
              record.status ||
              undefined,

            data,

            // Original user input
            rawPaste:
              paste,

            batchId,

            // =================================================
            // IMPORTANT
            //
            // NEVER take createdBy from req.body.
            // Always use authenticated user.
            // =================================================

            createdBy:
              authenticatedUserId,

            // =================================================
            // IMPORTANT: NIGHT SHIFT SURVEY DATE
            // =================================================
            //
            // Do NOT let the automatic submission timestamp
            // change the displayed survey date after midnight.
            //
            // Example:
            //   Actual submit: 02 Oct 2026 02:00 AM
            //   Survey date:    01 Oct 2026
            //
            // This intentionally stores the night-shift business
            // date in createdAt so existing frontend code that
            // displays createdAt will also show 01 Oct.
            // =================================================

            createdAt:
              surveyBusinessDate,
          };
        }
      );


    // ========================================================
    // SAFETY CHECK
    // ========================================================

    if (
      !Array.isArray(documents) ||
      documents.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No MongoDB documents were created from the AI records.",
        },
        {
          status: 400,
        }
      );
    }


    console.log(
      `SURVEY: saving ${documents.length} document(s)`
    );


    // ========================================================
    // SAVE
    // ========================================================

    const docs =
      await SurveyData.insertMany(
        documents
      );


    // ========================================================
    // AUDIT LOG
    // ========================================================

    await createAuditLog({
      userId:
        currentUser.userId,

      action:
        "UPLOAD",

      module:
        "Survey",

      description:
        `Uploaded ${docs.length} survey record${
          docs.length === 1
            ? ""
            : "s"
        } using AI normalization`,

      entityType:
        "SurveyData",

      entityId:
        docs.length === 1
          ? docs[0]._id.toString()
          : batchId ||
            undefined,

      metadata: {
        count:
          docs.length,

        categories: [
          ...new Set(
            docs.map(
              (doc) =>
                doc.category
            )
          ),
        ],

        batchId,

        aiNormalized:
          true,
      },
    });


    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        message:
          docs.length === 1
            ? "1 record saved"
            : `${docs.length} records saved`,

        count:
          docs.length,

        errors: [],

        aiNormalized:
          true,

        data:
          docs.map(
            (doc) => {
              const object =
                doc.toObject();

              return {
                ...object,
                data:
                  object.data ||
                  {},
              };
            }
          ),
      },
      {
        status: 201,
      }
    );

  } catch (error: any) {

    console.error(
      "SURVEY POST ERROR:",
      error
    );


    // ========================================================
    // VALIDATION ERROR
    // ========================================================

    if (
      error?.name ===
      "ValidationError"
    ) {
      const validationErrors =
        Object.entries(
          error.errors || {}
        ).map(
          ([field, err]: [
            string,
            any
          ]) => ({
            field,

            message:
              err?.message ||
              "Validation failed",

            value:
              err?.value,

            kind:
              err?.kind,
          })
        );

      return NextResponse.json(
        {
          success: false,

          message:
            "Survey validation failed",

          error:
            error.message,

          validationErrors,
        },
        {
          status: 400,
        }
      );
    }


    // ========================================================
    // CAST ERROR
    // ========================================================

    if (
      error?.name ===
      "CastError"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            `Invalid value for ${error.path}`,

          error:
            error.message,

          path:
            error.path,

          value:
            error.value,
        },
        {
          status: 400,
        }
      );
    }


    // ========================================================
    // DUPLICATE
    // ========================================================

    if (
      error?.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Duplicate survey record",

          error:
            error.message,

          keyValue:
            error.keyValue,
        },
        {
          status: 409,
        }
      );
    }


    // ========================================================
    // UNKNOWN
    // ========================================================

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to save survey data",

        error:
          error?.message ||
          String(error),

        name:
          error?.name ||
          "UnknownError",

        code:
          error?.code ||
          null,
      },
      {
        status: 500,
      }
    );
  }
}



/* ======================================================
   GET - FETCH SURVEY RECORDS
   ====================================================== */

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    /* ==================================================
       AUTHENTICATED USER
    ================================================== */

    const currentUser = await getCurrentUser();

    if (!currentUser?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        currentUser.userId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid authenticated user ID",
        },
        { status: 401 }
      );
    }

    const authenticatedUserId =
      new mongoose.Types.ObjectId(
        currentUser.userId
      );

    /* ==================================================
       REQUEST PARAMETERS
    ================================================== */

    const { searchParams } = new URL(req.url);

    const category =
      searchParams.get("category");

    const projectNo =
      searchParams.get("projectNo");

    const accountType =
      searchParams.get("accountType");

    const pid =
      searchParams.get("pid");

    const country =
      searchParams.get("country");

    const status =
      searchParams.get("status");

    const requestedCreatedBy =
      searchParams.get("createdBy");

    const requestedScope =
      searchParams.get("scope") || "";

    const excludeCreatedBy =
      searchParams.get("excludeCreatedBy");

    const includeUnassigned =
      searchParams.get("includeUnassigned");

    const sortBy =
      searchParams.get("sortBy") ||
      "createdAt";

    const sortOrder =
      searchParams.get("sortOrder") === "asc"
        ? 1
        : -1;

    const search =
      searchParams.get("search") || "";

    const pageNumber = Number(
      searchParams.get("page") || "1"
    );

    const limitNumber = Number(
      searchParams.get("limit") || "20"
    );

    const page = Math.max(
      1,
      Number.isFinite(pageNumber)
        ? pageNumber
        : 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.isFinite(limitNumber)
          ? limitNumber
          : 20
      )
    );

    const skip =
      (page - 1) * limit;

    /* ==================================================
       BASE FILTER
    ================================================== */

    const filter: any = {};

    /* ==================================================
       CATEGORY
    ================================================== */

    if (
      category &&
      VALID_CATEGORIES.includes(
        category as SurveyCategory
      )
    ) {
      filter.category = category;
    }

    /* ==================================================
       PROJECT
    ================================================== */

    if (projectNo) {
      filter.projectNo = projectNo;
    }

    /* ==================================================
       ACCOUNT TYPE
    ================================================== */

    if (accountType) {
      filter.accountType =
        accountType.toUpperCase();
    }

    /* ==================================================
       PID
    ================================================== */

    if (pid) {
      filter.pid = pid;
    }

    /* ==================================================
       COUNTRY
    ================================================== */

    if (country) {
      filter.country = {
        $regex: country,
        $options: "i",
      };
    }

    /* ==================================================
       STATUS
    ================================================== */

    if (status) {
      filter.status = {
        $regex: status,
        $options: "i",
      };
    }

    /* ==================================================
       TEAM LEAD AUTHORIZATION

       MY_DATA:
       - createdBy = logged-in Team Lead

       TEAM_DATA + scope=team:
       - createdBy = all members of the Team Lead's active team

       TEAM_DATA + createdBy=<member>:
       - createdBy = selected team member
    ================================================== */

    const normalizedCurrentRole = normalizeRole(currentUser.role);
    const isTeamLead =
      normalizedCurrentRole === "teamlead" ||
      String(currentUser.role || "").toLowerCase() === "team-lead";

    if (isTeamLead) {
      const ownUserId = authenticatedUserId;

      // My own data.
      if (
        requestedCreatedBy &&
        mongoose.Types.ObjectId.isValid(requestedCreatedBy) &&
        new mongoose.Types.ObjectId(requestedCreatedBy).equals(ownUserId)
      ) {
        filter.createdBy = ownUserId;
      }

      // "All team members" from the frontend.
      else if (
        requestedScope === "team" &&
        !requestedCreatedBy
      ) {
        const teams = await Team.find({
          teamLead: ownUserId,
          isActive: true,
        })
          .select("members")
          .lean();

        const teamMemberIds = [
          ...new Set(
            teams.flatMap((team: any) =>
              (team.members || []).map((memberId: any) =>
                String(memberId)
              )
            )
          ),
        ].filter((id) => mongoose.Types.ObjectId.isValid(id));

        filter.createdBy = {
          $in: teamMemberIds.map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        };

        console.log("TEAM DATA SCOPE:", {
          teamLead: String(ownUserId),
          teamMemberCount: teamMemberIds.length,
        });
      }

      // One selected team member.
      else if (requestedCreatedBy) {
        if (
          !mongoose.Types.ObjectId.isValid(
            requestedCreatedBy
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid createdBy ObjectId",
              createdBy: requestedCreatedBy,
            },
            { status: 400 }
          );
        }

        const requestedCreatorId =
          new mongoose.Types.ObjectId(requestedCreatedBy);

        if (requestedCreatorId.equals(ownUserId)) {
          filter.createdBy = ownUserId;
        } else {
          const teams = await Team.find({
            teamLead: ownUserId,
            isActive: true,
          })
            .select("members")
            .lean();

          const teamMemberIds = [
            ...new Set(
              teams.flatMap((team: any) =>
                (team.members || []).map((memberId: any) =>
                  String(memberId)
                )
              )
            ),
          ];

          if (!teamMemberIds.includes(String(requestedCreatorId))) {
            return NextResponse.json(
              {
                success: false,
                message:
                  "You can only view survey data submitted by members of your own team",
              },
              { status: 403 }
            );
          }

          filter.createdBy = requestedCreatorId;
        }
      }

      // Safe fallback: never expose team records accidentally.
      else {
        filter.createdBy = ownUserId;
      }
    }

    /* ==================================================
       ADMIN / HR / OTHER AUTHORIZED ROLES
       
       Preserve normal createdBy filtering.
    ================================================== */

    else if (requestedCreatedBy) {
      if (
        !mongoose.Types.ObjectId.isValid(
          requestedCreatedBy
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid createdBy ObjectId",
            createdBy:
              requestedCreatedBy,
          },
          { status: 400 }
        );
      }

      filter.createdBy =
        new mongoose.Types.ObjectId(
          requestedCreatedBy
        );
    }

    /* ==================================================
       EXCLUDE CREATOR
    ================================================== */

    if (
      excludeCreatedBy &&
      currentUser.role !== "team-lead"
    ) {
      if (
        !mongoose.Types.ObjectId.isValid(
          excludeCreatedBy
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid excludeCreatedBy ObjectId",
            excludeCreatedBy,
          },
          { status: 400 }
        );
      }

      const excludedId =
        new mongoose.Types.ObjectId(
          excludeCreatedBy
        );

      /*
       * If createdBy already exists, don't overwrite it.
       *
       * Otherwise apply the exclusion.
       */
      if (!filter.createdBy) {
        if (
          includeUnassigned ===
          "true"
        ) {
          filter.$or = [
            {
              createdBy: null,
            },
            {
              createdBy: {
                $ne: excludedId,
              },
            },
          ];
        } else {
          filter.createdBy = {
            $ne: excludedId,
          };
        }
      }
    }

/* ==================================================
   SEARCH
   Searches:
   - User name
   - User email
   - Full name
   - Username
   - IP
   - Location
   - Country
   - PID
   - Project
   - Supplier ID
   - Status
   - Account Type
   - Panel Code
   - Description
   - Dynamic survey fields
   - Raw survey text
================================================== */

// if (search.trim()) {
//   const searchText = search.trim();

//   /*
//    * Escape regex characters.
//    * This prevents searches such as:
//    *   user.name
//    *   user+name
//    *   test()
//    * from behaving like regex.
//    */
//   const escapedSearch = searchText.replace(
//     /[.*+?^${}()|[\]\\]/g,
//     "\\$&"
//   );

//   /*
//    * Case-insensitive partial search.
//    *
//    * Example:
//    *   Search: Shiv
//    *
//    * Matches:
//    *   Shivam
//    *   Shivam Agrahari
//    *   shiv
//    *   SHIVAM
//    */
//   const searchRegex = new RegExp(
//     escapedSearch,
//     "i"
//   );

//   /* ==================================================
//      FIND USERS
//   ================================================== */

//   const matchingUsers = await Auth.find(
//     {
//       $or: [
//         {
//           name: searchRegex,
//         },
//         {
//           fullName: searchRegex,
//         },
//         {
//           username: searchRegex,
//         },
//         {
//           email: searchRegex,
//         },
//         {
//           firstName: searchRegex,
//         },
//         {
//           lastName: searchRegex,
//         },
//         {
//           displayName: searchRegex,
//         },
//       ],

//       isDeleted: {
//         $ne: true,
//       },
//     },
//     {
//       _id: 1,
//     }
//   ).lean();

//   const matchingUserIds = matchingUsers.map(
//     (user: any) => user._id
//   );

//   /* ==================================================
//      SEARCH CONDITIONS
//   ================================================== */

//   const searchOr: any[] = [];

//   /*
//    * --------------------------------------------------
//    * USER SEARCH
//    * --------------------------------------------------
//    *
//    * IMPORTANT:
//    * This searches Auth users and then searches
//    * SurveyData.createdBy using their IDs.
//    */
//   if (matchingUserIds.length > 0) {
//     searchOr.push({
//       createdBy: {
//         $in: matchingUserIds,
//       },
//     });
//   }

//   /*
//    * --------------------------------------------------
//    * NORMAL SURVEY FIELDS
//    * --------------------------------------------------
//    */

//   searchOr.push(
//     {
//       rawPaste: searchRegex,
//     },
//     {
//       pid: searchRegex,
//     },
//     {
//       projectNo: searchRegex,
//     },
//     {
//       supplierId: searchRegex,
//     },
//     {
//       country: searchRegex,
//     },
//     {
//       accountType: searchRegex,
//     },
//     {
//       panelCode: searchRegex,
//     },
//     {
//       description: searchRegex,
//     },
//     {
//       ip: searchRegex,
//     },
//     {
//       status: searchRegex,
//     },

//     {
//       tnxProjectId: searchRegex,
//     },
//     {
//       tnxProjectID: searchRegex,
//     },
//     {
//       tnxId: searchRegex,
//     },
//     {
//       parentId: searchRegex,
//     },
//     {
//       parentID: searchRegex,
//     },
//     {
//       childId: searchRegex,
//     },
//     {
//       childID: searchRegex,
//     },
//     {
//       respondentId: searchRegex,
//     },
//     {
//       respondentID: searchRegex,
//     },
//     {
//       respondent_id: searchRegex,
//     }
//   );

//   /*
//    * --------------------------------------------------
//    * DYNAMIC SURVEY DATA
//    * --------------------------------------------------
//    *
//    * Searches both:
//    *
//    *   field name
//    *
//    * and
//    *
//    *   field value
//    *
//    * Example:
//    *
//    *   Company: ABC
//    *   Location: Delhi
//    *   Gender: Male
//    *
//    * Search "Delhi" -> matches.
//    */

//   searchOr.push({
//     $expr: {
//       $gt: [
//         {
//           $size: {
//             $filter: {
//               input: {
//                 $objectToArray: {
//                   $ifNull: [
//                     "$data",
//                     {},
//                   ],
//                 },
//               },

//               as: "field",

//               cond: {
//                 $or: [
//                   /*
//                    * Field name
//                    */
//                   {
//                     $regexMatch: {
//                       input: {
//                         $toString:
//                           "$$field.k",
//                       },

//                       regex:
//                         escapedSearch,

//                       options: "i",
//                     },
//                   },

//                   /*
//                    * Field value
//                    */
//                   {
//                     $regexMatch: {
//                       input: {
//                         $toString:
//                           "$$field.v",
//                       },

//                       regex:
//                         escapedSearch,

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

//   /* ==================================================
//      PRESERVE EXISTING FILTERS
//   ================================================== */

//   const existingConditions: any[] = [];

//   /*
//    * Copy normal filters:
//    *
//    * category
//    * projectNo
//    * accountType
//    * pid
//    * country
//    * status
//    * createdBy
//    * etc.
//    */

//   for (const [key, value] of Object.entries(
//     filter
//   )) {
//     if (
//       key !== "$or" &&
//       key !== "$and"
//     ) {
//       existingConditions.push({
//         [key]: value,
//       });
//     }
//   }

//   /*
//    * Preserve an existing $or.
//    *
//    * This is important for:
//    *
//    * includeUnassigned
//    * excludeCreatedBy
//    * other filters
//    */
//   if (filter.$or) {
//     existingConditions.push({
//       $or: filter.$or,
//     });
//   }

//   /*
//    * Remove old logical operators before
//    * rebuilding the final filter.
//    */
//   delete filter.$or;
//   delete filter.$and;

//   /*
//    * FINAL QUERY:
//    *
//    * Existing security/filter conditions
//    *
//    * AND
//    *
//    * Search condition
//    */
//   filter.$and = [
//     ...existingConditions,
//     {
//       $or: searchOr,
//     },
//   ];

//   /* ==================================================
//      DEBUG
//   ================================================== */

//   console.log(
//     "======================================"
//   );

//   console.log(
//     "SURVEY SEARCH:"
//   );

//   console.log(
//     "Search text:",
//     searchText
//   );

//   console.log(
//     "Matching users:",
//     matchingUserIds.map(
//       (id: any) =>
//         String(id)
//     )
//   );

//   console.log(
//     "Final filter:",
//     JSON.stringify(
//       filter,
//       null,
//       2
//     )
//   );

//   console.log(
//     "======================================"
//   );
// }

const searchClause = await buildSurveySearchClause(search);
if (searchClause) {
  filter.$and = [...(filter.$and || []), searchClause];
}


    /* ==================================================
       DATABASE QUERY
    ================================================== */

    console.log(
      "===== SURVEY GET ====="
    );

    console.log(
      "User:",
      {
        userId:
          currentUser.userId,
        role:
          currentUser.role,
      }
    );

    console.log(
      "Requested createdBy:",
      requestedCreatedBy
    );

    console.log(
      "Final survey filter:",
      JSON.stringify(
        filter,
        null,
        2
      )
    );

    const [
      items,
      total,
    ] = await Promise.all([
      SurveyData.find(filter)
        .sort({
          [sortBy]:
            sortOrder,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      SurveyData.countDocuments(
        filter
      ),
    ]);

    /* ==================================================
       RESPONSE
    ================================================== */

    const data =
      items.map(
        (item: any) => ({
          ...item,
          data:
            item.data || {},
        })
      );

    return NextResponse.json({
      success: true,

      data,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    });
  } catch (error: any) {
    console.error(
      "Survey GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch survey data",
        error:
          error?.message ||
          String(error),
      },
      { status: 500 }
    );
  }
}