// // app/api/SurveyData/team-members/route.ts

// import { NextRequest, NextResponse } from "next/server";
// import { connectDB } from "@/config/db";
// import Team from "@/models/Team";
// import SurveyData from "@/models/SurveyData"; // ⚠️ confirm this is your actual SurveyData model name/path
// import { getCurrentUser } from "@/lib/getuser";

// /* =========================================================
//    GET TEAM MEMBERS (scoped to a single team lead) + their
//    SurveyData submission stats — used by the Team Lead dashboard
//    to list ONLY their own team's testers, never all testers.
// ========================================================= */

// export async function GET(req: NextRequest) {
//   try {
//     const currentUser = await getCurrentUser();

//     // Authentication
//     if (!currentUser?.userId) {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized" },
//         { status: 401 }
//       );
//     }

//     await connectDB();

//     const { searchParams } = new URL(req.url);
//     const search = (searchParams.get("search") || "").trim();

//     // A team lead can only ever query their own team. Admin/HR may pass
//     // a specific teamLeadId to inspect a given team lead's team.
//     let teamLeadId = searchParams.get("teamLeadId");

//     if (currentUser.role === "team-lead") {
//       teamLeadId = currentUser.userId; // ignore any client-supplied id, force self
//     } else if (!["admin", "hr"].includes(currentUser.role)) {
//       return NextResponse.json(
//         { success: false, message: "Forbidden" },
//         { status: 403 }
//       );
//     }

//     if (!teamLeadId) {
//       return NextResponse.json(
//         { success: false, message: "teamLeadId is required" },
//         { status: 400 }
//       );
//     }

//     // Find the team(s) this person leads (normally just one, but support many)
//     const teams = await Team.find({
//       teamLead: teamLeadId,
//       isActive: true,
//     })
//       .populate("members", "name email role phoneNumber")
//       .lean();

//     if (!teams.length) {
//       return NextResponse.json({ success: true, data: [] });
//     }

//     // Flatten + dedupe members across all teams this lead owns
//     const memberMap = new Map<string, any>();
//     for (const team of teams) {
//       for (const member of team.members || []) {
//         memberMap.set(String(member._id), member);
//       }
//     }

//     let members = Array.from(memberMap.values());

//     if (search) {
//       const re = new RegExp(search, "i");
//       members = members.filter(
//         (m) => re.test(m.name || "") || re.test(m.email || "")
//       );
//     }

//     if (!members.length) {
//       return NextResponse.json({ success: true, data: [] });
//     }

//     const memberIds = members.map((m) => m._id);

//     // Aggregate each member's SurveyData submission stats
//     const stats = await SurveyData.aggregate([
//       { $match: { createdBy: { $in: memberIds } } },
//       {
//         $group: {
//           _id: "$createdBy",
//           totalRecords: { $sum: 1 },
//           lastSubmitted: { $max: "$createdAt" },
//           categories: { $addToSet: "$category" },
//         },
//       },
//     ]);

//     const statsMap = new Map(stats.map((s) => [String(s._id), s]));

//     const data = members
//       .map((m) => {
//         const s = statsMap.get(String(m._id));
//         return {
//           _id: m._id,
//           name: m.name,
//           email: m.email,
//           role: m.role,
//           totalRecords: s?.totalRecords || 0,
//           lastSubmitted: s?.lastSubmitted || null,
//           categories: s?.categories || [],
//         };
//       })
//       // only show members who've actually submitted something,
//       // same convention as the existing /api/SurveyData/testers route
//       .filter((m) => m.totalRecords > 0)
//       .sort(
//         (a, b) =>
//           new Date(b.lastSubmitted || 0).getTime() -
//           new Date(a.lastSubmitted || 0).getTime()
//       );

//     return NextResponse.json({ success: true, data });
//   } catch (error: any) {
//     console.error("GET /api/SurveyData/team-members ERROR:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         message: error?.message || "Failed to fetch team members",
//       },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/config/db";
import Team from "@/models/Team";
import SurveyData from "@/models/SurveyData";
import { getCurrentUser } from "@/lib/getuser";

