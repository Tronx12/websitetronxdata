import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import {
  createAccessToken,
  verifyRefreshToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const refreshToken =
      req.cookies.get("refreshToken")?.value;

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

    const accessToken = createAccessToken(
      user._id.toString(),
      user.role
    );

    const response = NextResponse.json({
      success: true,
      message: "Token refreshed",
    });

    response.cookies.set("accessToken", accessToken, {
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
