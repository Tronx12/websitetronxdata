import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import MissingAttendanceRequest from "@/models/missing-attendance";
import Attendance from "@/models/Attendance";
import Auth from "@/models/Auth";
import { connectDB } from "@/config/db";

// GET /api/missing-attendance
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status"); // pending | approved | rejected
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter: any = {};

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
      }
      filter.userId = userId;
    }

    if (status) {
      filter.status = status;
    }

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const requests = await MissingAttendanceRequest.find(filter)
      .populate("userId", "name email workingShift role")
      .populate("reviewedBy", "name email")
      .populate("attendanceId")
      .sort({ createdAt: -1 });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET /api/missing-attendance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/missing-attendance  → Create new request
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      userId,
      date,
      requestedLoggingTime,
      requestedLogoutTime,
      requestedLunchStart,
      requestedLunchEnd,
      reason,
      attachment,
    } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId is required" }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "Reason is required (minimum 5 characters)" },
        { status: 400 }
      );
    }

    // Normalize date to start of day
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      userId,
      date: targetDate,
    });

    if (existingAttendance && existingAttendance.loggingTime) {
      return NextResponse.json(
        { error: "Attendance already exists for this date" },
        { status: 400 }
      );
    }

    // Check if a pending request already exists
    const existingRequest = await MissingAttendanceRequest.findOne({
      userId,
      date: targetDate,
      status: "pending",
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending request for this date" },
        { status: 400 }
      );
    }

    const newRequest = await MissingAttendanceRequest.create({
      userId,
      date: targetDate,
      requestedLoggingTime: requestedLoggingTime || null,
      requestedLogoutTime: requestedLogoutTime || null,
      requestedLunchStart: requestedLunchStart || null,
      requestedLunchEnd: requestedLunchEnd || null,
      reason: reason.trim(),
      attachment: attachment || null,
      status: "pending",
    });

    const populated = await MissingAttendanceRequest.findById(newRequest._id)
      .populate("userId", "name email workingShift role");

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/missing-attendance error:", error);

    // Handle duplicate key error from unique index
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "You already have a pending request for this date" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}