import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import {
  createAccessToken,
  createRefreshToken,
} from "@/lib/auth";

import { createAuditLog } from "@/lib/auditLog";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    // ============================================
    // VALIDATE INPUT
    // ============================================
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required",
        },
        { status: 400 }
      );
    }

    // ============================================
    // FIND USER
    // ============================================
    const user = await Auth.findOne({
      email,
    }).select("+password");

    // ============================================
    // USER NOT FOUND
    // ============================================
    if (!user) {
      await createAuditLog({
        action: "LOGIN",
        module: "Authentication",
        description: `Failed login attempt for ${email}`,
        metadata: {
          email,
          reason: "USER_NOT_FOUND",
        },
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          null,
        userAgent: req.headers.get("user-agent") || null,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // ============================================
    // CHECK PASSWORD
    // ============================================
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      await createAuditLog({
        userId: user._id.toString(),
        action: "LOGIN",
        module: "Authentication",
        description: `Failed login attempt for ${email}`,
        entityType: "Auth",
        entityId: user._id.toString(),
        metadata: {
          email,
          role: user.role,
          reason: "INVALID_PASSWORD",
        },
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          null,
        userAgent: req.headers.get("user-agent") || null,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // ============================================
    // CHECK EMAIL VERIFICATION
    // ============================================
    if (!user.isEmailVerified) {
      await createAuditLog({
        userId: user._id.toString(),
        action: "LOGIN",
        module: "Authentication",
        description: `Login blocked because email is not verified`,
        entityType: "Auth",
        entityId: user._id.toString(),
        metadata: {
          email: user.email,
          role: user.role,
          reason: "EMAIL_NOT_VERIFIED",
        },
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          null,
        userAgent: req.headers.get("user-agent") || null,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Please verify your email first",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    // ============================================
    // CREATE ACCESS TOKEN
    // ============================================
    const accessToken = createAccessToken(
      user._id.toString(),
      user.role,
      user.email
    );
    console.log(accessToken);
    // ============================================
    // CREATE REFRESH TOKEN
    // ============================================
    const refreshToken = createRefreshToken(
      user._id.toString()
    );
    console.log(refreshToken);
    // ============================================
    // RESPONSE
    // ============================================
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      },
      { status: 200 }
    );

    // ============================================
    // ACCESS TOKEN COOKIE
    // ============================================
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    // ============================================
    // REFRESH TOKEN COOKIE
    // ============================================
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    // ============================================
    // SUCCESS LOGIN AUDIT LOG
    // ============================================
    await createAuditLog({
      userId: user._id.toString(),
      action: "LOGIN",
      module: "Authentication",
      description: `User ${user.email} logged in successfully`,
      entityType: "Auth",
      entityId: user._id.toString(),
      metadata: {
        email: user.email,
        role: user.role,
      },
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null,
      userAgent: req.headers.get("user-agent") || null,
    });

    // ============================================
    // RETURN RESPONSE
    // ============================================
    return response;
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}