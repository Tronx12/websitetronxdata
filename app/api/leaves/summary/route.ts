import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/getuser";
import { connectDB } from "@/config/db";

import { getPaidLeaveSummary } from "@/lib/leaveRules";

export async function GET(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATED USER
     *
     * Do NOT get userId from:
     *
     * ?userId=
     *
     * Instead use the existing JWT/session.
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

    /*
     * =====================================================
     * DATABASE
     * =====================================================
     */

    await connectDB();

    /*
     * =====================================================
     * CURRENT MONTH
     *
     * Your rule:
     *
     * Every employee gets 1 paid leave per
     * calendar month.
     *
     * More than 3 absent days:
     * paid leave becomes unavailable.
     * =====================================================
     */

    const now = new Date();

    const year =
      now.getFullYear();

    const month =
      now.getMonth() + 1;

    /*
     * =====================================================
     * CALCULATE PAID LEAVE SUMMARY
     * =====================================================
     */

    const summary =
      await getPaidLeaveSummary(
        currentUser.userId,
        year,
        month
      );

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error(
      "GET /api/leaves/summary error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load leave summary",
      },
      { status: 500 }
    );
  }
}