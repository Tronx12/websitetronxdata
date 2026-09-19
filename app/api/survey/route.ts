// // import { NextRequest, NextResponse } from "next/server";
// // import mongoose from "mongoose";

// // import { connectDB } from "@/config/db";
// // import SurveyData from "@/models/SurveyData";
// // import { parseBulkPaste } from "@/lib/parseSurveyBulk";
// // import { SurveyCategory } from "@/lib/survey-fields";
// // import { getCurrentUser } from "@/lib/getuser";
// // import { createAuditLog } from "@/lib/auditLog";

// // const VALID_CATEGORIES: SurveyCategory[] = [
// //   "B2B",
// //   "B2H",
// //   "B2C",
// // ];

// // export async function POST(req: NextRequest) {
// //   try {
// //     await connectDB();

// //     /* ============================================
// //        AUTHENTICATED USER
// //     ============================================ */

// //     const currentUser = await getCurrentUser();

// //     if (!currentUser?.userId) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           message: "Unauthorized",
// //         },
// //         { status: 401 }
// //       );
// //     }

// //     if (
// //       !mongoose.Types.ObjectId.isValid(
// //         currentUser.userId
// //       )
// //     ) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           message: "Invalid authenticated user ID",
// //         },
// //         { status: 401 }
// //       );
// //     }

// //     const authenticatedUserId =
// //       new mongoose.Types.ObjectId(
// //         currentUser.userId
// //       );

// //     /* ============================================
// //        REQUEST
// //     ============================================ */

// //     const body = await req.json();

// //     const category =
// //       body?.category as
// //         | SurveyCategory
// //         | undefined;

// //     const paste = body?.paste;

// //     /* ============================================
// //        CATEGORY
// //     ============================================ */

// //     if (
// //       category &&
// //       !VALID_CATEGORIES.includes(category)
// //     ) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           message:
// //             "Category must be one of B2B | B2H | B2C",
// //         },
// //         { status: 400 }
// //       );
// //     }

// //     /* ============================================
// //        PASTE
// //     ============================================ */

// //     if (
// //       typeof paste !== "string" ||
// //       !paste.trim()
// //     ) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           message: "Paste data is required",
// //         },
// //         { status: 400 }
// //       );
// //     }

// //     const fallbackCategory: SurveyCategory =
// //       category &&
// //       VALID_CATEGORIES.includes(category)
// //         ? category
// //         : "B2C";

// //     /* ============================================
// //        PARSE
// //     ============================================ */

// //     const { records, errors } =
// //       parseBulkPaste(
// //         paste,
// //         fallbackCategory
// //       );

// //     if (!records.length) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           message:
// //             "No valid records found. Use Key: Value lines or separate records with =====.",
// //           errors,
// //         },
// //         { status: 400 }
// //       );
// //     }

// //     /* ============================================
// //        BATCH ID
// //     ============================================ */

// //     const batchId =
// //       records.length > 1
// //         ? new mongoose.Types.ObjectId().toString()
// //         : null;

// //     /* ============================================
// //        DOCUMENTS
// //     ============================================ */

// //     const documents = records.map(
// //       (record) => ({
// //         category: record.category,

// //         accountType:
// //           record.accountType || undefined,

// //         projectNo:
// //           record.projectNo || undefined,

// //         panelCode:
// //           record.panelCode || undefined,

// //         description:
// //           record.description || undefined,

// //         pid:
// //           record.pid || undefined,

// //         supplierId:
// //           record.supplierId || undefined,

// //         country:
// //           record.country || undefined,

// //         ip:
// //           record.ip || undefined,

// //         status:
// //           record.status || undefined,

// //         data:
// //           record.data || {},

// //         rawPaste:
// //           record.rawBlock || paste,

// //         batchId,

// //         // IMPORTANT:
// //         // Always use authenticated user.
// //         createdBy:
// //           authenticatedUserId,
// //       })
// //     );

// //     /* ============================================
// //        SAVE
// //     ============================================ */

// //     const docs =
// //       await SurveyData.insertMany(
// //         documents
// //       );

// //     /* ============================================
// //        AUDIT LOG
// //     ============================================ */

// //     await createAuditLog({
// //       userId:
// //         currentUser.userId,

// //       action: "UPLOAD",

// //       module: "Survey",

// //       description:
// //         `Uploaded ${docs.length} survey record${
// //           docs.length === 1
// //             ? ""
// //             : "s"
// //         }`,

// //       entityType: "SurveyData",

// //       entityId:
// //         docs.length === 1
// //           ? docs[0]._id.toString()
// //           : batchId || undefined,

// //       metadata: {
// //         count: docs.length,

// //         categories: [
// //           ...new Set(
// //             docs.map(
// //               (doc) => doc.category
// //             )
// //           ),
// //         ],

// //         batchId,
// //       },
// //     });

// //     /* ============================================
// //        RESPONSE
// //     ============================================ */

// //     return NextResponse.json(
// //       {
// //         success: true,

// //         message:
// //           docs.length === 1
// //             ? "1 record saved"
// //             : `${docs.length} records saved`,

// //         count: docs.length,

// //         errors,

// //         data: docs.map((doc) => {
// //           const object =
// //             doc.toObject();

