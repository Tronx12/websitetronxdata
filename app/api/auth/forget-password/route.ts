import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import { transporter } from "@/config/mailer";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

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

    const user = await Auth.findOne({ email });

    // Don't reveal whether an account exists
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If the email exists, a reset OTP has been sent.",
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // OTP expires in 10 minutes
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpires;

    await user.save();

    // Send OTP email
    await transporter.sendMail({
      from: `"TronX CRM" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your TronX CRM Password Reset OTP",
      text: `Your password reset OTP is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2>Password Reset</h2>

          <p>We received a request to reset your TronX CRM password.</p>

          <p>Your OTP is:</p>

          <div style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            padding: 20px;
            background: #f5f5f5;
            text-align: center;
            margin: 20px 0;
          ">
            ${otp}
          </div>

          <p>This OTP will expire in <strong>10 minutes</strong>.</p>

          <p>
            If you did not request a password reset,
            you can safely ignore this email.
          </p>

          <hr />

          <p style="color: #777;">
            TronX CRM
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Password reset OTP sent successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}