import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";

/**
 * GET /api/survey/testers
 * Returns list of survey testers with total record counts.
 * Also includes records where createdBy is null as "Unknown / Unassigned".
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );

    const pipeline: any[] = [
      // Group by createdBy (null becomes one group)
      {
        $group: {
          _id: "$createdBy",
          totalRecords: { $sum: 1 },
          lastSubmitted: { $max: "$createdAt" },
          categories: { $addToSet: "$category" },
        },
      },
      {
        $sort: { totalRecords: -1 },
      },
      {
        $limit: limit,
      },
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
      {
        $project: {
          _id: 1,
          totalRecords: 1,
          lastSubmitted: 1,
          categories: 1,
          name: {
            $cond: {
              if: { $eq: ["$_id", null] },
              then: "Unknown / Unassigned",
              else: {
                $ifNull: ["$user.name", "$user.fullName", "Unknown Tester"],
              },
            },
          },
          email: {
            $cond: {
              if: { $eq: ["$_id", null] },
              then: "",
              else: { $ifNull: ["$user.email", ""] },
            },
          },
          role: {
            $cond: {
              if: { $eq: ["$_id", null] },
              then: "unknown",
              else: { $ifNull: ["$user.role", "survey_tester"] },
            },
          },
        },
      },
    ];

    if (search.trim()) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    const testers = await SurveyData.aggregate(pipeline);

    return NextResponse.json({
      success: true,
      data: testers,
      total: testers.length,
    });
  } catch (error: any) {
    console.error("Survey testers GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch survey testers",
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}