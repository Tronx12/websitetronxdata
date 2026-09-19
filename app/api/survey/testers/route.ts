// import { NextRequest, NextResponse } from "next/server";
// import mongoose from "mongoose";

// import { connectDB } from "@/config/db";
// import SurveyData from "@/models/SurveyData";

// /**
//  * GET /api/survey/testers
//  * Returns list of survey testers with total record counts.
//  * Also includes records where createdBy is null as "Unknown / Unassigned".
//  */
// export async function GET(req: NextRequest) {
//   try {
//     await connectDB();

//     const { searchParams } = new URL(req.url);
//     const search = searchParams.get("search") || "";
//     const limit = Math.min(
//       100,
//       Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
//     );

//     const pipeline: any[] = [
//       // Group by createdBy (null becomes one group)
//       {
//         $group: {
//           _id: "$createdBy",
//           totalRecords: { $sum: 1 },
//           lastSubmitted: { $max: "$createdAt" },
//           categories: { $addToSet: "$category" },
//         },
//       },
//       {
//         $sort: { totalRecords: -1 },
//       },
//       {
//         $limit: limit,
//       },
//       {
//         $lookup: {
//           from: "auths",
//           localField: "_id",
//           foreignField: "_id",
//           as: "user",
//         },
//       },
//       {
//         $unwind: {
//           path: "$user",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           totalRecords: 1,
//           lastSubmitted: 1,
//           categories: 1,
//           name: {
//             $cond: {
//               if: { $eq: ["$_id", null] },
//               then: "Unknown / Unassigned",
//               else: {
//                 $ifNull: ["$user.name", "$user.fullName", "Unknown Tester"],
//               },
//             },
//           },
//           email: {
//             $cond: {
//               if: { $eq: ["$_id", null] },
//               then: "",
//               else: { $ifNull: ["$user.email", ""] },
//             },
//           },
//           role: {
//             $cond: {
//               if: { $eq: ["$_id", null] },
//               then: "unknown",
//               else: { $ifNull: ["$user.role", "survey_tester"] },
//             },
//           },
//         },
//       },
//     ];

//     if (search.trim()) {
//       pipeline.push({
//         $match: {
//           $or: [
//             { name: { $regex: search, $options: "i" } },
//             { email: { $regex: search, $options: "i" } },
//           ],
//         },
//       });
//     }

//     const testers = await SurveyData.aggregate(pipeline);

//     return NextResponse.json({
//       success: true,
//       data: testers,
//       total: testers.length,
//     });
//   } catch (error: any) {
//     console.error("Survey testers GET error:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         message: "Failed to fetch survey testers",
//         error: error?.message || String(error),
//       },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";

/**
 * GET /api/survey/testers
 *
 * Returns survey testers with:
 * - Total submitted records
 * - Last submitted date
 * - Categories used by the tester
 * - Tester name/email/role
 *
 * Records with createdBy = null are returned as:
 * "Unknown / Unassigned"
 *
 * Supports:
 * - B2B
 * - B2C
 * - Healthcare
 * - B2H (legacy)
 *
 * Query params:
 * ?search=shivam
 * ?limit=50
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").trim();

    const requestedLimit = parseInt(
      searchParams.get("limit") || "50",
      10
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.isNaN(requestedLimit) ? 50 : requestedLimit)
    );

    /**
     * Escape user search input before using it
     * inside a MongoDB regex.
     */
    const escapeRegex = (value: string) =>
      value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const safeSearch = escapeRegex(search);

    const pipeline: any[] = [
      /**
       * Group survey records by creator.
       *
       * createdBy = null will automatically form
       * the Unknown / Unassigned group.
       */
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

      /**
       * Get the corresponding user from Auth collection.
       */
      {
        $lookup: {
          from: "auths",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },

      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      /**
       * Normalize user information.
       */
      {
        $project: {
          _id: 1,

          totalRecords: 1,

          lastSubmitted: 1,

          /**
           * Remove null/empty categories.
           *
           * Supports:
           * B2B
           * B2C
           * Healthcare
           * B2H legacy
           */
          categories: {
            $filter: {
              input: "$categories",
              as: "category",
              cond: {
                $and: [
                  { $ne: ["$$category", null] },
                  { $ne: ["$$category", ""] },
                ],
              },
            },
          },

          name: {
            $cond: {
              if: {
                $eq: ["$_id", null],
              },
              then: "Unknown / Unassigned",
              else: {
                $ifNull: [
                  "$user.name",
                  {
                    $ifNull: [
                      "$user.fullName",
                      "Unknown Tester",
                    ],
                  },
                ],
              },
            },
          },

          email: {
            $cond: {
              if: {
                $eq: ["$_id", null],
              },
              then: "",
              else: {
                $ifNull: ["$user.email", ""],
              },
            },
          },

          role: {
            $cond: {
              if: {
                $eq: ["$_id", null],
              },
              then: "unknown",
              else: {
                $ifNull: ["$user.role", "survey_tester"],
              },
            },
          },

          phoneNumber: {
            $cond: {
              if: {
                $eq: ["$_id", null],
              },
              then: "",
              else: {
                $ifNull: ["$user.phoneNumber", ""],
              },
            },
          },
        },
      },
    ];

    /**
     * IMPORTANT:
     *
     * Search is performed BEFORE sorting and limiting.
     *
     * This fixes the previous problem where:
     *
     *   $limit -> $match
     *
     * could hide matching testers.
     */
    if (safeSearch) {
      pipeline.push({
        $match: {
          $or: [
            {
              name: {
                $regex: safeSearch,
                $options: "i",
              },
            },
            {
              email: {
                $regex: safeSearch,
                $options: "i",
              },
            },
          ],
        },
      });
    }

    /**
     * Sort highest record count first.
     *
     * Most recently submitted tester is used as a
     * secondary sorting criterion.
     */
    pipeline.push({
      $sort: {
        totalRecords: -1,
        lastSubmitted: -1,
      },
    });

    /**
     * Apply limit AFTER search.
     */
    pipeline.push({
      $limit: limit,
    });

    const testers = await SurveyData.aggregate(pipeline);

    /**
     * Make sure categories are clean and predictable.
     */
    const data = testers.map((tester: any) => ({
      _id: tester._id,

      name: tester.name || "Unknown Tester",

      email: tester.email || "",

      role: tester.role || "survey_tester",

      phoneNumber: tester.phoneNumber || "",

      totalRecords: Number(tester.totalRecords || 0),

      lastSubmitted: tester.lastSubmitted || null,

      categories: Array.from(
        new Set(
          (tester.categories || [])
            .filter(Boolean)
            .map((category: string) => {
              const value = String(category).trim();

              /**
               * Normalize legacy category naming.
               */
              if (value === "B2H") {
                return "Healthcare";
              }

              return value;
            })
        )
      ),
    }));

    return NextResponse.json({
      success: true,

      data,

      total: data.length,

      meta: {
        limit,

        search: search || null,

        supportedCategories: [
          "B2B",
          "B2C",
          "Healthcare",
        ],
      },
    });
  } catch (error: any) {
    console.error("Survey testers GET error:", error);

    return NextResponse.json(
      {
        success: false,

        message: "Failed to fetch survey testers",

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