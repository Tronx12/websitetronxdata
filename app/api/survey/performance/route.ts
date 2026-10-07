import { NextRequest, NextResponse } from "next/server";

import mongoose from "mongoose";



import { connectDB } from "@/config/db";

import SurveyData from "@/models/SurveyData";

import SurveyTarget from "@/models/SurveyTarget";

import Auth from "@/models/Auth";

import Team from "@/models/Team";

import { getCurrentUser } from "@/lib/getuser";



// ============================================================

// ROLE NORMALIZER

// Removes spaces, underscores and hyphens, then lowercases.

// "Senior-TeamLead" -> "seniorteamlead"

// ============================================================



function normalizeRole(role: unknown): string {

  return String(role || "")

    .trim()

    .toLowerCase()

    .replace(/[\s_-]+/g, "");

}



// ============================================================

// ROLE GROUPS (values MUST be in normalized form)

// ============================================================



const SURVEY_ROLES = new Set(["survey", "surveytester", "tester"]);



const TEAM_LEAD_ROLES = new Set(["teamlead"]);



const FULL_ACCESS_ROLES = new Set([

  "hr",

  "admin",

  "seniorteamlead",

  "dataqualityanalyst",

]);



// ============================================================

// GET PERFORMANCE

// ============================================================



export async function GET(request: NextRequest) {

  try {

    await connectDB();



    // ========================================================

    // AUTHENTICATED USER

    // ========================================================



    const currentUser = await getCurrentUser();



    if (!currentUser?.userId) {

      return NextResponse.json(

        { success: false, message: "Unauthorized" },

        { status: 401 }

      );

    }



    const currentUserId = String(currentUser.userId);

    const role = normalizeRole(currentUser.role);



    // ========================================================

    // QUERY PARAMS

    // ========================================================



    const { searchParams } = new URL(request.url);



    const month =

      searchParams.get("month") || new Date().toISOString().slice(0, 7);



    const selectedDate = searchParams.get("date");



    // ========================================================

    // VALIDATE INPUTS

    // ========================================================



    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {

      return NextResponse.json(

        { success: false, message: "Invalid month. Use YYYY-MM" },

        { status: 400 }

      );

    }



    if (selectedDate && !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {

      return NextResponse.json(

        { success: false, message: "Invalid date. Use YYYY-MM-DD" },

        { status: 400 }

      );

    }



    // ========================================================

    // FIND ALLOWED USERS

    // ========================================================



    let allowedUserIds: string[] = [];



    if (SURVEY_ROLES.has(role)) {

      // Survey tester: own data only

      allowedUserIds = [currentUserId];

    } else if (TEAM_LEAD_ROLES.has(role)) {

      // Team lead: resolve membership from Team.teamLead -> Team.members.
      // Do not depend on Auth.teamId because Team is the authoritative
      // source used by the Team Members API.
      const leadTeams = await Team.find({
        teamLead: currentUserId,
        isActive: true,
      })
        .select("members")
        .lean();

      const memberIds = new Set<string>();

      for (const team of leadTeams as any[]) {
        for (const memberId of team.members || []) {
          if (memberId) memberIds.add(String(memberId));
        }
      }

      // Always include the logged-in Team Lead.
      memberIds.add(currentUserId);
      allowedUserIds = Array.from(memberIds);

    } else if (FULL_ACCESS_ROLES.has(role)) {

      // HR / Admin / Senior Team Lead / Data Quality Analyst: everyone

      const users = await Auth.find({

        isDeleted: { $ne: true },

        isActive: { $ne: false },

      })

        .select("_id")

        .lean();



      allowedUserIds = users.map((user: any) => String(user._id));

    } else {

      console.warn(

        "Performance 403 - unrecognized role:",

        currentUser.role,

        "->",

        role

      );



      return NextResponse.json(

        {

          success: false,

          message: "You do not have permission to view performance",

        },

        { status: 403 }

      );

    }



    // ========================================================

    // OBJECT IDS

    // ========================================================



    const objectIds = allowedUserIds

      .filter((id) => mongoose.Types.ObjectId.isValid(id))

      .map((id) => new mongoose.Types.ObjectId(id));



    // ========================================================

    // MONTH DATE RANGE (IST boundaries, matches daily grouping)

    // ========================================================



    const [year, monthNumber] = month.split("-").map(Number);



    const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;

    const nextYear = monthNumber === 12 ? year + 1 : year;



    const startDate = new Date(`${month}-01T00:00:00+05:30`);



    const endDate = new Date(

      `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+05:30`

    );



    const monthMatch = {

      createdBy: { $in: objectIds },

      createdAt: { $gte: startDate, $lt: endDate },

    };



    // ========================================================

    // DAILY PERFORMANCE

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
                  { $ifNull: ["$counts", "1"] },
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
              $cond: [{ $gt: ["$$parsed", 0] }, "$$parsed", 1],
            },
          },
        },
      },
    };

    const dailyPerformance = await SurveyData.aggregate([

      { $match: monthMatch },

      {

        $group: {

          _id: {

            $dateToString: {

              format: "%Y-%m-%d",

              date: "$createdAt",

              timezone: "Asia/Kolkata",

            },

          },

          completed: { $sum: countExpression },

        },

      },

      { $sort: { _id: 1 } },

    ]);



    // ========================================================

    // TOTAL COMPLETED

    // ========================================================



    const completedResult = await SurveyData.aggregate([

      { $match: monthMatch },

      { $group: { _id: null, completed: { $sum: countExpression } } },

    ]);



    const completed = completedResult[0]?.completed || 0;



    // ========================================================

    // TARGETS

    // ========================================================



    const targets = await SurveyTarget.find({

      userId: { $in: objectIds },

      month,

    })

      .populate("userId", "name email role")

      .lean();



    const firstTargetTotal = targets.reduce(

      (total: number, item: any) => total + Number(item.firstTarget || 0),

      0

    );



    const secondTargetTotal = targets.reduce(

      (total: number, item: any) => total + Number(item.secondTarget || 0),

      0

    );



    const target = targets.reduce(

      (total: number, item: any) =>

        total +

        (Number(item.firstTarget || 0) + Number(item.secondTarget || 0) ||

          Number(item.target || 0)),

      0

    );



    // ========================================================

    // REMAINING + ACHIEVEMENT

    // ========================================================



    const remaining = Math.max(target - completed, 0);



    const achievement =

      target > 0 ? Number(((completed / target) * 100).toFixed(2)) : 0;



    // ========================================================

    // USER-WISE PERFORMANCE

    // ========================================================



    const userPerformance = await SurveyData.aggregate([

      { $match: monthMatch },

      { $group: { _id: "$createdBy", completed: { $sum: countExpression } } },

    ]);



    const performanceMap = new Map<string, number>(

      userPerformance.map((item: any) => [String(item._id), item.completed])

    );



    // ========================================================

    // USERS

    // ========================================================



    const users = await Auth.find({

      _id: { $in: objectIds },

      isDeleted: { $ne: true },

    })

      .select("_id name email role teamId")

      .lean();



    // ========================================================

    // USER PERFORMANCE RESPONSE

    // ========================================================



    const userStats = users.map((user: any) => {

      const userTarget: any = targets.find(

        (item: any) => String(item.userId?._id) === String(user._id)

      );



      const userCompleted = performanceMap.get(String(user._id)) || 0;



      const userFirstTarget = Number(userTarget?.firstTarget || 0);

      const userSecondTarget = Number(userTarget?.secondTarget || 0);



      const userTargetValue =

        userFirstTarget + userSecondTarget || Number(userTarget?.target || 0);



      const userRemaining = Math.max(userTargetValue - userCompleted, 0);



      const userAchievement =

        userTargetValue > 0

          ? Number(((userCompleted / userTargetValue) * 100).toFixed(2))

          : 0;



      return {

        userId: String(user._id),

        name: user.name || user.email || "Unknown",

        email: user.email || "",

        role: user.role || "",

        firstTarget: userFirstTarget,

        secondTarget: userSecondTarget,

        target: userTargetValue,

        completed: userCompleted,

        remaining: userRemaining,

        achievement: userAchievement,

      };

    });



    // ========================================================

    // DATE FILTER

    // ========================================================



    let dateRecords: any[] = [];



    if (selectedDate) {

      const dateStart = new Date(`${selectedDate}T00:00:00+05:30`);

      const dateEnd = new Date(`${selectedDate}T23:59:59.999+05:30`);



      dateRecords = await SurveyData.find({

        createdBy: { $in: objectIds },

        createdAt: { $gte: dateStart, $lte: dateEnd },

      })

        .sort({ createdAt: -1 })

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

        firstTarget: firstTargetTotal,

        secondTarget: secondTargetTotal,

        target,

        completed,

        remaining,

        achievement,

      },



      dailyPerformance: dailyPerformance.map((item: any) => ({

        date: item._id,

        completed: item.completed,

      })),



      users: userStats,



      date: selectedDate || null,

      dateRecords,

    });

  } catch (error: any) {

    console.error("SURVEY PERFORMANCE ERROR:", error);



    return NextResponse.json(

      {

        success: false,

        message: error?.message || "Failed to load survey performance",

      },

      { status: 500 }

    );

  }

}