/* =========================================================
   GET TEAM MEMBERS + SURVEY/OE STATS

   TEAM LEAD:
   - Can ONLY see their own team members
   - Cannot override teamLeadId from frontend
   - Includes members with 0 submissions

   ADMIN / HR:
   - Can optionally provide teamLeadId
========================================================= */

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    // =======================================================
    // AUTHENTICATION
    // =======================================================

    if (!currentUser?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = (
      searchParams.get("search") || ""
    ).trim();

    let teamLeadId =
      searchParams.get("teamLeadId");

    // =======================================================
    // ROLE SECURITY
    // =======================================================

    if (currentUser.role === "team-lead") {
      /*
       * IMPORTANT:
       *
       * Ignore any teamLeadId supplied by frontend.
       * Always force the logged-in team lead.
       */
      teamLeadId = currentUser.userId;
    } else if (
      !["admin", "hr"].includes(currentUser.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // =======================================================
    // VALIDATE TEAM LEAD
    // =======================================================

    if (!teamLeadId) {
      return NextResponse.json(
        {
          success: false,
          message: "teamLeadId is required",
        },
        { status: 400 }
      );
    }

    // =======================================================
    // GET ONLY ACTIVE TEAMS BELONGING TO THIS TEAM LEAD
    // =======================================================

    const teams = await Team.find({
      teamLead: teamLeadId,
      isActive: true,
    })
      .populate(
        "members",
        "name email role phoneNumber"
      )
      .lean();

    // No team
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

    for (const team of teams) {
      for (const member of team.members || []) {
        if (!member?._id) continue;

        memberMap.set(
          String(member._id),
          member
        );
      }
    }

    let members = Array.from(
      memberMap.values()
    );

    // =======================================================
    // SEARCH
    // =======================================================

    if (search) {
      const searchLower =
        search.toLowerCase();

      members = members.filter((member) => {
        const name = String(
          member.name || ""
        ).toLowerCase();

        const email = String(
          member.email || ""
        ).toLowerCase();

        return (
          name.includes(searchLower) ||
          email.includes(searchLower)
        );
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
    // MEMBER IDS
    // =======================================================

    const memberIds = members.map(
      (member) => member._id
    );

    // =======================================================
    // GET SURVEY DATA STATS
    //
    // IMPORTANT:
    // We aggregate only existing records.
    // Users without records will be added below
    // with 0 values.
    // =======================================================

    const stats =
      await SurveyData.aggregate([
        {
          $match: {
            createdBy: {
              $in: memberIds,
            },
          },
        },

        {
          $group: {
            _id: "$createdBy",

            totalRecords: {
              $sum: 1,
            },

            lastSubmitted: {
              $max: "$createdAt",
            },

            categories: {
              $addToSet: "$category",
            },
          },
        },
      ]);

    // =======================================================
    // CREATE STATS MAP
    // =======================================================

    const statsMap = new Map(
      stats.map((stat) => [
        String(stat._id),
        stat,
      ])
    );

    // =======================================================
    // BUILD FINAL DATA
    //
    // DO NOT FILTER totalRecords > 0
    //
    // This is the important change that makes users with
    // zero submissions visible.
    // =======================================================

    const data = members
      .map((member) => {
        const memberId =
          String(member._id);

        const stat =
          statsMap.get(memberId);

        return {
          _id: member._id,

          name:
            member.name || "Unnamed User",

          email:
            member.email || "",

          role:
            member.role || "survey-tester",

          phoneNumber:
            member.phoneNumber || "",

          // 0 when no SurveyData exists
          totalRecords:
            stat?.totalRecords || 0,

          lastSubmitted:
            stat?.lastSubmitted || null,

          categories:
            stat?.categories || [],
        };
      })

      // =====================================================
      // SORTING
      //
      // Users with submissions first.
      // Users with 0 submissions remain visible at bottom.
      // =====================================================

      .sort((a, b) => {
        // Submitted users first
        if (
          a.totalRecords > 0 &&
          b.totalRecords === 0
        ) {
          return -1;
        }

        if (
          a.totalRecords === 0 &&
          b.totalRecords > 0
        ) {
          return 1;
        }

        // Latest submission first
        const dateA = a.lastSubmitted
          ? new Date(
              a.lastSubmitted
            ).getTime()
          : 0;

        const dateB = b.lastSubmitted
          ? new Date(
              b.lastSubmitted
            ).getTime()
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
    console.error(
      "GET /api/SurveyData/team-members ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch team members",
      },
      { status: 500 }
    );
  }
}