// //           return {
// //             ...object,
// //             data:
// //               object.data || {},
// //           };
// //         }),
// //       },
// //       { status: 201 }
// //     );
// //   } catch (error: any) {
// //     console.error(
// //       "SURVEY POST ERROR:",
// //       error
// //     );

// //     /* ============================================
// //        VALIDATION
// //     ============================================ */

// //     if (
// //       error?.name ===
// //       "ValidationError"
// //     ) {
// //       const validationErrors =
// //         Object.entries(
// //           error.errors || {}
// //         ).map(
// //           ([field, err]: [
// //             string,
// //             any
// //           ]) => ({
// //             field,
// //             message:
// //               err?.message ||
// //               "Validation failed",
// //             value: err?.value,
// //             kind: err?.kind,
// //           })
// //         );

// //       return NextResponse.json(
// //         {
// //           success: false,
// //           message:
// //             "Survey validation failed",
// //           error: error.message,
// //           validationErrors,
// //         },
// //         { status: 400 }
// //       );
// //     }

// //     /* ============================================
// //        CAST
// //     ============================================ */

// //     if (
// //       error?.name === "CastError"
// //     ) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           message:
// //             `Invalid value for ${error.path}`,
// //           error: error.message,
// //           path: error.path,
// //           value: error.value,
// //         },
// //         { status: 400 }
// //       );
// //     }

// //     /* ============================================
// //        DUPLICATE
// //     ============================================ */

// //     if (error?.code === 11000) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           message:
// //             "Duplicate survey record",
// //           error: error.message,
// //           keyValue:
// //             error.keyValue,
// //         },
// //         { status: 409 }
// //       );
// //     }

// //     /* ============================================
// //        UNKNOWN
// //     ============================================ */

// //     return NextResponse.json(
// //       {
// //         success: false,
// //         message:
// //           "Failed to save survey data",
// //         error:
// //           error?.message ||
// //           String(error),
// //         name:
// //           error?.name ||
// //           "UnknownError",
// //         code:
// //           error?.code || null,
// //       },
// //       { status: 500 }
// //     );
// //   }
// // }
// // /* ======================================================
// //    GET - FETCH SURVEY RECORDS
// // ====================================================== */

// // export async function GET(req: NextRequest) {
// //   try {
// //     await connectDB();

// //     const { searchParams } =
// //       new URL(req.url);

// //     const category =
// //       searchParams.get("category");

// //     const projectNo =
// //       searchParams.get("projectNo");

// //     const accountType =
// //       searchParams.get("accountType");

// //     const pid =
// //       searchParams.get("pid");

// //     const country =
// //       searchParams.get("country");

// //     const status =
// //       searchParams.get("status");

// //     const createdBy =
// //       searchParams.get("createdBy");

// //     const excludeCreatedBy =
// //       searchParams.get("excludeCreatedBy");

// //     const includeUnassigned =
// //       searchParams.get("includeUnassigned");

// //     const sortBy =
// //       searchParams.get("sortBy") ||
// //       "createdAt";

// //     const sortOrder =
// //       searchParams.get("sortOrder") === "asc"
// //         ? 1
// //         : -1;

// //     const search =
// //       searchParams.get("search") || "";

// //     const page = Math.max(
// //       1,
// //       Number(
// //         searchParams.get("page") || "1"
// //       )
// //     );

// //     const limit = Math.min(
// //       100,
// //       Math.max(
// //         1,
// //         Number(
// //           searchParams.get("limit") || "20"
// //         )
// //       )
// //     );

// //     const skip =
// //       (page - 1) * limit;

// //     /* ==================================================
// //        FILTER
// //     ================================================== */

// //     const filter: any = {};

// //     /* -----------------------------------------------
// //        Category
// //     ------------------------------------------------ */

// //     if (
// //       category &&
// //       VALID_CATEGORIES.includes(
// //         category as SurveyCategory
// //       )
// //     ) {
// //       filter.category = category;
// //     }

// //     /* -----------------------------------------------
// //        Project
// //     ------------------------------------------------ */

// //     if (projectNo) {
// //       filter.projectNo = projectNo;
// //     }

// //     /* -----------------------------------------------
// //        Account type
// //     ------------------------------------------------ */

// //     if (accountType) {
// //       filter.accountType =
// //         accountType.toUpperCase();
// //     }

// //     /* -----------------------------------------------
// //        PID
// //     ------------------------------------------------ */

// //     if (pid) {
// //       filter.pid = pid;
// //     }

// //     /* -----------------------------------------------
// //        Country
// //     ------------------------------------------------ */

// //     if (country) {
// //       filter.country = {
// //         $regex: country,
// //         $options: "i",
// //       };
// //     }

// //     /* -----------------------------------------------
// //        Status
// //     ------------------------------------------------ */

// //     if (status) {
// //       filter.status = {
// //         $regex: status,
// //         $options: "i",
// //       };
// //     }

// //     /* ==================================================
// //        CREATOR FILTER
// //     ================================================== */

