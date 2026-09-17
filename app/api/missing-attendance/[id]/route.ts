import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import MissingAttendanceRequest from "@/models/missing-attendance";
import Attendance from "@/models/Attendance";
import Auth from "@/models/Auth";
import { connectDB } from "@/config/db";
import { createAuditLog } from "@/lib/auditLog";

type Params = {
  params: Promise<{ id: string }>;
};

// GET /api/missing-attendance/[id]
export async function GET(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const record = await MissingAttendanceRequest.findById(id)
      .populate("userId", "name email workingShift role")
      .populate("reviewedBy", "name email")
      .populate("attendanceId");

    if (!record) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("GET /api/missing-attendance/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/missing-attendance/[id]  → Approve / Reject
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const { action, reviewedBy, reviewComment } = body; // action = "approve" | "reject"

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    if (!reviewedBy || !mongoose.Types.ObjectId.isValid(reviewedBy)) {
      return NextResponse.json(
        { error: "Valid reviewedBy (TL/HR/Admin) is required" },
        { status: 400 }
      );
    }

    const requestDoc = await MissingAttendanceRequest.findById(id);
    if (!requestDoc) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (requestDoc.status !== "pending") {
      return NextResponse.json(
        { error: `Request is already ${requestDoc.status}` },
        { status: 400 }
      );
    }

    // ────────────── REJECT ──────────────
    if (action === "reject") {
      requestDoc.status = "rejected";
      requestDoc.reviewedBy = reviewedBy;
      requestDoc.reviewComment = reviewComment || null;
      requestDoc.reviewedAt = new Date();
      await requestDoc.save();

      await createAuditLog({
        userId: reviewedBy,
        action: "UPDATE",
        module: "Missing Attendance",
        description: `Rejected missing attendance request for user ${requestDoc.userId}`,
        entityType: "MissingAttendanceRequest",
        entityId: id,
        metadata: { status: "rejected", reviewComment },
      });

      const populated = await MissingAttendanceRequest.findById(id)
        .populate("userId", "name email")
        .populate("reviewedBy", "name email");

      return NextResponse.json(populated);
    }

    // ────────────── APPROVE ──────────────
    // Create / Update Attendance record
    const targetDate = new Date(requestDoc.date);
    targetDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      userId: requestDoc.userId,
      date: targetDate,
    });

    if (!attendance) {
      attendance = new Attendance({
        userId: requestDoc.userId,
        date: targetDate,
      });
    }

    // Apply requested times
    if (requestDoc.requestedLoggingTime) {
      attendance.loggingTime = requestDoc.requestedLoggingTime;
    }
    if (requestDoc.requestedLogoutTime) {
      attendance.logoutTime = requestDoc.requestedLogoutTime;
    }
    if (requestDoc.requestedLunchStart) {
      attendance.lunchStart = requestDoc.requestedLunchStart;
    }
    if (requestDoc.requestedLunchEnd) {
      attendance.lunchEnd = requestDoc.requestedLunchEnd;
    }

    attendance.isManual = true;
    attendance.updatedBy = reviewedBy;

    // Optional: Calculate late based on requested login time
    if (requestDoc.requestedLoggingTime) {
      const user = await Auth.findById(requestDoc.userId).select("workingShift");
      if (user) {
        const login = new Date(requestDoc.requestedLoggingTime);
        let allowedHour = 10;
        let allowedMinute = 15;

        if (user.workingShift === "night") {
          allowedHour = 21;
          allowedMinute = 45;
        }

        const allowedTime = new Date(login);
        allowedTime.setHours(allowedHour, allowedMinute, 0, 0);

        if (login > allowedTime) {
          const diffMs = login.getTime() - allowedTime.getTime();
          attendance.isLate = true;
          attendance.lateByMinutes = Math.ceil(diffMs / (1000 * 60));
        } else {
          attendance.isLate = false;
          attendance.lateByMinutes = 0;
        }
      }
    }

    await attendance.save();

    // Update request
    requestDoc.status = "approved";
    requestDoc.reviewedBy = reviewedBy;
    requestDoc.reviewComment = reviewComment || null;
    requestDoc.reviewedAt = new Date();
    requestDoc.attendanceId = attendance._id;
    await requestDoc.save();

    await createAuditLog({
      userId: reviewedBy,
      action: "UPDATE",
      module: "Missing Attendance",
      description: `Approved missing attendance request for user ${requestDoc.userId}`,
      entityType: "MissingAttendanceRequest",
      entityId: id,
      metadata: { status: "approved", attendanceId: String(attendance._id) },
    });

    const populated = await MissingAttendanceRequest.findById(id)
      .populate("userId", "name email")
      .populate("reviewedBy", "name email")
      .populate("attendanceId");

    return NextResponse.json(populated);
  } catch (error) {
    console.error("PUT /api/missing-attendance/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/missing-attendance/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const deleted = await MissingAttendanceRequest.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    await createAuditLog({
      userId: (deleted as any).userId || null,
      action: "DELETE",
      module: "Missing Attendance",
      description: `Deleted missing attendance request ${id}`,
      entityType: "MissingAttendanceRequest",
      entityId: id,
    });

    return NextResponse.json({ message: "Request deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/missing-attendance/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}