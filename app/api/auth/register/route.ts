import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
// import { sendVerificationEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, email, phoneNumber, password, role, workingShift } = body;

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate workingShift if provided
    if (workingShift && !["day", "night"].includes(workingShift)) {
      return NextResponse.json(
        { success: false, message: "Working shift must be either 'day' or 'night'" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await Auth.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 409 }
      );
    }

    if (phoneNumber?.trim()) {
      const existingPhone = await Auth.findOne({
        phoneNumber: phoneNumber.trim(),
      });
      if (existingPhone) {
        return NextResponse.json(
          { success: false, message: "Phone number already registered" },
          { status: 409 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    const user = await Auth.create({
      name: name.trim(),
      email: normalizedEmail,
      phoneNumber: phoneNumber?.trim() || undefined,
      password: hashedPassword,
      role: role || "survey-tester",
      workingShift: workingShift || "day", // ← new field
      isEmailVerified: false,
      emailVerificationOtp: otp,
      emailVerificationOtpExpires: otpExpires,
    });

    // TODO: send the OTP
    // await sendVerificationEmail(user.email, otp);

    console.log(`[DEV] Email verification OTP for ${user.email}: ${otp}`);

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful. Please verify your email.",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          workingShift: user.workingShift,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, message: "Registration failed" },
      { status: 500 }
    );
  }
}