// //     if (createdBy) {
// //       if (
// //         !mongoose.Types.ObjectId.isValid(
// //           createdBy
// //         )
// //       ) {
// //         return NextResponse.json(
// //           {
// //             success: false,
// //             message:
// //               "Invalid createdBy ObjectId",
// //             createdBy,
// //           },
// //           { status: 400 }
// //         );
// //       }

// //       filter.createdBy =
// //         new mongoose.Types.ObjectId(
// //           createdBy
// //         );
// //     }

// //     /* -----------------------------------------------
// //        Exclude creator
// //     ------------------------------------------------ */

// //     else if (excludeCreatedBy) {
// //       if (
// //         !mongoose.Types.ObjectId.isValid(
// //           excludeCreatedBy
// //         )
// //       ) {
// //         return NextResponse.json(
// //           {
// //             success: false,
// //             message:
// //               "Invalid excludeCreatedBy ObjectId",
// //             excludeCreatedBy,
// //           },
// //           { status: 400 }
// //         );
// //       }

// //       const excludedId =
// //         new mongoose.Types.ObjectId(
// //           excludeCreatedBy
// //         );

// //       if (
// //         includeUnassigned === "true"
// //       ) {
// //         filter.$or = [
// //           {
// //             createdBy: null,
// //           },
// //           {
// //             createdBy: {
// //               $ne: excludedId,
// //             },
// //           },
// //         ];
// //       } else {
// //         filter.createdBy = {
// //           $ne: excludedId,
// //         };
// //       }
// //     }

// //     /* ==================================================
// //        SEARCH
// //     ================================================== */

// //     if (search.trim()) {
// //       const searchRegex = {
// //         $regex: search.trim(),
// //         $options: "i",
// //       };

// //       const searchOr = [
// //         {
// //           rawPaste: searchRegex,
// //         },
// //         {
// //           pid: searchRegex,
// //         },
// //         {
// //           projectNo: searchRegex,
// //         },
// //         {
// //           supplierId: searchRegex,
// //         },
// //         {
// //           country: searchRegex,
// //         },
// //         {
// //           accountType: searchRegex,
// //         },
// //         {
// //           status: searchRegex,
// //         },
// //       ];

// //       if (filter.$or) {
// //         filter.$and = [
// //           {
// //             $or: filter.$or,
// //           },
// //           {
// //             $or: searchOr,
// //           },
// //         ];

// //         delete filter.$or;
// //       } else {
// //         filter.$or = searchOr;
// //       }
// //     }

// //     /* ==================================================
// //        DATABASE QUERY
// //     ================================================== */

// //     const [items, total] =
// //       await Promise.all([
// //         SurveyData.find(filter)
// //           .sort({
// //             [sortBy]: sortOrder,
// //           })
// //           .skip(skip)
// //           .limit(limit)
// //           .lean(),

// //         SurveyData.countDocuments(
// //           filter
// //         ),
// //       ]);

// //     /* ==================================================
// //        RESPONSE
// //     ================================================== */

// //     const data = items.map(
// //       (item: any) => ({
// //         ...item,
// //         data: item.data || {},
// //       })
// //     );

// //     return NextResponse.json({
// //       success: true,

// //       data,

// //       pagination: {
// //         page,
// //         limit,
// //         total,
// //         totalPages:
// //           Math.ceil(total / limit),
// //       },
// //     });
// //   } catch (error: any) {
// //     console.error(
// //       "Survey GET error:",
// //       error
// //     );

// //     return NextResponse.json(
// //       {
// //         success: false,
// //         message:
// //           "Failed to fetch survey data",
// //         error:
// //           error?.message ||
// //           String(error),
// //       },
// //       { status: 500 }
// //     );
// //   }
// // }



// import { NextRequest, NextResponse } from "next/server";
// import mongoose from "mongoose";

// import { connectDB } from "@/config/db";
// import SurveyData from "@/models/SurveyData";
// import { SurveyCategory } from "@/lib/survey-fields";
// import { getCurrentUser } from "@/lib/getuser";
// import { createAuditLog } from "@/lib/auditLog";
// import { normalizeSurveyWithGroq } from "@/lib/groqSurveyNormalizer";

// const VALID_CATEGORIES: SurveyCategory[] = [
//   "B2B",
//   "B2H",
//   "B2C",
// ];

// /* ======================================================
//    POST - CREATE SURVEY RECORDS
// ====================================================== */

// export async function POST(req: NextRequest) {
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
//        REQUEST
//     ================================================== */

//     const body = await req.json();

//     const category =
//       body?.category as
//         | SurveyCategory
//         | undefined;

//     const paste = body?.paste;

//     /* ==================================================
//        CATEGORY
//     ================================================== */

//     if (
//       category &&
//       !VALID_CATEGORIES.includes(category)
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "Category must be one of B2B | B2H | B2C",
//         },
//         { status: 400 }
//       );
//     }

//     /* ==================================================
//        PASTE
//     ================================================== */

//     if (
//       typeof paste !== "string" ||
//       !paste.trim()
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Paste data is required",
//         },
//         { status: 400 }
//       );
//     }

//     const fallbackCategory: SurveyCategory =
//       category &&
//       VALID_CATEGORIES.includes(category)
//         ? category
//         : "B2C";

//     /* ==================================================
//        GROQ AI NORMALIZATION
       
