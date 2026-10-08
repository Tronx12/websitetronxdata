// import { NextRequest, NextResponse } from "next/server";
// import { connectDB } from "@/config/db";
// import Team from "@/models/Team";
// import SurveyData from "@/models/SurveyData";
// import { getCurrentUser } from "@/lib/getuser";

// export async function GET(req: NextRequest) {
//   try {
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
//       !["admin", "hr", "team-lead","data-quality-analyst","senior-teamlead"].includes(
//         currentUser.role
//       )
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Forbidden",
//         },
//         { status: 403 }
//       );
//     }

//     await connectDB();

//     const { searchParams } =
//       new URL(req.url);

//     const teamId =
//       searchParams.get("teamId");

//     const month =
//       searchParams.get("month") ||
//       new Date()
//         .toISOString()
//         .slice(0, 7);

//     if (!teamId) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "teamId is required",
//         },
//         { status: 400 }
//       );
//     }

//     if (!/^\d{4}-\d{2}$/.test(month)) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Invalid month",
//         },
//         { status: 400 }
//       );
//     }

//     // --------------------------------------------------
//     // GET TEAM
//     // --------------------------------------------------

//     const team =
//       await Team.findById(teamId)
//         .populate(
//           "teamLead",
//           "name email role"
//         )
//         .populate(
//           "members",
//           "name email role"
//         )
//         .lean();

//     if (!team) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Team not found",
//         },
//         { status: 404 }
//       );
//     }

//     // Team lead can only see own team
//     if (
//       currentUser.role === "team-lead" &&
//       String(
//         (team.teamLead as any)?._id
//       ) !==
//         String(currentUser.userId)
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Forbidden",
//         },
//         { status: 403 }
//       );
//     }

//     const members =
//       (team.members || []) as any[];

//     if (!members.length) {
//       return NextResponse.json({
//         success: true,
//         data: [],
//       });
//     }

//     const memberIds =
//       members.map((member) =>
//         member._id
//       );

//     // --------------------------------------------------
//     // MONTH DATE RANGE
//     // --------------------------------------------------

//     const [year, monthNumber] =
//       month.split("-").map(Number);

//     const startDate = new Date(
//       year,
//       monthNumber - 1,
//       1
//     );

//     const endDate = new Date(
//       year,
//       monthNumber,
//       1
//     );

//     // --------------------------------------------------
//     // AGGREGATE SURVEY DATA BY USER + DAY
//     // --------------------------------------------------

//     const countExpression = {
//       $let: {
//         vars: {
//           raw: {
//             $ifNull: [
//               "$data.Counts",
//               {
//                 $ifNull: [
//                   "$data.counts",
//                   { $ifNull: ["$counts", "1"] },
//                 ],
//               },
//             ],
//           },
//         },
//         in: {
//           $let: {
//             vars: {
//               parsed: {
//                 $convert: {
//                   input: "$$raw",
//                   to: "int",
//                   onError: 1,
//                   onNull: 1,
//                 },
//               },
//             },
//             in: {
//               $cond: [{ $gt: ["$$parsed", 0] }, "$$parsed", 1],
//             },
//           },
//         },
//       },
//     };

//     const stats =
//       await SurveyData.aggregate([
//         {
//           $match: {
//             createdBy: {
//               $in: memberIds,
//             },

//             createdAt: {
//               $gte: startDate,
//               $lt: endDate,
//             },
//           },
//         },

//         {
//           $group: {
//             _id: {
//               userId: "$createdBy",

//               date: {
//                 $dateToString: {
//                   format: "%Y-%m-%d",
//                   date: "$createdAt",
//                   timezone: "Asia/Kolkata",
//                 },
//               },
//             },

//             totalSubmit: {
//               $sum: countExpression,
//             },
//           },
//         },
//       ]);

//     // --------------------------------------------------
//     // MAP
//     // --------------------------------------------------

//     const statsMap =
//       new Map<string, number>();

//     for (const item of stats) {
//       const key =
//         `${String(item._id.userId)}_${item._id.date}`;

//       statsMap.set(
//         key,
//         item.totalSubmit
//       );
//     }

//     // --------------------------------------------------
//     // NUMBER OF DAYS IN MONTH
//     // --------------------------------------------------

