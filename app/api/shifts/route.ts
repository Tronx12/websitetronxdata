import {
  NextRequest,
  NextResponse,
} from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import Shift from "@/models/Shift";
import { getCurrentUser } from "@/lib/getuser";

export async function GET() {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const shifts = await Shift.find({
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: shifts,
    });
  } catch (error) {
    console.error("GET SHIFTS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load shifts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const {
      shiftId,
      name,
      code,
      startTime,
      endTime,
      crossesMidnight = false,
      graceMinutes = 0,
    } = body;

    if (
      !name?.trim() ||
      !code?.trim() ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, code, start time and end time are required",
        },
        { status: 400 }
      );
    }

    let shift;
    if (shiftId && mongoose.Types.ObjectId.isValid(shiftId)) {
      shift = await Shift.findByIdAndUpdate(
        shiftId,
        {
          $set: {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            startTime,
            endTime,
            crossesMidnight: crossesMidnight === true,
            graceMinutes: Number(graceMinutes) || 0,
            updatedBy: new mongoose.Types.ObjectId(user.userId),
          },
        },
        { new: true }
      );
    } else {
      shift = await Shift.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        startTime,
        endTime,
        crossesMidnight: crossesMidnight === true,
        graceMinutes: Number(graceMinutes) || 0,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(user.userId),
        updatedBy: new mongoose.Types.ObjectId(user.userId),
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: shiftId ? "Shift updated successfully" : "Shift created successfully",
        data: shift,
      },
      { status: shiftId ? 200 : 201 }
    );
  } catch (error: any) {
    console.error("CREATE/UPDATE SHIFT ERROR:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Shift code already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to save shift" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid shift ID is required" },
        { status: 400 }
      );
    }

    const shift = await Shift.findById(id);
    if (!shift) {
      return NextResponse.json(
        { success: false, message: "Shift not found" },
        { status: 404 }
      );
    }

    shift.isActive = false;
    shift.updatedBy = new mongoose.Types.ObjectId(user.userId);
    await shift.save();

    return NextResponse.json({
      success: true,
      message: "Shift deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE SHIFT ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete shift" },
      { status: 500 }
    );
  }
}