//        IMPORTANT:
//        We use the structured records returned by Groq
//        directly. We DO NOT send the AI output through
//        parseBulkPaste().
//     ================================================== */

//     let aiRecords: any[];

//     try {
//       const aiResult =
//         await normalizeSurveyWithGroq(
//           paste
//         );

//       if (
//         !aiResult ||
//         !Array.isArray(aiResult.records)
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
//           { status: 502 }
//         );
//       }

//       aiRecords = aiResult.records;

//       console.log(
//         `GROQ: normalized ${aiRecords.length} record(s)`
//       );

//       if (aiRecords.length === 0) {
//         return NextResponse.json(
//           {
//             success: false,
//             message:
//               "AI normalized the input, but returned no survey records.",
//           },
//           { status: 400 }
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
//           message: "AI normalization failed",
//           error:
//             error?.message ||
//             "Unknown Groq error",
//         },
//         { status: 502 }
//       );
//     }

//     /* ==================================================
//        VALIDATE / CLEAN AI RECORDS
//     ================================================== */

//     const validRecords = aiRecords.filter(
//       (record: any) =>
//         record &&
//         typeof record === "object"
//     );

//     if (validRecords.length === 0) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "Groq returned no usable survey records.",
//         },
//         { status: 400 }
//       );
//     }

//     /* ==================================================
//        BATCH ID
//     ================================================== */

//     const batchId =
//       validRecords.length > 1
//         ? new mongoose.Types.ObjectId().toString()
//         : null;

//     /* ==================================================
//        BUILD MONGODB DOCUMENTS
//     ================================================== */

//     const documents = validRecords.map(
//       (record: any) => {

//         /*
//          * Start with any additional fields that
//          * Groq placed into data.
//          */
//         const data: Record<string, string> = {
//           ...(record.data &&
//           typeof record.data === "object"
//             ? record.data
//             : {}),
//         };

//         /*
//          * Helper:
//          * Only add values that actually exist.
//          */
//         const addData = (
//           key: string,
//           value: unknown
//         ) => {
//           if (
//             value !== undefined &&
//             value !== null &&
//             String(value).trim() !== ""
//           ) {
//             data[key] = String(value);
//           }
//         };

//         /* ----------------------------------------------
//            RESPONDENT FIELDS
//         ---------------------------------------------- */

//         addData(
//           "Age",
//           record.age
//         );

//         addData(
//           "Gender",
//           record.gender
//         );

//         addData(
//           "Job Title",
//           record.jobTitle
//         );

//         addData(
//           "Industry",
//           record.industry
//         );

//         addData(
//           "Zip code",
//           record.zipCode
//         );

//         addData(
//           "Department",
//           record.department
//         );

//         addData(
//           "Employees",
//           record.employees
//         );

//         addData(
//           "Brand",
//           record.brand
//         );

//         addData(
//           "Revenue",
//           record.revenue
//         );

//         addData(
//           "Company",
//           record.company
//         );

//         addData(
//           "Country",
//           record.country
//         );

//         addData(
//           "Nationality",
//           record.nationality
//         );

//         addData(
//           "Household Income",
//           record.householdIncome
//         );

//         addData(
//           "Oppo",
//           record.oppo
//         );

//         addData(
//           "Study Topic",
//           record.studyTopic
//         );

//         addData(
//           "Record ID",
//           record.recordId
//         );

//         /* ----------------------------------------------
//            TNX / LOCATION
//         ---------------------------------------------- */

//         addData(
//           "TNX-ID",
//           record.tnxId
//         );

//         addData(
//           "Location",
//           record.location
//         );

//         /* ----------------------------------------------
//            CREATE DOCUMENT
//         ---------------------------------------------- */

//         return {
//           category:
//             record.category ||
//             fallbackCategory,

//           accountType:
//             record.accountType ||
//             undefined,

//           projectNo:
//             record.projectNo ||
//             undefined,

//           panelCode:
//             record.panelCode ||
//             undefined,

//           description:
//             record.surveyName ||
//             record.description ||
//             undefined,

//           pid:
//             record.pid ||
//             undefined,

//           supplierId:
//             record.supplierId ||
//             undefined,

//           country:
//             record.country ||
//             record.location ||
//             undefined,

//           ip:
//             record.ip ||
//             undefined,

//           status:
//             record.status ||
//             undefined,

//           data,

//           /*
//            * IMPORTANT:
//            * Save the original user paste.
//            * Do not save AI-generated text here.
//            */
//           rawPaste: paste,

//           batchId,

//           /*
//            * Always associate the upload with
//            * the authenticated user.
//            */
//           createdBy:
//             authenticatedUserId,
//         };
//       }
//     );

//     /* ==================================================
//        SAFETY CHECK
//     ================================================== */

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
//         { status: 400 }
//       );
//     }

//     console.log(
//       `SURVEY: saving ${documents.length} document(s)`
//     );

//     /* ==================================================
//        SAVE
//     ================================================== */

//     const docs =
//       await SurveyData.insertMany(
//         documents
//       );

//     /* ==================================================
//        AUDIT LOG
//     ================================================== */

//     await createAuditLog({
//       userId:
//         currentUser.userId,

