import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import SurveyTarget from "@/models/SurveyTarget";
import Auth from "@/models/Auth";
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
// GET PERFORMANCE
// ============================================================

export async function GET(
  request: NextRequest
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
        { status: 401 }
      );
    }

    const currentUserId =
      String(currentUser.userId);

    const role =
      normalizeRole(
        currentUser.role
      );

    // ========================================================
    // QUERY PARAMS
    // ========================================================

    const { searchParams } =
      new URL(request.url);

    const month =
      searchParams.get("month") ||
      new Date()
        .toISOString()
        .slice(0, 7);

    const selectedDate =
      searchParams.get("date");

    // ========================================================
    // VALIDATE MONTH
    // ========================================================

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid month. Use YYYY-MM",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // FIND ALLOWED USERS
    // ========================================================

    let allowedUserIds: string[] = [];

    // --------------------------------------------------------
    // SURVEY TESTER
    // --------------------------------------------------------

    if (
      role === "survey" ||
      role === "surveytester" ||
      role === "tester"
    ) {
      allowedUserIds = [
        currentUserId,
      ];
    }

    // --------------------------------------------------------
    // TEAM LEAD
    // --------------------------------------------------------

    else if (
      role === "teamlead"
    ) {
      const teamId =
        (currentUser as any)
          .teamId;

      if (!teamId) {
        allowedUserIds = [
          currentUserId,
        ];
      } else {
        const teamUsers =
          await Auth.find({
            teamId,

            isDeleted: {
              $ne: true,
            },

            isActive: {
              $ne: false,
            },
          })
            .select("_id")
            .lean();

        allowedUserIds =
          teamUsers.map(
            (user: any) =>
              String(user._id)
          );

        // Always include Team Lead
        if (
          !allowedUserIds.includes(
            currentUserId
          )
        ) {
          allowedUserIds.push(
            currentUserId
          );
        }
      }
    }

    // --------------------------------------------------------
    // HR / ADMIN
    // --------------------------------------------------------

    else if (
      role === "hr" ||
      role === "admin"
    ) {
      const users =
        await Auth.find({
          isDeleted: {
            $ne: true,
          },

          isActive: {
            $ne: false,
          },
        })
          .select("_id")
          .lean();

      allowedUserIds =
        users.map(
          (user: any) =>
            String(user._id)
        );
    }

    // --------------------------------------------------------
    // UNKNOWN ROLE
    // --------------------------------------------------------

    else {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to view performance",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // OBJECT IDS
    // ========================================================

    const objectIds =
      allowedUserIds
        .filter((id) =>
          mongoose.Types.ObjectId.isValid(
            id
          )
        )
        .map(
          (id) =>
            new mongoose.Types.ObjectId(id)
        );

    // ========================================================
    // MONTH DATE RANGE
    // ========================================================

    const [year, monthNumber] =
      month.split("-").map(Number);

    const startDate =
      new Date(
        Date.UTC(
          year,
          monthNumber - 1,
          1
        )
      );

    const endDate =
      new Date(
        Date.UTC(
          year,
          monthNumber,
          1
        )
      );

    // ========================================================
    // DAILY PERFORMANCE
    // ========================================================

    const dailyPerformance =
      await SurveyData.aggregate([
        {
          $match: {
            createdBy: {
              $in: objectIds,
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
              $dateToString: {
                format: "%Y-%m-%d",

                date: "$createdAt",

                timezone:
                  "Asia/Kolkata",
              },
            },

            completed: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]);

    // ========================================================
    // TOTAL COMPLETED
    // ========================================================

    const completedResult =
      await SurveyData.aggregate([
        {
          $match: {
            createdBy: {
              $in: objectIds,
            },

            createdAt: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },

        {
          $group: {
            _id: null,

            completed: {
              $sum: 1,
            },
          },
        },
      ]);

    const completed =
      completedResult[0]
        ?.completed || 0;

    // ========================================================
    // TARGETS
    // ========================================================

    const targets =
      await SurveyTarget.find({
        userId: {
          $in: objectIds,
        },

        month,
      })
        .populate(
          "userId",
          "name email role"
        )
        .lean();

    // ========================================================
    // TARGET TOTAL
    // ========================================================

    const target =
      targets.reduce(
        (
          total: number,
          item: any
        ) =>
          total +
          Number(item.target || 0),

        0
      );

    // ========================================================
    // REMAINING
    // ========================================================

    const remaining =
      Math.max(
        target - completed,
        0
      );

    // ========================================================
    // ACHIEVEMENT
    // ========================================================

    const achievement =
      target > 0
        ? Number(
            (
              (completed /
                target) *
              100
            ).toFixed(2)
          )
        : 0;

    // ========================================================
    // USER-WISE PERFORMANCE
    // ========================================================

    const userPerformance =
      await SurveyData.aggregate([
        {
          $match: {
            createdBy: {
              $in: objectIds,
            },

            createdAt: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },

        {
          $group: {
            _id: "$createdBy",

            completed: {
              $sum: 1,
            },
          },
        },
      ]);

    // ========================================================
    // USER PERFORMANCE MAP
    // ========================================================

    const performanceMap =
      new Map(
        userPerformance.map(
          (item: any) => [
            String(item._id),
            item.completed,
          ]
        )
      );

    // ========================================================
    // USERS
    // ========================================================

    const users =
      await Auth.find({
        _id: {
          $in: objectIds,
        },

        isDeleted: {
          $ne: true,
        },
      })
        .select(
          "_id name email role teamId"
        )
        .lean();

    // ========================================================
    // USER PERFORMANCE RESPONSE
    // ========================================================

    const userStats =
      users.map(
        (user: any) => {
          const userTarget =
            targets.find(
              (item: any) =>
                String(
                  item.userId?._id
                ) ===
                String(
                  user._id
                )
            );

          const userCompleted =
            performanceMap.get(
              String(user._id)
            ) || 0;

          const userTargetValue =
            Number(
              userTarget?.target ||
                0
            );

          const userRemaining =
            Math.max(
              userTargetValue -
                userCompleted,
              0
            );

          const userAchievement =
            userTargetValue > 0
              ? Number(
                  (
                    (userCompleted /
                      userTargetValue) *
                    100
                  ).toFixed(2)
                )
              : 0;

          return {
            userId:
              String(user._id),

            name:
              user.name ||
              user.email ||
              "Unknown",

            email:
              user.email || "",

            role:
              user.role || "",

            target:
              userTargetValue,

            completed:
              userCompleted,

            remaining:
              userRemaining,

            achievement:
              userAchievement,
          };
        }
      );

    // ========================================================
    // DATE FILTER
    // ========================================================

    let dateRecords: any[] = [];

    if (selectedDate) {
      const dateStart =
        new Date(
          `${selectedDate}T00:00:00+05:30`
        );

      const dateEnd =
        new Date(
          `${selectedDate}T23:59:59.999+05:30`
        );

      dateRecords =
        await SurveyData.find({
          createdBy: {
            $in: objectIds,
          },

          createdAt: {
            $gte: dateStart,
            $lte: dateEnd,
          },
        })
          .sort({
            createdAt: -1,
          })
          .lean();
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json({
      success: true,

      month,

      role,

      summary: {
        target,

        completed,

        remaining,

        achievement,
      },

      dailyPerformance:
        dailyPerformance.map(
          (item: any) => ({
            date: item._id,

            completed:
              item.completed,
          })
        ),

      users:
        userStats,

      date:
        selectedDate || null,

      dateRecords,
    });

  } catch (error: any) {
    console.error(
      "SURVEY PERFORMANCE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to load survey performance",
      },
      {
        status: 500,
      }
    );
  }
}