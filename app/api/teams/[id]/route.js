// app/api/teams/[id]/route.js

import { NextResponse } from "next/server";

import { connectDB } from "@/config/db";
import Team from "@/models/Team";
import Auth from "@/models/Auth";
import { getCurrentUser } from "@/lib/getuser";


/* =========================================================
   GET SINGLE TEAM
========================================================= */

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Team ID is required",
        },
        { status: 400 }
      );
    }

    const team = await Team.findById(id)
      .populate(
        "teamLead",
        "name email role phoneNumber"
      )
      .populate(
        "members",
        "name email role phoneNumber workingShift"
      )
      .populate(
        "createdBy",
        "name email"
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

    return NextResponse.json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error(
      "GET /api/teams/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch team",
      },
      { status: 500 }
    );
  }
}


/* =========================================================
   PUT UPDATE TEAM
========================================================= */

export async function PUT(req, { params }) {
  try {
    const currentUser = await getCurrentUser();

    console.log("===== UPDATE TEAM USER =====");
    console.log(currentUser);

    // Authentication
    if (!currentUser?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // Authorization
    if (
      !["admin", "hr"].includes(
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Team ID is required",
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      name,
      description,
      teamLeadId,
      memberIds,
      isActive,
    } = body;

    await connectDB();

    const team = await Team.findById(id);

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Team not found",
        },
        { status: 404 }
      );
    }

    /* -----------------------------------------
       NAME
    ----------------------------------------- */

    if (name !== undefined) {
      const trimmedName = String(name).trim();

      if (!trimmedName) {
        return NextResponse.json(
          {
            success: false,
            message: "Team name is required",
          },
          { status: 400 }
        );
      }

      team.name = trimmedName;
    }

    /* -----------------------------------------
       DESCRIPTION
    ----------------------------------------- */

    if (description !== undefined) {
      team.description = description;
    }

    /* -----------------------------------------
       ACTIVE STATUS
    ----------------------------------------- */

    if (typeof isActive === "boolean") {
      team.isActive = isActive;
    }

    /* -----------------------------------------
       TEAM LEAD
    ----------------------------------------- */

    if (teamLeadId !== undefined) {
      if (teamLeadId === null || teamLeadId === "") {
        team.teamLead = null;
      } else {
        const lead = await Auth.findById(
          teamLeadId
        ).select("_id role");

        if (
          !lead ||
          lead.role !== "team-lead"
        ) {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid team lead",
            },
            { status: 400 }
          );
        }

        team.teamLead = lead._id;
      }
    }

    /* -----------------------------------------
       MEMBERS
    ----------------------------------------- */

    if (memberIds !== undefined) {
      if (!Array.isArray(memberIds)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "memberIds must be an array",
          },
          { status: 400 }
        );
      }

      const members = await Auth.find({
        _id: {
          $in: memberIds,
        },
        role: "survey-tester",
      }).select("_id role");

      if (
        members.length !==
        memberIds.length
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more invalid members",
          },
          { status: 400 }
        );
      }

      team.members = memberIds;
    }

    /* -----------------------------------------
       SAVE
    ----------------------------------------- */

    await team.save();

    /* -----------------------------------------
       RETURN UPDATED TEAM
    ----------------------------------------- */

    const updated = await Team.findById(
      team._id
    )
      .populate(
        "teamLead",
        "name email role phoneNumber"
      )
      .populate(
        "members",
        "name email role phoneNumber workingShift"
      )
      .populate(
        "createdBy",
        "name email"
      )
      .lean();

    return NextResponse.json({
      success: true,
      message: "Team updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error(
      "PUT /api/teams/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to update team",
      },
      { status: 500 }
    );
  }
}


/* =========================================================
   DELETE TEAM
========================================================= */

export async function DELETE(
  req,
  { params }
) {
  try {
    const currentUser = await getCurrentUser();

    console.log("===== DELETE TEAM USER =====");
    console.log(currentUser);

    // Authentication
    if (!currentUser?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // Only admin and HR can delete teams
    if (
      !["admin", "hr"].includes(
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Team ID is required",
        },
        { status: 400 }
      );
    }

    await connectDB();

    /*
     * Soft delete
     */
    const team =
      await Team.findByIdAndUpdate(
        id,
        {
          $set: {
            isActive: false,
          },
        },
        {
          new: true,
        }
      );

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Team not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Team deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE /api/teams/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to delete team",
      },
      { status: 500 }
    );
  }
}