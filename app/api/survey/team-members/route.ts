

// import { NextRequest, NextResponse } from "next/server";

// import { connectDB } from "@/config/db";
// import Team from "@/models/Team";
// import SurveyData from "@/models/SurveyData";
// import { getCurrentUser } from "@/lib/getuser";

// /* =========================================================
//    GET TEAM MEMBERS + SURVEY/OE STATS

//    TEAM LEAD:
//    - Can ONLY see their own team members
//    - Cannot override teamLeadId from frontend
//    - Includes members with 0 submissions

//    ADMIN / HR:
//    - Can optionally provide teamLeadId
// ========================================================= */

// export async function GET(req: NextRequest) {
//   try {
//     const currentUser = await getCurrentUser();

//     // =======================================================
//     // AUTHENTICATION
//     // =======================================================

//     if (!currentUser?.userId) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Unauthorized",
//         },
//         { status: 401 }
//       );
//     }

//     await connectDB();

//     const { searchParams } = new URL(req.url);

//     const search = (
//       searchParams.get("search") || ""
//     ).trim();

//     let teamLeadId =
//       searchParams.get("teamLeadId");

//     // =======================================================
//     // ROLE SECURITY
//     // =======================================================

//     if (currentUser.role === "team-lead") {
//       /*
//        * IMPORTANT:
//        *
//        * Ignore any teamLeadId supplied by frontend.
//        * Always force the logged-in team lead.
//        */
//       teamLeadId = currentUser.userId;
//     } else if (
//       !["admin", "hr","senior-teamlead","data-quality-analyst"].includes(currentUser.role)
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Forbidden",
//         },
//         { status: 403 }
//       );
//     }

//     // =======================================================
//     // VALIDATE TEAM LEAD
//     // =======================================================

//     if (!teamLeadId) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "teamLeadId is required",
//         },
//         { status: 400 }
//       );
//     }

//     // =======================================================
//     // GET ONLY ACTIVE TEAMS BELONGING TO THIS TEAM LEAD
//     // =======================================================

//     const teams = await Team.find({
//       teamLead: teamLeadId,
//       isActive: true,
//     })
//       .populate(
//         "members",
//         "name email role phoneNumber"
//       )
//       .lean();

//     // No team
//     if (!teams.length) {
//       return NextResponse.json({
//         success: true,
//         data: [],
//         count: 0,
//       });
//     }

//     // =======================================================
//     // COLLECT UNIQUE TEAM MEMBERS
//     // =======================================================

//     const memberMap = new Map<string, any>();

//     for (const team of teams) {
//       for (const member of team.members || []) {
//         if (!member?._id) continue;

//         memberMap.set(
//           String(member._id),
//           member
//         );
//       }
//     }

//     let members = Array.from(
//       memberMap.values()
//     );

//     // =======================================================
//     // SEARCH
//     // =======================================================

//     if (search) {
//       const searchLower =
//         search.toLowerCase();

//       members = members.filter((member) => {
//         const name = String(
//           member.name || ""
//         ).toLowerCase();

//         const email = String(
//           member.email || ""
//         ).toLowerCase();

//         return (
//           name.includes(searchLower) ||
//           email.includes(searchLower)
//         );
//       });
//     }

//     // =======================================================
//     // NO MEMBERS
//     // =======================================================

//     if (!members.length) {
//       return NextResponse.json({
//         success: true,
//         data: [],
//         count: 0,
//       });
//     }

//     // =======================================================
//     // MEMBER IDS
//     // =======================================================

//     const memberIds = members.map(
//       (member) => member._id
//     );

//     // =======================================================
//     // GET SURVEY DATA STATS
//     //
//     // IMPORTANT:
//     // We aggregate only existing records.
//     // Users without records will be added below
//     // with 0 values.
//     // =======================================================

//     const stats =
//       await SurveyData.aggregate([
//         {
//           $match: {
//             createdBy: {
//               $in: memberIds,
//             },
//           },
//         },

//         {
//           $group: {
//             _id: "$createdBy",

//             totalRecords: {
//               $sum: 1,
//             },

//             lastSubmitted: {
//               $max: "$createdAt",
//             },

//             categories: {
//               $addToSet: "$category",
//             },
//           },
//         },
//       ]);

//     // =======================================================
//     // CREATE STATS MAP
//     // =======================================================

//     const statsMap = new Map(
//       stats.map((stat) => [
//         String(stat._id),
//         stat,
//       ])
//     );

//     // =======================================================
//     // BUILD FINAL DATA
//     //
//     // DO NOT FILTER totalRecords > 0
//     //
//     // This is the important change that makes users with
//     // zero submissions visible.
//     // =======================================================

//     const data = members
//       .map((member) => {
//         const memberId =
//           String(member._id);

//         const stat =
//           statsMap.get(memberId);

//         return {
//           _id: member._id,

//           name:
//             member.name || "Unnamed User",

//           email:
//             member.email || "",

//           role:
//             member.role || "survey-tester",

//           phoneNumber:
//             member.phoneNumber || "",

//           // 0 when no SurveyData exists
//           totalRecords:
//             stat?.totalRecords || 0,

//           lastSubmitted:
//             stat?.lastSubmitted || null,

//           categories:
//             stat?.categories || [],
//         };
//       })

//       // =====================================================
//       // SORTING
//       //
//       // Users with submissions first.
//       // Users with 0 submissions remain visible at bottom.
//       // =====================================================

//       .sort((a, b) => {
//         // Submitted users first
//         if (
//           a.totalRecords > 0 &&
//           b.totalRecords === 0
//         ) {
//           return -1;
//         }

//         if (
//           a.totalRecords === 0 &&
//           b.totalRecords > 0
//         ) {
//           return 1;
//         }

