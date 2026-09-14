import { NextRequest, NextResponse } from "next/server";

import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/getuser";

export async function POST(req: NextRequest) {
  try {
    // ============================================
    // GET CURRENT LOGGED-IN USER
    // ============================================
    const user = await getCurrentUser();

    // ============================================
    // CREATE LOGOUT AUDIT
    // ============================================
    if (user?.userId) {
      await createAuditLog({
        userId: user.userId,
        action: "LOGOUT",
        module: "Authentication",
        description: "User logged out successfully",
        entityType: "Auth",
        entityId: user.userId,
        metadata: {
          userId: user.userId,
        },
        ipAddress:
          req.headers
            .get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim() ||
          req.headers.get("x-real-ip") ||
          null,
        userAgent:
          req.headers.get("user-agent") || null,
      });
    }

    // ============================================
    // LOGOUT RESPONSE
    // ============================================
    const response = NextResponse.json({
      success: true,
      message: "Logout successful",
    });

    // ============================================
    // CLEAR ACCESS TOKEN
    // IMPORTANT: Same name as login API
    // ============================================
    response.cookies.set("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    // ============================================
    // CLEAR REFRESH TOKEN
    // IMPORTANT: Same name as login API
    // ============================================
    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    // Even if audit fails, still clear cookies
    const response = NextResponse.json({
      success: true,
      message: "Logout successful",
    });

    response.cookies.set("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    return response;
  }
}