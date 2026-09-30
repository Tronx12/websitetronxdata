// import { NextRequest, NextResponse } from "next/server";
// import mongoose from "mongoose";
// import Leave from "@/models/Leave";
// import { connectDB } from "@/config/db";
// import {
//   normalizeRole,
// } from "@/lib/leaveRules";

// function getUserId(request: NextRequest) {
//   return request.headers.get("x-user-id");
// }

// export async function GET(
//   request: NextRequest
// ) {
//   try {
//     await connectDB();

//     const userId = getUserId(request);

//     if (
//       !userId ||
//       !mongoose.Types.ObjectId.isValid(userId)
//     ) {
//       return NextResponse.json(
//         { error: "Authentication required" },
//         { status: 401 }
//       );
//     }

//     const Auth =
//       (await import("@/models/Auth")).default;

//     const user = await Auth.findById(userId)
//       .select("_id name email role teamId")
//       .lean();

//     if (!user) {
//       return NextResponse.json(
//         { error: "User not found" },
//         { status: 404 }
//       );
//     }

//     const role = normalizeRole(user.role);

//     const levelMap: Record<string, string> = {
//       "team-lead": "PENDING_TEAM_LEAD",
//       "senior-teamlead":
//         "PENDING_SENIOR_TEAMLEAD",
//       hr: "PENDING_HR",
//       admin: "PENDING_ADMIN",
//     };

//     const status = levelMap[role];

//     if (!status) {
//       return NextResponse.json([]);
//     }

//     const filter: any = { status };

//     // Team Leads only see requests from their team.
//     if (role === "team-lead") {
//       filter.teamId = user.teamId || null;
//     }

//     const records = await Leave.find(filter)
//       .populate(
//         "employeeId",
//         "name email role teamId"
//       )
//       .populate(
//         "teamId",
//         "name code"
//       )
//       .sort({ createdAt: 1 });

//     return NextResponse.json(records);
//   } catch (error) {
//     console.error(
//       "GET /api/leaves/pending error:",
//       error
//     );

//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";

import Leave from "@/models/Leave";
import Auth from "@/models/Auth";

import { connectDB } from "@/config/db";
import { getCurrentUser } from "@/lib/getuser";

import {
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
     * NORMALIZE ROLE
     * =====================================================
     */

    const role = normalizeRole(
      user.role
    );

    /*
     * =====================================================
     * APPROVAL STATUS BY ROLE
     *
     * survey-tester
     *      ↓
     * team-lead
     *      ↓
     * senior-teamlead
     *      ↓
     * hr
     *      ↓
     * admin
     *
     * team-lead
     *      ↓
     * senior-teamlead
     *      ↓
     * hr
     *      ↓
     * admin
     *
     * senior-teamlead
     *      ↓
     * hr
     *      ↓
     * admin
     *
     * data-quality-analyst
     *      ↓
     * hr
     *      ↓
     * admin
     *
     * hr
     *      ↓
     * admin
     * =====================================================
     */

    const levelMap: Record<
      string,
      string
    > = {
      "team-lead":
        "PENDING_TEAM_LEAD",

      "senior-teamlead":
        "PENDING_SENIOR_TEAMLEAD",

      hr:
        "PENDING_HR",

      admin:
        "PENDING_ADMIN",
    };

    const status =
      levelMap[role];

    /*
     * Employees who are not approval authorities
     * don't have pending approvals.
     */

    if (!status) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    /*
     * =====================================================
     * BUILD FILTER
     * =====================================================
     */

    const filter: Record<
      string,
      unknown
    > = {
      status,
    };

    /*
     * =====================================================
     * TEAM LEAD SCOPE
     *
     * Team Leads can only approve leave requests
     * belonging to their own team.
     *
     * If the Team Lead has no team assigned,
     * return no requests rather than exposing
     * requests with teamId = null.
     * =====================================================
     */

    if (role === "team-lead") {
      if (!user.teamId) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      filter.teamId = user.teamId;
    }

    /*
     * =====================================================
     * FETCH PENDING REQUESTS
     * =====================================================
     */

    const records =
      await Leave.find(filter)
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
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,
      data: records,
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