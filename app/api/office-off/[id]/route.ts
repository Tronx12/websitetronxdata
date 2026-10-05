import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import OfficeOff from "@/models/OfficeOff";
import Attendance from "@/models/Attendance";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!["admin", "hr"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Admin or HR access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid office off ID" },
        { status: 400 }
      );
    }

    const officeOff = await OfficeOff.findById(id);
    if (!officeOff) {
      return NextResponse.json(
        { success: false, message: "Office off not found" },
        { status: 404 }
      );
    }

    /*
     * Soft delete is safer for attendance history.
     */
    officeOff.isActive = false;
    officeOff.updatedBy = new mongoose.Types.ObjectId(user.userId);
    await officeOff.save();

    // Clean up attendance records created for this office-off:
    // 1. Remove placeholder attendance records where user did not log in
    await Attendance.deleteMany({
      holidayId: officeOff._id,
      loggingTime: null,
    });

    // 2. For employees who actually logged in on that holiday, revert holiday flags
    await Attendance.updateMany(
      {
        holidayId: officeOff._id,
        loggingTime: { $ne: null },
      },
      {
        $set: {
          holiday: false,
          holidayId: null,
          status: "present",
        },
      }
    );

    await createAuditLog({
      userId: user.userId,
      action: "DELETE",
      module: "Office Off",
      description: `Deleted office off: ${officeOff.title}`,
      entityType: "OfficeOff",
      entityId: id,
      metadata: {
        date: officeOff.date,
        title: officeOff.title,
        type: officeOff.type,
        scope: officeOff.scope,
        groupId: officeOff.groupId,
        teamIds: officeOff.teamIds,
        shiftIds: officeOff.shiftIds,
        employeeIds: officeOff.employeeIds,
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent") || null,
    });

    return NextResponse.json({
      success: true,
      message: "Office off deleted successfully",
    });
  } catch (error) {
    console.error("DELETE OFFICE OFF ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete office off" },
      { status: 500 }
    );
  }
}