//       action: "UPLOAD",

//       module: "Survey",

//       description:
//         `Uploaded ${docs.length} survey record${
//           docs.length === 1
//             ? ""
//             : "s"
//         } using AI normalization`,

//       entityType: "SurveyData",

//       entityId:
//         docs.length === 1
//           ? docs[0]._id.toString()
//           : batchId ||
//             undefined,

//       metadata: {
//         count: docs.length,

//         categories: [
//           ...new Set(
//             docs.map(
//               (doc) =>
//                 doc.category
//             )
//           ),
//         ],

//         batchId,

//         aiNormalized: true,
//       },
//     });

//     /* ==================================================
//        RESPONSE
//     ================================================== */

//     return NextResponse.json(
//       {
//         success: true,

//         message:
//           docs.length === 1
//             ? "1 record saved"
//             : `${docs.length} records saved`,

//         count: docs.length,

//         errors: [],

//         aiNormalized: true,

//         data: docs.map(
//           (doc) => {
//             const object =
//               doc.toObject();

//             return {
//               ...object,

//               data:
//                 object.data || {},
//             };
//           }
//         ),
//       },
//       { status: 201 }
//     );

//   } catch (error: any) {
//     console.error(
//       "SURVEY POST ERROR:",
//       error
//     );

//     /* ==================================================
//        MONGOOSE VALIDATION ERROR
//     ================================================== */

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
//         { status: 400 }
//       );
//     }

//     /* ==================================================
//        CAST ERROR
//     ================================================== */

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
//         { status: 400 }
//       );
//     }

//     /* ==================================================
//        DUPLICATE ERROR
//     ================================================== */

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
//         { status: 409 }
//       );
//     }

//     /* ==================================================
//        UNKNOWN ERROR
//     ================================================== */

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
//       { status: 500 }
//     );
//   }
// }


// /* ======================================================
//    GET - FETCH SURVEY RECORDS
// ====================================================== */

// export async function GET(
//   req: NextRequest
// ) {
//   try {
//     await connectDB();

//     const { searchParams } =
//       new URL(req.url);

//     const category =
//       searchParams.get(
//         "category"
//       );

//     const projectNo =
//       searchParams.get(
//         "projectNo"
//       );

//     const accountType =
//       searchParams.get(
//         "accountType"
//       );

//     const pid =
//       searchParams.get("pid");

//     const country =
//       searchParams.get("country");

//     const status =
//       searchParams.get("status");

//     const createdBy =
//       searchParams.get(
//         "createdBy"
//       );

//     const excludeCreatedBy =
//       searchParams.get(
//         "excludeCreatedBy"
//       );

//     const includeUnassigned =
//       searchParams.get(
//         "includeUnassigned"
//       );

//     const sortBy =
//       searchParams.get(
//         "sortBy"
//       ) || "createdAt";

//     const sortOrder =
//       searchParams.get(
//         "sortOrder"
//       ) === "asc"
//         ? 1
//         : -1;

//     const search =
//       searchParams.get(
//         "search"
//       ) || "";

//     const page = Math.max(
//       1,
//       Number(
//         searchParams.get(
//           "page"
//         ) || "1"
//       )
//     );

//     const limit = Math.min(
//       100,
//       Math.max(
//         1,
//         Number(
//           searchParams.get(
//             "limit"
//           ) || "20"
//         )
//       )
//     );

//     const skip =
//       (page - 1) * limit;

//     /* ==================================================
//        FILTER
//     ================================================== */

//     const filter: any = {};

//     /* -----------------------------------------------
//        Category
//     ------------------------------------------------ */

//     if (
//       category &&
//       VALID_CATEGORIES.includes(
//         category as SurveyCategory
//       )
//     ) {
//       filter.category =
//         category;
//     }

//     /* -----------------------------------------------
//        Project
//     ------------------------------------------------ */

//     if (projectNo) {
//       filter.projectNo =
//         projectNo;
//     }

//     /* -----------------------------------------------
//        Account Type
//     ------------------------------------------------ */

//     if (accountType) {
//       filter.accountType =
//         accountType.toUpperCase();
//     }

//     /* -----------------------------------------------
//        PID
//     ------------------------------------------------ */

//     if (pid) {
//       filter.pid = pid;
//     }

//     /* -----------------------------------------------
//        Country
//     ------------------------------------------------ */

//     if (country) {
//       filter.country = {
//         $regex: country,
//         $options: "i",
//       };
//     }

//     /* -----------------------------------------------
//        Status
//     ------------------------------------------------ */

//     if (status) {
//       filter.status = {
//         $regex: status,
//         $options: "i",
//       };
//     }

//     /* ==================================================
//        CREATOR FILTER
//     ================================================== */

//     if (createdBy) {
//       if (
//         !mongoose.Types.ObjectId.isValid(
//           createdBy
//         )
//       ) {
//         return NextResponse.json(
//           {
//             success: false,
//             message:
//               "Invalid createdBy ObjectId",
//             createdBy,
//           },
//           { status: 400 }
//         );
//       }

//       filter.createdBy =
//         new mongoose.Types.ObjectId(
//           createdBy
//         );

//     } else if (
//       excludeCreatedBy
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

