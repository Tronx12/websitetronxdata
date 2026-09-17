import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import {
  createAccessToken,
  createRefreshToken,
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

    // Generate new access and refresh tokens
    const accessToken = createAccessToken(
      user._id.toString(),
      user.role,
      user.email
    );
    const newRefreshToken = createRefreshToken(user._id.toString());

    const response = NextResponse.json({
      success: true,
      message: "Token refreshed",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Set access token cookie (1 day)
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    // Set refresh token cookie (30 days - rolling extension)
    response.cookies.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
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