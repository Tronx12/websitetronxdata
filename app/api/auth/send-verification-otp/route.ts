import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import { transporter } from "@/config/mailer";

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
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
          success: false,
          message: "Email is already verified",
        },
        { status: 400 }
      );
    }

    // Generate 6 digit OTP
    const otp = generateOtp();

    // Store hashed OTP
    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    user.emailVerificationOtp = hashedOtp;

    // OTP valid for 10 minutes
    user.emailVerificationOtpExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Verify your email",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Email Verification</h2>

          <p>Hello ${user.name},</p>

          <p>Your verification OTP is:</p>

          <h1 style="letter-spacing: 8px;">
            ${otp}
          </h1>

          <p>This OTP will expire in <strong>10 minutes</strong>.</p>

          <p>If you did not request this code, please ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Verification OTP sent to your email",
    });
  } catch (error) {
    console.error("SEND OTP ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to send verification OTP",
      },
      { status: 500 }
    );
  }
}
