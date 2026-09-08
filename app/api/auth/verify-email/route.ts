import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and OTP are required",
        },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP must be 6 digits",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await Auth.findOne({
      email: email.toLowerCase(),
    }).select(
      "+emailVerificationOtp +emailVerificationOtpExpires"
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    if (user.isEmailVerified) {
      return NextResponse.json(
        {
          success: true,
          message: "Email is already verified",
        }
      );
    }

    if (
      !user.emailVerificationOtp ||
      !user.emailVerificationOtpExpires
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP not found. Please request a new OTP",
        },
        { status: 400 }
      );
    }

    if (
      user.emailVerificationOtpExpires.getTime() <
      Date.now()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP has expired. Please request a new OTP",
        },
        { status: 400 }
      );
    }

    // Hash entered OTP
    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    if (hashedOtp !== user.emailVerificationOtp) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid OTP",
        },
        { status: 400 }
      );
    }

    // Verify email
    user.isEmailVerified = true;

    // Remove OTP after successful verification
    user.emailVerificationOtp = null;
    user.emailVerificationOtpExpires = null;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Email verification failed",
      },
      { status: 500 }
    );
  }
}
