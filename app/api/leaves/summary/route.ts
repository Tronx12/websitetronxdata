import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getuser";
import { connectDB } from "@/config/db";
import { getComprehensiveLeaveSummary } from "@/lib/leaveRules";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

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

    const { searchParams } = new URL(request.url);
    const now = new Date();

    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid year or month query parameter.",
        },
        { status: 400 }
      );
    }

    const summary = await getComprehensiveLeaveSummary(
      currentUser.userId,
      year,
      month
    );

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("GET /api/leaves/summary error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load leave summary",
      },
      { status: 500 }
    );
  }
}