//       if (
//         includeUnassigned ===
//         "true"
//       ) {
//         filter.$or = [
//           {
//             createdBy: null,
//           },
//           {
//             createdBy: {
//               $ne: excludedId,
//             },
//           },
//         ];
//       } else {
//         filter.createdBy = {
//           $ne: excludedId,
//         };
//       }
//     }

//     /* ==================================================
//        SEARCH
//     ================================================== */

//     if (search.trim()) {
//       const searchRegex = {
//         $regex:
//           search.trim(),
//         $options: "i",
//       };

//       const searchOr = [
//         {
//           rawPaste:
//             searchRegex,
//         },
//         {
//           pid:
//             searchRegex,
//         },
//         {
//           projectNo:
//             searchRegex,
//         },
//         {
//           supplierId:
//             searchRegex,
//         },
//         {
//           country:
//             searchRegex,
//         },
//         {
//           accountType:
//             searchRegex,
//         },
//         {
//           status:
//             searchRegex,
//         },
//       ];

//       if (filter.$or) {
//         filter.$and = [
//           {
//             $or:
//               filter.$or,
//           },
//           {
//             $or:
//               searchOr,
//           },
//         ];

//         delete filter.$or;
//       } else {
//         filter.$or =
//           searchOr;
//       }
//     }

//     /* ==================================================
//        DATABASE QUERY
//     ================================================== */

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


// ============================================================
// GET - FETCH SURVEY RECORDS
// ============================================================

// export async function GET(
//   req: NextRequest
// ) {
//   try {
//     await connectDB();


//     // ========================================================
//     // AUTHENTICATION
//     // ========================================================

//     const currentUser =
//       await getCurrentUser();

//     if (!currentUser?.userId) {
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


//     const currentUserId =
//       objectId(
//         currentUser.userId
//       );


//     const role =
//       normalizeRole(
//         currentUser.role
//       );


//     console.log(
//       "======================================"
//     );

//     console.log(
//       "SURVEY GET AUTH"
//     );

//     console.log(
//       "User ID:",
//       currentUser.userId
//     );

//     console.log(
//       "Role:",
//       currentUser.role
//     );

//     console.log(
//       "Team ID:",
//       (currentUser as any).teamId
//     );

//     console.log(
//       "======================================"
//     );


//     // ========================================================
//     // URL PARAMETERS
//     // ========================================================

//     const {
//       searchParams,
//     } = new URL(
//       req.url
//     );


//     const category =
//       searchParams.get(
//         "category"
//       );

//     const projectNo =
//       searchParams.get(
//         "projectNo"
//       );

//     const accountType =
//       searchParams.get(
//         "accountType"
//       );

//     const pid =
//       searchParams.get(
//         "pid"
//       );

//     const country =
//       searchParams.get(
//         "country"
//       );

//     const status =
//       searchParams.get(
//         "status"
//       );

//     /*
//      * These parameters are intentionally read,
//      * but creator access is NOT trusted from
//      * the browser.
//      */
//     const requestedCreatedBy =
//       searchParams.get(
//         "createdBy"
//       );

//     const excludeCreatedBy =
//       searchParams.get(
//         "excludeCreatedBy"
//       );

//     const includeUnassigned =
//       searchParams.get(
//         "includeUnassigned"
//       );


//     const sortBy =
//       searchParams.get(
//         "sortBy"
//       ) || "createdAt";


//     const sortOrder =
//       searchParams.get(
//         "sortOrder"
//       ) === "asc"
//         ? 1
//         : -1;


//     const search =
//       searchParams.get(
//         "search"
//       ) || "";


//     const page =
//       Math.max(
//         1,
//         Number(
//           searchParams.get(
//             "page"
//           ) || "1"
//         )
//       );


//     const limit =
//       Math.min(
//         100,
//         Math.max(
//           1,
//           Number(
//             searchParams.get(
//               "limit"
//             ) || "20"
//           )
//         )
//       );


//     const skip =
//       (page - 1) *
//       limit;


//     // ========================================================
//     // BASE FILTER
//     // ========================================================

//     const filter: any = {};


//     // ========================================================
//     // CATEGORY
//     // ========================================================

//     if (
//       category &&
//       VALID_CATEGORIES.includes(
//         category as SurveyCategory
//       )
//     ) {
//       filter.category =
//         category;
//     }


//     // ========================================================
//     // PROJECT
//     // ========================================================

//     if (
//       projectNo
//     ) {
//       filter.projectNo =
//         projectNo;
//     }


//     // ========================================================
//     // ACCOUNT TYPE
//     // ========================================================

//     if (
//       accountType
//     ) {
//       filter.accountType =
//         accountType.toUpperCase();
//     }


//     // ========================================================
//     // PID
//     // ========================================================

//     if (
//       pid
//     ) {
//       filter.pid =
//         pid;
//     }


//     // ========================================================
//     // COUNTRY
//     // ========================================================

//     if (
//       country
//     ) {
//       filter.country = {
//         $regex:
//           country,
//         $options:
//           "i",
//       };
//     }


//     // ========================================================
//     // STATUS
//     // ========================================================

