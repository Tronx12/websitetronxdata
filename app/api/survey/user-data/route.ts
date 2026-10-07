// import {
//   NextRequest,
//   NextResponse,
// } from "next/server";

// import mongoose from "mongoose";

// import { connectDB } from "@/config/db";
// import SurveyData from "@/models/SurveyData";
// import Auth from "@/models/Auth";
// import { getCurrentUser } from "@/lib/getuser";


// // ============================================================
// // ROLE
// // ============================================================

// function normalizeRole(
//   role: unknown
// ) {
//   return String(role || "")
//     .trim()
//     .toLowerCase()
//     .replace(/[\s_-]+/g, "");
// }


// // ============================================================
// // GET USER SURVEY DATA
// // ============================================================

// export async function GET(
//   request: NextRequest
// ) {
//   try {

//     await connectDB();

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

//     const currentUserId =
//       String(
//         currentUser.userId
//       );

//     const currentRole =
//       normalizeRole(
//         currentUser.role
//       );

//     const {
//       searchParams,
//     } = new URL(request.url);

//     const requestedUserId =
//       searchParams.get(
//         "userId"
//       );

//     if (!requestedUserId) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "userId is required",
//         },
//         {
//           status: 400,
//         }
//       );
//     }

//     if (
//       !mongoose.Types.ObjectId.isValid(
//         requestedUserId
//       )
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "Invalid userId",
//         },
//         {
//           status: 400,
//         }
//       );
//     }

//     // ========================================================
//     // CHECK ACCESS
//     // ========================================================

//     let hasAccess = false;

//     // --------------------------------------------------------
//     // OWN DATA
//     // --------------------------------------------------------

//     if (
//       requestedUserId ===
//       currentUserId
//     ) {
//       hasAccess = true;
//     }

//     // --------------------------------------------------------
//     // ADMIN / HR
//     // --------------------------------------------------------

//     else if (
//       currentRole ===
//         "admin" ||
//       currentRole ===
//         "data-quality-analyst" ||
//       currentRole ===
//         "senior-teamlead" ||
//       currentRole ===
//         "hr"
//     ) {
//       hasAccess = true;
//     }

//     // --------------------------------------------------------
//     // TEAM LEAD
//     // --------------------------------------------------------

//     else if (
//       currentRole ===
//       "teamlead"
//     ) {

//       const requestedUser =
//         await Auth.findOne({
//           _id:
//             requestedUserId,

//           isDeleted: {
//             $ne: true,
//           },
//         })
//           .select(
//             "_id teamId"
//           )
//           .lean();

//       if (
//         requestedUser
//       ) {

//         const currentTeamId =
//           (
//             currentUser as any
//           ).teamId;

//         if (
//           currentTeamId &&
//           requestedUser.teamId &&
//           String(
//             currentTeamId
//           ) ===
//             String(
//               requestedUser.teamId
//             )
//         ) {
//           hasAccess = true;
//         }
//       }
//     }

//     // ========================================================
//     // DENIED
//     // ========================================================

//     if (!hasAccess) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "You are not allowed to view this user's data",
//         },
//         {
//           status: 403,
//         }
//       );
//     }

//     // ========================================================
//     // USER
//     // ========================================================

//     const user =
//       await Auth.findById(
//         requestedUserId
//       )
//         .select(
//           "_id name email role teamId"
//         )
//         .lean();

//     if (!user) {
//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "User not found",
//         },
//         {
//           status: 404,
//         }
//       );
//     }

//     // ========================================================
//     // SURVEY DATA
//     // ========================================================

//     const records =
//       await SurveyData.find({
//         createdBy:
//           new mongoose.Types.ObjectId(
//             requestedUserId
//           ),
//       })
//         .sort({
//           createdAt: -1,
//         })
//         .lean();

//     // ========================================================
//     // RESPONSE
//     // ========================================================

//     return NextResponse.json({
//       success: true,

//       user: {
//         id:
//           String(user._id),

//         name:
//           user.name ||
//           user.email,

//         email:
//           user.email,

//         role:
//           user.role,

//         teamId:
//           user.teamId
//             ? String(
//                 user.teamId
//               )
//             : null,
//       },

//       total:
//         records.length,

//       records,
//     });

//   } catch (error: any) {

//     console.error(
//       "USER SURVEY DATA ERROR:",
//       error
//     );

//     return NextResponse.json(
//       {
//         success: false,

//         message:
//           error?.message ||
//           "Failed to load user survey data",
//       },
//       {
//         status: 500,
//       }
//     );
//   }
// }

import {
  NextRequest,
  NextResponse,
} from "next/server";

import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import Auth from "@/models/Auth";
import { getCurrentUser } from "@/lib/getuser";

// ============================================================
// ROLE NORMALIZATION
// ============================================================

function normalizeRole(role: unknown): string {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

// ============================================================
// GET USER SURVEY DATA
// ============================================================

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // ========================================================
    // CURRENT USER FROM JWT COOKIE
    // ========================================================

    const currentUser = await getCurrentUser();

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

    const currentUserId = String(currentUser.userId);

    const currentRole = normalizeRole(
      currentUser.role
    );

    // ========================================================
    // QUERY PARAMS
    // ========================================================

    const { searchParams } = new URL(request.url);

    const requestedUserId =
      searchParams.get("userId")?.trim();

    if (!requestedUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "userId is required",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // OBJECT ID VALIDATION
    // ========================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        requestedUserId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid userId",
        },
        {
          status: 400,
        }
      );
    }

    const requestedObjectId =
      new mongoose.Types.ObjectId(
        requestedUserId
      );

    // ========================================================
    // ACCESS CONTROL
    // ========================================================

    let hasAccess = false;

    // ========================================================
    // 1. OWN DATA
    // ========================================================

    if (
      currentUserId === requestedUserId
    ) {
      hasAccess = true;
    }

    // ========================================================
    // 2. ADMIN / HR / DQA / SENIOR TEAM LEAD
    // ========================================================

    else if (
      [
        "admin",
        "hr",
        "dataqualityanalyst",
        "seniorteamlead",
      ].includes(currentRole)
    ) {
      hasAccess = true;
    }

    // ========================================================
    // 3. TEAM LEAD
    // ========================================================

    else if (
      currentRole === "teamlead"
    ) {
      const requestedUser =
        await Auth.findOne({
          _id: requestedObjectId,

          isDeleted: {
            $ne: true,
          },
        })
          .select("_id teamId")
          .lean();

      if (requestedUser) {
        const currentTeamId =
          (currentUser as any)?.teamId;

        const requestedTeamId =
          requestedUser.teamId;

        if (
          currentTeamId &&
          requestedTeamId &&
          String(currentTeamId) ===
            String(requestedTeamId)
        ) {
          hasAccess = true;
        }
      }
    }

    // ========================================================
    // 4. ACCESS DENIED
    // ========================================================

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You are not allowed to view this user's data",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // USER
    // ========================================================

    const user =
      await Auth.findOne({
        _id: requestedObjectId,

        isDeleted: {
          $ne: true,
        },
      })
        .select(
          "_id name email role teamId"
        )
        .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // SURVEY DATA
    // ========================================================

    const records =
      await SurveyData.find({
        createdBy: requestedObjectId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json({
      success: true,

      user: {
        id: String(user._id),

        name:
          user.name ||
          user.email,

        email:
          user.email,

        role:
          user.role,

        teamId:
          user.teamId
            ? String(user.teamId)
            : null,
      },

      total: records.length,

      records,
    });

  } catch (error: any) {
    console.error(
      "USER SURVEY DATA ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to load user survey data",
      },
      {
        status: 500,
      }
    );
  }
}