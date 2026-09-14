// app/api/auth/users/route.ts

import { NextResponse } from "next/server";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import { getCurrentUser } from "@/lib/getuser";

const allowedRoles = ["admin", "hr", "team-lead"];

export async function GET() {
  try {
    const user = await getCurrentUser();

    console.log("===== USERS API USER =====");
    console.log(user);

    // Authentication check
    if (!user?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // Authorization check
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const users = await Auth.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error: any) {
    console.error("GET /api/auth/users ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}