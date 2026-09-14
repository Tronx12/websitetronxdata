import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import {
  createAccessToken,
  verifyRefreshToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Must match the cookie name set in the login route
    const refreshToken = req.cookies.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Refresh token missing",
        },
        { status: 401 }
      );
    }

    const payload = verifyRefreshToken(refreshToken);

    await connectDB();

    const user = await Auth.findById(payload.userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 401 }
      );
    }

    // createAccessToken requires (userId, role, email) — all three, real values
    const accessToken = createAccessToken(
      user._id.toString(),
      user.role,
      user.email
    );

    const response = NextResponse.json({
      success: true,
      message: "Token refreshed",
    });

    // Must match the cookie name read everywhere else (access_token)
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 15,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid refresh token",
      },
      { status: 401 }
    );
  }
}