import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Attendance from "@/models/Attendance";
import { connectDB } from "@/config/db";
import { createAuditLog } from "@/lib/auditLog";

type Params = {
  params: Promise<{ id: string }>;
};

// GET /api/attendance/[id]
export async function GET(request: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const record = await Attendance.findById(id)
      .populate("userId", "name email workingShift role")
      .populate("updatedBy", "name email");

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("GET /api/attendance/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/attendance/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { updatedBy, ...updates } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const record = await Attendance.findByIdAndUpdate(
      id,
      {
        ...updates,
        ...(updatedBy && { updatedBy }),
      },
      { new: true, runValidators: true }
    )
      .populate("userId", "name email workingShift role")
      .populate("updatedBy", "name email");

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    await createAuditLog({
      userId: updatedBy || (record.userId as any)?._id || null,
      action: "UPDATE",
      module: "Attendance",
      description: `Updated attendance record ${id}`,
      entityType: "Attendance",
      entityId: id,
      metadata: updates,
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("PUT /api/attendance/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/attendance/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const deleted = await Attendance.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    await createAuditLog({
      userId: (deleted as any).userId || null,
      action: "DELETE",
      module: "Attendance",
      description: `Deleted attendance record ${id}`,
      entityType: "Attendance",
      entityId: id,
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/attendance/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}