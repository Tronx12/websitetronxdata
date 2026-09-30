// import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import Leave from "@/models/Leave";
import Auth from "@/models/Auth";

import { connectDB } from "@/config/db";
import { getCurrentUser } from "@/lib/getuser";
import { normalizeRole } from "@/lib/leaveRules";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATION
     * =====================================================
     */

    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await connectDB();

    /*
     * =====================================================
     * LEAVE ID
     * =====================================================
     */

    const { id } = await params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid leave id",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * LOAD CURRENT USER
     * =====================================================
     */

    const user =
      await Auth.findById(
        currentUser.userId
      )
        .select(
          "_id name email role teamId isActive"
        )
        .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    if (user.isActive !== true) {
      return NextResponse.json(
        {
          success: false,
          message: "Account is inactive",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * LOAD LEAVE
     * =====================================================
     */

    const leave =
      await Leave.findById(id)
        .populate(
          "employeeId",
          "name email role teamId"
        )
        .populate(
          "teamId",
          "name code"
        )
        .populate(
          "approvalHistory.approverId",
          "name email role"
        );

    if (!leave) {
      return NextResponse.json(
        {
          success: false,
          message: "Leave not found",
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * ACCESS CONTROL
     *
     * Employee:
     *   Can view only their own leave.
     *
     * Team Lead:
     *   Can view their team's leave.
     *
     * Senior Team Lead:
     *   Can view pending leave at their level
     *   and requests that have progressed through
     *   the workflow.
     *
     * HR:
     *   Can view leave requests.
     *
     * Admin:
     *   Can view leave requests.
     * =====================================================
     */

    const role =
      normalizeRole(user.role);

    const employeeId =
      leave.employeeId &&
      typeof leave.employeeId === "object" &&
      "_id" in leave.employeeId
        ? String(
            (leave.employeeId as any)._id
          )
        : String(leave.employeeId);

    const leaveTeamId =
      leave.teamId &&
      typeof leave.teamId === "object" &&
      "_id" in leave.teamId
        ? String(
            (leave.teamId as any)._id
          )
        : String(leave.teamId || "");

    const currentUserId =
      String(currentUser.userId);

    /*
     * =====================================================
     * EMPLOYEE ACCESS
     * =====================================================
     */

    if (
      role !== "team-lead" &&
      role !== "senior-teamlead" &&
      role !== "hr" &&
      role !== "admin"
    ) {
      if (
        employeeId !== currentUserId
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You can view only your own leave requests.",
          },
          { status: 403 }
        );
      }
    }

    /*
     * =====================================================
     * TEAM LEAD ACCESS
     *
     * Team Lead can only view requests
     * belonging to their assigned team.
     * =====================================================
     */

    if (role === "team-lead") {
      if (!user.teamId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You are not assigned to a team.",
          },
          { status: 403 }
        );
      }

      if (
        !leaveTeamId ||
        leaveTeamId !==
          String(user.teamId)
      ) {
        /*
         * Allow Team Lead to view their own leave,
         * if they have submitted one.
         */
        if (
          employeeId !==
          currentUserId
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "You can view leave requests only for your assigned team.",
            },
            { status: 403 }
          );
        }
      }
    }

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,
      data: leave,
    });
  } catch (error) {
    console.error(
      "GET /api/leaves/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Internal server error",
      },
      { status: 500 }
    );
  }
}