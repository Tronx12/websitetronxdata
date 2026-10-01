import { NextRequest, NextResponse } from "next/server";
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

    /*
     * Account must be active.
     */

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
        )
        .lean();

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
     * NORMALIZE CURRENT USER ROLE
     * =====================================================
     */

    const role =
      normalizeRole(user.role);

    /*
     * =====================================================
     * GET EMPLOYEE ID
     * =====================================================
     */

    const employeeId =
      leave.employeeId &&
      typeof leave.employeeId === "object" &&
      "_id" in leave.employeeId
        ? String(
            (leave.employeeId as any)._id
          )
        : String(
            leave.employeeId
          );

    /*
     * =====================================================
     * GET LEAVE TEAM ID
     * =====================================================
     */

    const leaveTeamId =
      leave.teamId &&
      typeof leave.teamId === "object" &&
      "_id" in leave.teamId
        ? String(
            (leave.teamId as any)._id
          )
        : String(
            leave.teamId || ""
          );

    /*
     * =====================================================
     * CURRENT USER ID
     * =====================================================
     */

    const currentUserId =
      String(currentUser.userId);

    /*
     * =====================================================
     * EMPLOYEE ACCESS
     * =====================================================
     *
     * Normal employees can only view their own
     * leave requests.
     *
     * Approval roles have broader access.
     */

    const approvalRoles = [
      "team-lead",
      "senior-teamlead",
      "hr",
      "admin",
    ];

    const isApprovalRole =
      approvalRoles.includes(role);

    if (!isApprovalRole) {
      if (
        employeeId !==
        currentUserId
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
     * =====================================================
     *
     * Team Lead can view:
     *
     * 1. Their own leave
     * 2. Leave requests belonging to their team
     *
     * This matches the Team Lead approval scope.
     */

    if (
      role === "team-lead"
    ) {
      /*
       * Own leave is always allowed.
       */

      if (
        employeeId ===
        currentUserId
      ) {
        return NextResponse.json({
          success: true,
          data: leave,
        });
      }

      /*
       * Team Lead must have a team.
       */

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

      /*
       * Leave must belong to a team.
       */

      if (!leaveTeamId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This leave request is not assigned to a team.",
          },
          { status: 403 }
        );
      }

      /*
       * Team must match.
       */

      if (
        leaveTeamId !==
        String(user.teamId)
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

    /*
     * =====================================================
     * SENIOR TEAM LEAD / HR / ADMIN
     * =====================================================
     *
     * These roles can view leave requests.
     *
     * Their actual approval permission is checked
     * separately by the approve endpoint.
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

    if (error instanceof Error) {
      console.error(
        "ERROR MESSAGE:",
        error.message
      );

      console.error(
        "ERROR STACK:",
        error.stack
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}