//     const daysInMonth =
//       new Date(
//         year,
//         monthNumber,
//         0
//       ).getDate();

//     // --------------------------------------------------
//     // BUILD RESULT
//     // EVERY USER + EVERY DAY
//     // --------------------------------------------------

//     const result: any[] = [];

//     for (
//       const member of members
//     ) {
//       for (
//         let day = 1;
//         day <= daysInMonth;
//         day++
//       ) {
//         const dateObject =
//           new Date(
//             year,
//             monthNumber - 1,
//             day
//           );

//         const date =
//           `${year}-${String(
//             monthNumber
//           ).padStart(2, "0")}-${String(
//             day
//           ).padStart(2, "0")}`;

//         const key =
//           `${String(member._id)}_${date}`;

//         result.push({
//           userId:
//             String(member._id),

//           username:
//             member.name ||
//             member.email,

//           email:
//             member.email,

//           date,

//           displayDate:
//             `${String(day).padStart(
//               2,
//               "0"
//             )}/${String(
//               monthNumber
//             ).padStart(
//               2,
//               "0"
//             )}/${year}`,

//           day:
//             dateObject.toLocaleDateString(
//               "en-IN",
//               {
//                 weekday: "long",
//               }
//             ),

//           totalSubmit:
//             statsMap.get(key) || 0,
//         });
//       }
//     }

//     return NextResponse.json({
//       success: true,

//       team: {
//         _id: String(team._id),
//         name: team.name,

//         teamLead:
//           (team.teamLead as any)?.name ||
//           "",
//       },

//       month,

//       data: result,
//     });
//   } catch (error: any) {
//     console.error(
//       "TEAM DAILY SURVEY ERROR:",
//       error
//     );

//     return NextResponse.json(
//       {
//         success: false,
//         message:
//           error?.message ||
//           "Failed to load team daily data",
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

// ============================================================
// ROLE NORMALIZER
// ============================================================

