import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("access_token")?.value;
    let userId: string | null = null;
    let isTokenRefreshed = false;

    // 1. Try verify access token first
    if (accessToken) {
      try {
        const payload = verifyAccessToken(accessToken);
        if (payload.type === "access") {
          userId = payload.userId;
        }
      } catch {
        // Access token expired or invalid
      }
    }

    // 2. Fallback to refresh token if access token is invalid/expired
    if (!userId) {
      const refreshToken = req.cookies.get("refresh_token")?.value;
      if (refreshToken) {
        try {
          const payload = verifyRefreshToken(refreshToken);
          if (payload.type === "refresh") {
            userId = payload.userId;
            isTokenRefreshed = true;
          }
        } catch {
          // Refresh token invalid or expired
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await Auth.findById(userId).select("-password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      data: user,
    });

    // If token was refreshed or missing access_token, issue fresh cookies
    if (isTokenRefreshed) {
      const newAccessToken = createAccessToken(
        user._id.toString(),
        user.role,
        user.email
      );
      const newRefreshToken = createRefreshToken(user._id.toString());

      response.cookies.set("access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 1 day
        path: "/",
      });

      response.cookies.set("refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("AUTH ME ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Invalid or expired token",
      },
      { status: 401 }
    );
  }
}