//         // Latest submission first
//         const dateA = a.lastSubmitted
//           ? new Date(
//               a.lastSubmitted
//             ).getTime()
//           : 0;

//         const dateB = b.lastSubmitted
//           ? new Date(
//               b.lastSubmitted
//             ).getTime()
//           : 0;

//         return dateB - dateA;
//       });

//     // =======================================================
//     // RESPONSE
//     // =======================================================

//     return NextResponse.json({
//       success: true,
//       data,
//       count: data.length,
//     });
//   } catch (error: any) {
//     console.error(
//       "GET /api/SurveyData/team-members ERROR:",
//       error
//     );

//     return NextResponse.json(
//       {
//         success: false,
//         message:
//           error?.message ||
//           "Failed to fetch team members",
//       },
//       { status: 500 }
//     );
//   }
// }


import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import Team from "@/models/Team";
import SurveyData from "@/models/SurveyData";
import { getCurrentUser } from "@/lib/getuser";

/* =========================================================
   ROLE HELPERS (values must be in normalized form)
========================================================= */

function normalizeRole(role: unknown): string {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

const TEAM_LEAD_ROLES = new Set(["teamlead"]);

const FULL_ACCESS_ROLES = new Set([
  "admin",
  "hr",
  "seniorteamlead",
  "dataqualityanalyst",
]);

/* =========================================================
   GET TEAM MEMBERS + SURVEY/OE STATS

   TEAM LEAD:
   - Can ONLY see their own team members
   - Cannot override teamLeadId from frontend
   - Includes members with 0 submissions

   ADMIN / HR / SENIOR TEAM LEAD / DATA QUALITY ANALYST:
   - teamLeadId optional
   - With teamLeadId    -> that lead's teams
   - Without teamLeadId -> all active teams
========================================================= */

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    // =======================================================
    // AUTHENTICATION
    // =======================================================

    if (!currentUser?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").trim();

    let teamLeadId: string | null = searchParams.get("teamLeadId");

    const role = normalizeRole(currentUser.role);

    // =======================================================
    // ROLE SECURITY
    // =======================================================

    if (TEAM_LEAD_ROLES.has(role)) {
      // Ignore any teamLeadId from the frontend.
      // Always force the logged-in team lead.
      teamLeadId = String(currentUser.userId);
    } else if (!FULL_ACCESS_ROLES.has(role)) {
      console.warn(
        "team-members 403 - unrecognized role:",
        currentUser.role,
        "->",
        role
      );

      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // =======================================================
    // VALIDATE teamLeadId (only if provided)
    // =======================================================

    if (teamLeadId && !mongoose.Types.ObjectId.isValid(teamLeadId)) {
      return NextResponse.json(
        { success: false, message: "Invalid teamLeadId" },
        { status: 400 }
      );
    }

    // =======================================================
    // GET ACTIVE TEAMS
    // =======================================================

    const teamQuery: Record<string, any> = { isActive: true };

    if (teamLeadId) {
      teamQuery.teamLead = teamLeadId;
    }

    const teams = await Team.find(teamQuery)
      .populate("members", "name email role phoneNumber")
      .lean();

    if (!teams.length) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    // =======================================================
    // COLLECT UNIQUE TEAM MEMBERS
    // =======================================================

    const memberMap = new Map<string, any>();

    for (const team of teams as any[]) {
      for (const member of team.members || []) {
        if (!member?._id) continue;

        memberMap.set(String(member._id), member);
      }
    }

    let members = Array.from(memberMap.values());

    // =======================================================
    // SEARCH
    // =======================================================

    if (search) {
      const searchLower = search.toLowerCase();

      members = members.filter((member) => {
        const name = String(member.name || "").toLowerCase();
        const email = String(member.email || "").toLowerCase();

        return name.includes(searchLower) || email.includes(searchLower);
      });
    }

    // =======================================================
    // NO MEMBERS
    // =======================================================

    if (!members.length) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    // =======================================================
    // SURVEY DATA STATS
    // (users without records are added below with 0 values)
    // =======================================================

    const memberIds = members.map((member) => member._id);

    const stats = await SurveyData.aggregate([
      {
        $match: {
          createdBy: { $in: memberIds },
        },
      },
      {
        $group: {
          _id: "$createdBy",
          totalRecords: { $sum: 1 },
          lastSubmitted: { $max: "$createdAt" },
          categories: { $addToSet: "$category" },
        },
      },
    ]);

    const statsMap = new Map(stats.map((stat) => [String(stat._id), stat]));

    // =======================================================
    // BUILD FINAL DATA (members with 0 submissions included)
    // =======================================================

    const data = members
      .map((member) => {
        const stat = statsMap.get(String(member._id));

        return {
          _id: member._id,
          name: member.name || "Unnamed User",
          email: member.email || "",
          role: member.role || "survey-tester",
          phoneNumber: member.phoneNumber || "",
          totalRecords: stat?.totalRecords || 0,
          lastSubmitted: stat?.lastSubmitted || null,
          categories: stat?.categories || [],
        };
      })

      // Submitted users first, then latest submission first
      .sort((a, b) => {
        if (a.totalRecords > 0 && b.totalRecords === 0) return -1;
        if (a.totalRecords === 0 && b.totalRecords > 0) return 1;

        const dateA = a.lastSubmitted
          ? new Date(a.lastSubmitted).getTime()
          : 0;

        const dateB = b.lastSubmitted
          ? new Date(b.lastSubmitted).getTime()
          : 0;

        return dateB - dateA;
      });

    // =======================================================
    // RESPONSE
    // =======================================================

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error: any) {
    console.error("GET /api/survey/team-members ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to fetch team members",
      },
      { status: 500 }
    );
  }
}