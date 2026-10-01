import { NextRequest, NextResponse } from "next/server";

import Leave from "@/models/Leave";
import Auth from "@/models/Auth";

import { connectDB } from "@/config/db";
import { getCurrentUser } from "@/lib/getuser";

import {
  canApproveLeave,
  normalizeRole,
} from "@/lib/leaveRules";

export async function GET(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATION
     *
     * Never use:
     * - x-user-id
     * - query userId
     * - localStorage
     *
     * getCurrentUser() reads the authenticated
     * access/refresh token cookies.
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
     * LOAD CURRENT USER
     *
     * teamId is needed for Team Lead filtering.
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
     * Account must still be active.
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
     * NORMALIZE CURRENT USER ROLE
     * =====================================================
     */

    const role = normalizeRole(
      user.role
    );

    /*
     * =====================================================
     * ONLY PENDING_APPROVAL
     * =====================================================
     *
     * There is NO:
     *
     * PENDING_TEAM_LEAD
     * PENDING_SENIOR_TEAMLEAD
     * PENDING_HR
     * PENDING_ADMIN
     *
     * anymore.
     *
     * Every leave starts as:
     *
     * PENDING_APPROVAL
     *
     * Then we determine whether the current user is
     * authorized to approve each employee's leave.
     * =====================================================
     */

    const records =
      await Leave.find({
        status: "PENDING_APPROVAL",
      })
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
        .sort({
          createdAt: 1,
        })
        .lean();

    /*
     * =====================================================
     * FILTER BY APPROVAL PERMISSION
     * =====================================================
     *
     * Example:
     *
     * survey-tester
     *   -> team-lead
     *   -> senior-teamlead
     *   -> hr
     *   -> admin
     *
     * team-lead
     *   -> senior-teamlead
     *   -> hr
     *   -> admin
     *
     * data-quality-analyst
     *   -> hr
     *   -> admin
     *
     * senior-teamlead
     *   -> hr
     *   -> admin
     *
     * hr
     *   -> admin
     * =====================================================
     */

    const allowedRecords =
      records.filter((leave: any) => {
        /*
         * Never show the user's own leave
         * in pending approvals.
         */
        const employeeId =
          leave.employeeId?._id?.toString() ||
          leave.employeeId?.toString();

        if (
          employeeId ===
          user._id.toString()
        ) {
          return false;
        }

        /*
         * Check whether current user's role
         * can approve this employee's leave.
         */
        if (
          !canApproveLeave(
            leave.employeeRole,
            role
          )
        ) {
          return false;
        }

        /*
         * =================================================
         * TEAM LEAD SCOPE
         * =================================================
         *
         * Team Lead can only see leaves from
         * their own team.
         *
         * Other roles can see according to their
         * approval permission.
         */

        if (role === "team-lead") {
          if (!user.teamId) {
            return false;
          }

          const leaveTeamId =
            leave.teamId?._id?.toString() ||
            leave.teamId?.toString();

          if (
            leaveTeamId !==
            user.teamId.toString()
          ) {
            return false;
          }
        }

        return true;
      });

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,
      data: allowedRecords,
    });
  } catch (error) {
    console.error(
      "GET /api/leaves/pending error:",
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