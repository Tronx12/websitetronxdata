// app/api/SurveyData/team-members/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import Team from "@/models/Team";
import SurveyData from "@/models/SurveyData"; // ⚠️ confirm this is your actual SurveyData model name/path
import { getCurrentUser } from "@/lib/getuser";

/* =========================================================
   GET TEAM MEMBERS (scoped to a single team lead) + their
   SurveyData submission stats — used by the Team Lead dashboard
   to list ONLY their own team's testers, never all testers.
========================================================= */

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    // Authentication
    if (!currentUser?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();

    // A team lead can only ever query their own team. Admin/HR may pass
    // a specific teamLeadId to inspect a given team lead's team.
    let teamLeadId = searchParams.get("teamLeadId");

    if (currentUser.role === "team-lead") {
      teamLeadId = currentUser.userId; // ignore any client-supplied id, force self
    } else if (!["admin", "hr"].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    if (!teamLeadId) {
      return NextResponse.json(
        { success: false, message: "teamLeadId is required" },
        { status: 400 }
      );
    }

    // Find the team(s) this person leads (normally just one, but support many)
    const teams = await Team.find({
      teamLead: teamLeadId,
      isActive: true,
    })
      .populate("members", "name email role phoneNumber")
      .lean();

    if (!teams.length) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Flatten + dedupe members across all teams this lead owns
    const memberMap = new Map<string, any>();
    for (const team of teams) {
      for (const member of team.members || []) {
        memberMap.set(String(member._id), member);
      }
    }

    let members = Array.from(memberMap.values());

    if (search) {
      const re = new RegExp(search, "i");
      members = members.filter(
        (m) => re.test(m.name || "") || re.test(m.email || "")
      );
    }

    if (!members.length) {
      return NextResponse.json({ success: true, data: [] });
    }

    const memberIds = members.map((m) => m._id);

    // Aggregate each member's SurveyData submission stats
    const stats = await SurveyData.aggregate([
      { $match: { createdBy: { $in: memberIds } } },
      {
        $group: {
          _id: "$createdBy",
          totalRecords: { $sum: 1 },
          lastSubmitted: { $max: "$createdAt" },
          categories: { $addToSet: "$category" },
        },
      },
    ]);

    const statsMap = new Map(stats.map((s) => [String(s._id), s]));

    const data = members
      .map((m) => {
        const s = statsMap.get(String(m._id));
        return {
          _id: m._id,
          name: m.name,
          email: m.email,
          role: m.role,
          totalRecords: s?.totalRecords || 0,
          lastSubmitted: s?.lastSubmitted || null,
          categories: s?.categories || [],
        };
      })
      // only show members who've actually submitted something,
      // same convention as the existing /api/SurveyData/testers route
      .filter((m) => m.totalRecords > 0)
      .sort(
        (a, b) =>
          new Date(b.lastSubmitted || 0).getTime() -
          new Date(a.lastSubmitted || 0).getTime()
      );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET /api/SurveyData/team-members ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to fetch team members",
      },
      { status: 500 }
    );
  }
}