//     if (
//       status
//     ) {
//       filter.status = {
//         $regex:
//           status,
//         $options:
//           "i",
//       };
//     }


//     // ========================================================
//     // ROLE-BASED CREATOR ACCESS
//     // ========================================================

//     /*
//      * IMPORTANT:
//      *
//      * Never trust:
//      *
//      * ?createdBy=someOtherUserId
//      *
//      * from the frontend.
//      *
//      * The server determines the allowed
//      * createdBy values from the logged-in
//      * user's role.
//      */


//     // --------------------------------------------------------
//     // SURVEY TESTER
//     // --------------------------------------------------------

//     const isSurveyTester =
//       role === "survey" ||
//       role === "surveytester" ||
//       role === "tester";


//     if (
//       isSurveyTester
//     ) {
//       /*
//        * Survey Tester can ONLY see
//        * records created by himself.
//        */
//       filter.createdBy =
//         currentUserId;

//       console.log(
//         "SURVEY ACCESS: OWN DATA ONLY"
//       );
//     }


//     // --------------------------------------------------------
//     // TEAM LEAD
//     // --------------------------------------------------------

//     else if (
//       role === "teamlead"
//     ) {
//       /*
//        * Team Lead must have a team.
//        */

//       if (
//         !(currentUser as any).teamId ||
//         !isValidObjectId(
//           String(
//             (currentUser as any).teamId
//           )
//         )
//       ) {
//         return NextResponse.json(
//           {
//             success: false,
//             message:
//               "Team Lead does not have a valid team",
//           },
//           {
//             status: 400,
//           }
//         );
//       }


//       const teamId =
//         objectId(
//           String(
//             (currentUser as any).teamId
//           )
//         );


//       /*
//        * Find every user belonging
//        * to this Team Lead's team.
//        *
//        * This includes:
//        * - Team Lead
//        * - Survey Testers
//        * - Other team members
//        */

//       const teamUsers =
//         await Auth.find(
//           {
//             teamId,

//             isDeleted: {
//               $ne: true,
//             },

//             isActive: {
//               $ne: false,
//             },
//           },
//           {
//             _id: 1,
//           }
//         ).lean();


//       const teamUserIds =
//         teamUsers.map(
//           (
//             member: any
//           ) =>
//             member._id
//         );


//       /*
//        * Always include current Team Lead.
//        *
//        * This protects against an inconsistent
//        * User.teamId record.
//        */

//       const alreadyIncluded =
//         teamUserIds.some(
//           (
//             id: any
//           ) =>
//             String(id) ===
//             String(
//               currentUserId
//             )
//         );


//       if (
//         !alreadyIncluded
//       ) {
//         teamUserIds.push(
//           currentUserId
//         );
//       }


//       filter.createdBy = {
//         $in:
//           teamUserIds,
//       };


//       console.log(
//         "TEAM LEAD ACCESS"
//       );

//       console.log(
//         "Team ID:",
//         String(
//           teamId
//         )
//       );

//       console.log(
//         "Team Users:",
//         teamUserIds.map(
//           (id: any) =>
//             String(id)
//         )
//       );
//     }


//     // --------------------------------------------------------
//     // ADMIN
//     // HR
//     // --------------------------------------------------------

//     else if (
//       role === "admin" ||
//       role === "hr"
//     ) {
//       /*
//        * Admin and HR can see all survey records.
//        *
//        * Do NOT apply createdBy from URL.
//        */

//       console.log(
//         "ADMIN/HR ACCESS: ALL SURVEY DATA"
//       );
//     }


//     // --------------------------------------------------------
//     // UNKNOWN ROLE
//     // --------------------------------------------------------

//     else {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "You do not have permission to view survey data",
//         },
//         {
//           status: 403,
//         }
//       );
//     }


//     // ========================================================
//     // IMPORTANT SECURITY RULE
//     // ========================================================

//     /*
//      * Ignore these frontend filters:
//      *
//      * ?createdBy=
//      * ?excludeCreatedBy=
//      *
//      * for role authorization.
//      *
//      * Otherwise a user could potentially
//      * manipulate the URL and access data
//      * outside their scope.
//      */

//     void requestedCreatedBy;
//     void excludeCreatedBy;
//     void includeUnassigned;


//     // ========================================================
//     // SEARCH
//     // ========================================================

//     if (
//       search.trim()
//     ) {
//       const searchRegex = {
//         $regex:
//           search.trim(),
//         $options:
//           "i",
//       };


//       const searchOr = [
//         {
//           rawPaste:
//             searchRegex,
//         },

//         {
//           pid:
//             searchRegex,
//         },

//         {
//           projectNo:
//             searchRegex,
//         },

//         {
//           supplierId:
//             searchRegex,
//         },

//         {
//           country:
//             searchRegex,
//         },

//         {
//           accountType:
//             searchRegex,
//         },

//         {
//           status:
//             searchRegex,
//         },
//       ];


//       /*
//        * Keep role filter AND search filter together.
//        */

//       filter.$and = [
//         {
//           $or:
//             searchOr,
//         },

