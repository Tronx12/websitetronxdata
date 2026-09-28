import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import Team from "@/models/Team";
import SurveyData from "@/models/SurveyData";
import { getCurrentUser } from "@/lib/getuser";

export async function GET(req: NextRequest) {
  try {
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
      !["admin", "hr", "team-lead"].includes(
        currentUser.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } =
      new URL(req.url);

    const teamId =
      searchParams.get("teamId");

    const month =
      searchParams.get("month") ||
      new Date()
        .toISOString()
        .slice(0, 7);

    if (!teamId) {
      return NextResponse.json(
        {
          success: false,
          message: "teamId is required",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid month",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // GET TEAM
    // --------------------------------------------------

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

    // Team lead can only see own team
    if (
      currentUser.role === "team-lead" &&
      String(
        (team.teamLead as any)?._id
      ) !==
        String(currentUser.userId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    const members =
      (team.members || []) as any[];

    if (!members.length) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const memberIds =
      members.map((member) =>
        member._id
      );

    // --------------------------------------------------
    // MONTH DATE RANGE
    // --------------------------------------------------

    const [year, monthNumber] =
      month.split("-").map(Number);

    const startDate = new Date(
      year,
      monthNumber - 1,
      1
    );

    const endDate = new Date(
      year,
      monthNumber,
      1
    );

    // --------------------------------------------------
    // AGGREGATE SURVEY DATA BY USER + DAY
    // --------------------------------------------------

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
                  timezone: "Asia/Kolkata",
                },
              },
            },

            totalSubmit: {
              $sum: 1,
            },
          },
        },
      ]);

    // --------------------------------------------------
    // MAP
    // --------------------------------------------------

    const statsMap =
      new Map<string, number>();

    for (const item of stats) {
      const key =
        `${String(item._id.userId)}_${item._id.date}`;

      statsMap.set(
        key,
        item.totalSubmit
      );
    }

    // --------------------------------------------------
    // NUMBER OF DAYS IN MONTH
    // --------------------------------------------------

    const daysInMonth =
      new Date(
        year,
        monthNumber,
        0
      ).getDate();

    // --------------------------------------------------
    // BUILD RESULT
    // EVERY USER + EVERY DAY
    // --------------------------------------------------

    const result: any[] = [];

    for (
      const member of members
    ) {
      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {
        const dateObject =
          new Date(
            year,
            monthNumber - 1,
            day
          );

        const date =
          `${year}-${String(
            monthNumber
          ).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;

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