function normalizeRole(role: unknown): string {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

// ============================================================
// GET TEAM DAILY SURVEY DATA
// ============================================================

export async function GET(req: NextRequest) {
  try {
    // ========================================================
    // CURRENT USER
    // ========================================================

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

    // ========================================================
    // NORMALIZE ROLE
    // ========================================================

    const currentRole = normalizeRole(
      currentUser.role
    );

    // ========================================================
    // ALLOWED ROLES
    // ========================================================

    const allowedRoles = [
      "admin",
      "hr",
      "teamlead",
      "dataqualityanalyst",
      "seniorteamlead",
    ];

    if (!allowedRoles.includes(currentRole)) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // DATABASE
    // ========================================================

    await connectDB();

    // ========================================================
    // QUERY PARAMS
    // ========================================================

    const { searchParams } =
      new URL(req.url);

    const teamId =
      searchParams.get("teamId")?.trim();

    const month =
      searchParams.get("month") ||
      new Date()
        .toISOString()
        .slice(0, 7);

    // ========================================================
    // TEAM ID VALIDATION
    // ========================================================

    if (!teamId) {
      return NextResponse.json(
        {
          success: false,
          message: "teamId is required",
        },
        { status: 400 }
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        teamId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid teamId",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // MONTH VALIDATION
    // ========================================================

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid month",
        },
        { status: 400 }
      );
    }

    const [year, monthNumber] =
      month.split("-").map(Number);

    // Prevent invalid months such as 2026-99
    if (
      monthNumber < 1 ||
      monthNumber > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid month",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // GET TEAM
    // ========================================================

    const team =
      await Team.findById(teamId)
        .populate(
          "teamLead",
          "name email role"
        )
        .populate(
          "members",
          "name email role"
        )
        .lean();

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Team not found",
        },
        { status: 404 }
      );
    }

    // ========================================================
    // TEAM LEAD
    // ONLY OWN TEAM
    // ========================================================

    if (
      currentRole === "teamlead"
    ) {
      const teamLeadId =
        (team.teamLead as any)?._id;

      if (
        !teamLeadId ||
        String(teamLeadId) !==
          String(currentUser.userId)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You are not allowed to view this team",
          },
          { status: 403 }
        );
      }
    }

    // ========================================================
    // MEMBERS
    // ========================================================

    const members =
      (team.members || []) as any[];

    if (!members.length) {
      return NextResponse.json({
        success: true,

        team: {
          _id: String(team._id),
          name: team.name,

          teamLead:
            (team.teamLead as any)?.name ||
            "",
        },

        month,

        data: [],
      });
    }

    // ========================================================
    // MEMBER IDS
    // ========================================================

    const memberIds =
      members.map(
        (member) => member._id
      );

    // ========================================================
    // MONTH DATE RANGE
    //
    // IMPORTANT:
    // Query range is based on IST because your
    // grouping is also based on Asia/Kolkata.
    // ========================================================

    const startDate =
      new Date(
        `${month}-01T00:00:00+05:30`
      );

    const nextMonth =
      monthNumber === 12
        ? `${year + 1}-01`
        : `${year}-${String(
            monthNumber + 1
          ).padStart(2, "0")}`;

    const endDate =
      new Date(
        `${nextMonth}-01T00:00:00+05:30`
      );

    // ========================================================
    // COUNT EXPRESSION
    //
    // Counts = 2 means 2 surveys.
    // Counts = 5 means 5 surveys.
    // Missing/invalid Counts = 1.
    // ========================================================

    const countExpression = {
      $let: {
        vars: {
          raw: {
            $ifNull: [
              "$data.Counts",

              {
                $ifNull: [
                  "$data.counts",

                  {
                    $ifNull: [
                      "$counts",
                      1,
                    ],
                  },
                ],
              },
            ],
          },
        },

        in: {
          $let: {
            vars: {
              parsed: {
                $convert: {
                  input: "$$raw",
                  to: "int",
                  onError: 1,
                  onNull: 1,
                },
              },
            },

            in: {
              $cond: [
                {
                  $gt: [
                    "$$parsed",
                    0,
                  ],
                },

                "$$parsed",

                1,
              ],
            },
          },
        },
      },
    };

    // ========================================================
    // AGGREGATE SURVEY DATA
    // USER + DAY
    // ========================================================

    const stats =
      await SurveyData.aggregate([
        {
          $match: {
            createdBy: {
              $in: memberIds,
            },

            createdAt: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },

        {
          $group: {
            _id: {
              userId: "$createdBy",

              date: {
                $dateToString: {
                  format: "%Y-%m-%d",

                  date: "$createdAt",

                  timezone:
                    "Asia/Kolkata",
                },
              },
            },

            totalSubmit: {
              $sum: countExpression,
            },
          },
        },
      ]);

    // ========================================================
    // CREATE FAST LOOKUP MAP
    // ========================================================

    const statsMap =
      new Map<string, number>();

    for (const item of stats) {
      const userId =
        String(item._id.userId);

      const date =
        String(item._id.date);

      const key =
        `${userId}_${date}`;

      statsMap.set(
        key,
        Number(item.totalSubmit) || 0
      );
    }

    // ========================================================
    // DAYS IN MONTH
    // ========================================================

    const daysInMonth =
      new Date(
        year,
        monthNumber,
        0
      ).getDate();

    // ========================================================
    // BUILD RESULT
    //
    // EVERY MEMBER
    // +
    // EVERY DAY
    // ========================================================

    const result: any[] = [];

    for (const member of members) {
      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {
        const date =
          `${year}-${String(
            monthNumber
          ).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;

        const dateObject =
          new Date(
            year,
            monthNumber - 1,
            day
          );

        const key =
          `${String(member._id)}_${date}`;

        result.push({
          userId:
            String(member._id),

          username:
            member.name ||
            member.email,

          email:
            member.email,

          role:
            member.role || null,

          date,

          displayDate:
            `${String(day).padStart(
              2,
              "0"
            )}/${String(
              monthNumber
            ).padStart(
              2,
              "0"
            )}/${year}`,

          day:
            dateObject.toLocaleDateString(
              "en-IN",
              {
                weekday: "long",
              }
            ),

          totalSubmit:
            statsMap.get(key) || 0,
        });
      }
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json({
      success: true,

      team: {
        _id: String(team._id),

        name:
          team.name,

        teamLead:
          (team.teamLead as any)?.name ||
          "",
      },

      month,

      data: result,
    });

  } catch (error: any) {
    console.error(
      "TEAM DAILY SURVEY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to load team daily data",
      },
      { status: 500 }
    );
  }
}