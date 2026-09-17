import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import Team from "@/models/Team";
import Auth from "@/models/Auth";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const query: any = { isActive: true };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const teams = await Team.find(query)
      .populate("teamLead", "name email role")
      .populate("members", "name email role phoneNumber")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Team.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: teams,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser || !["admin", "hr"].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description, teamLeadId, memberIds = [] } = body;

    if (!name || !teamLeadId) {
      return NextResponse.json(
        { success: false, message: "Name and team lead are required" },
        { status: 400 }
      );
    }

    // Validate team lead
    const lead = await Auth.findById(teamLeadId);
    if (!lead || lead.role !== "team-lead") {
      return NextResponse.json(
        { success: false, message: "Invalid team lead" },
        { status: 400 }
      );
    }

    // Validate members
    if (memberIds.length > 0) {
      const members = await Auth.find({
        _id: { $in: memberIds },
        role: "survey-tester",
      });
      if (members.length !== memberIds.length) {
        return NextResponse.json(
          { success: false, message: "One or more members are invalid" },
          { status: 400 }
        );
      }
    }

    // Prevent duplicate name
    const exists = await Team.findOne({ name: name.trim() });
    if (exists) {
      return NextResponse.json(
        { success: false, message: "Team name already exists" },
        { status: 400 }
      );
    }

    const team = await Team.create({
      name: name.trim(),
      description,
      teamLead: teamLeadId,
      members: memberIds,
      createdBy: currentUser.userId,
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "CREATE",
      module: "Team",
      description: `Created team '${team.name}'`,
      entityType: "Team",
      entityId: String(team._id),
      metadata: { name: team.name, teamLeadId, memberCount: memberIds.length },
    });

    const populated = await Team.findById(team._id)
      .populate("teamLead", "name email")
      .populate("members", "name email");

    return NextResponse.json(
      { success: true, data: populated },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}