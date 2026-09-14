import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import Team from "@/models/Team";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role"); // "team-lead" | "survey-tester"
    const excludeTeamId = searchParams.get("excludeTeamId");

    if (!role || !["team-lead", "survey-tester"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Invalid role" },
        { status: 400 }
      );
    }

    // Users already assigned as lead or member
    const assignedQuery: any = {};
    if (role === "team-lead") {
      assignedQuery.teamLead = { $exists: true };
    } else {
      assignedQuery.members = { $exists: true };
    }

    const assignedTeams = await Team.find({ isActive: true }).select(
      role === "team-lead" ? "teamLead" : "members"
    );

    const assignedIds = new Set<string>();
    assignedTeams.forEach((t) => {
      if (role === "team-lead" && t.teamLead) {
        assignedIds.add(t.teamLead.toString());
      } else if (role === "survey-tester") {
        t.members.forEach((m: any) => assignedIds.add(m.toString()));
      }
    });

    // If editing a team, allow current lead/members to stay selected
    if (excludeTeamId) {
      const currentTeam = await Team.findById(excludeTeamId);
      if (currentTeam) {
        if (role === "team-lead") {
          assignedIds.delete(currentTeam.teamLead.toString());
        } else {
          currentTeam.members.forEach((m: any) =>
            assignedIds.delete(m.toString())
          );
        }
      }
    }

    const users = await Auth.find({
      role,
      _id: { $nin: Array.from(assignedIds) },
      isEmailVerified: true, // optional
    })
      .select("name email phoneNumber workingShift role")
      .sort({ name: 1 });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}