//         /*
//          * Preserve every existing
//          * security/filter condition.
//          */
//         {
//           ...Object.fromEntries(
//             Object.entries(
//               filter
//             ).filter(
//               ([key]) =>
//                 key !== "$and" &&
//                 key !== "$or"
//             )
//           ),
//         },
//       ];


//       /*
//        * If there is no security filter,
//        * simply use search.
//        */

//       if (
//         Object.keys(
//           filter
//         ).length === 0
//       ) {
//         delete filter.$and;
//         filter.$or =
//           searchOr;
//       }
//     }


//     // ========================================================
//     // DATABASE QUERY
//     // ========================================================

//     console.log(
//       "======================================"
//     );

//     console.log(
//       "FINAL SURVEY FILTER:"
//     );

//     console.log(
//       JSON.stringify(
//         filter,
//         null,
//         2
//       )
//     );

//     console.log(
//       "======================================"
//     );


//     const [
//       items,
//       total,
//     ] = await Promise.all([
//       SurveyData.find(
//         filter
//       )
//         .sort({
//           [sortBy]:
//             sortOrder,
//         })
//         .skip(
//           skip
//         )
//         .limit(
//           limit
//         )
//         .lean(),

//       SurveyData.countDocuments(
//         filter
//       ),
//     ]);


//     // ========================================================
//     // RESPONSE
//     // ========================================================

//     const data =
//       items.map(
//         (item: any) => ({
//           ...item,

//           data:
//             item.data ||
//             {},
//         })
//       );


//     return NextResponse.json(
//       {
//         success: true,

//         data,

//         pagination: {
//           page,

//           limit,

//           total,

//           totalPages:
//             Math.ceil(
//               total /
//                 limit
//             ),
//         },
//       }
//     );

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
//       {
//         status: 500,
//       }
//     );
//   }
// }
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
       
       IMPORTANT:
       
       MY_DATA:
       Team Lead can always read their own records.
       
       TEAM_DATA:
       Team Lead can only read records created by
       members of their own active team.
       
       Team Lead does NOT need a team to read MY_DATA.
    ================================================== */

    if (currentUser.role === "team-lead") {
      const ownUserId =
        authenticatedUserId;

      /*
       * No createdBy means the request is not explicitly
       * asking for a particular user's records.
       *
       * For security, Team Lead is restricted to their
       * own records in this case.
       */
      if (!requestedCreatedBy) {
        filter.createdBy = ownUserId;
      } else {
        /*
         * Validate requested creator ID
         */
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

        const requestedCreatorId =
          new mongoose.Types.ObjectId(
            requestedCreatedBy
          );

        /*
         * ==============================================
         * CASE 1: MY DATA
         *
         * Team Lead is requesting their own data.
         *
         * DO NOT require a Team document here.
         * ==============================================
         */

        if (
          requestedCreatorId.equals(
            ownUserId
          )
        ) {
          filter.createdBy =
            ownUserId;
        }

        /*
         * ==============================================
         * CASE 2: TEAM DATA
         *
         * Team Lead is requesting another user's data.
         *
         * That user MUST be a member of the Team Lead's
         * active team.
         * ==============================================
         */
        else {
          const teams =
            await Team.find({
              teamLead:
                ownUserId,
              isActive: true,
            })
              .select(
                "members"
              )
              .lean();

          /*
           * No active team:
           *
           * This is NOT an error for MY_DATA,
           * but it means the Team Lead cannot access
           * another user's data.
           */
          if (!teams.length) {
            return NextResponse.json(
              {
                success: false,
                message:
                  "You do not have an active team or this user is not part of your team",
              },
              { status: 403 }
            );
          }

          /*
           * Collect all members from all active teams
           * owned by this Team Lead.
           */
          const teamMemberIds =
            teams.flatMap(
              (team: any) =>
                (team.members || []).map(
                  (memberId: any) =>
                    String(memberId)
                )
            );

          /*
           * Remove duplicates
           */
          const uniqueTeamMemberIds =
            [
              ...new Set(
                teamMemberIds
              ),
            ];

          /*
           * Check whether requested creator
           * belongs to this Team Lead's team.
           */
          const isTeamMember =
            uniqueTeamMemberIds.includes(
              String(
                requestedCreatorId
              )
            );

          if (!isTeamMember) {
            return NextResponse.json(
              {
                success: false,
                message:
                  "You can only view survey data submitted by members of your own team",
              },
              { status: 403 }
            );
          }

          filter.createdBy =
            requestedCreatorId;
        }
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
    ================================================== */

    if (search.trim()) {
      const searchRegex = {
        $regex:
          search.trim(),
        $options: "i",
      };

      const searchOr = [
        {
          rawPaste: searchRegex,
        },
        {
          pid: searchRegex,
        },
        {
          projectNo:
            searchRegex,
        },
        {
          supplierId:
            searchRegex,
        },
        {
          country:
            searchRegex,
        },
        {
          accountType:
            searchRegex,
        },
        {
          status:
            searchRegex,
        },
      ];

      /*
       * If another $or already exists,
       * combine both conditions with $and.
       */
      if (filter.$or) {
        filter.$and = [
          {
            $or: filter.$or,
          },
          {
            $or: searchOr,
          },
        ];

        delete filter.$or;
      } else {
        filter.$or =
          searchOr;
      }
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