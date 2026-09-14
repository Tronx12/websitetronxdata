import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import { SurveyCategory } from "@/lib/survey-fields";

const VALID_CATEGORIES: SurveyCategory[] = ["B2B", "B2H", "B2C"];

// ======================================================
// PUT – Edit / Update a single survey record
// ======================================================
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid survey ID" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const allowed: Record<string, any> = {};

    if (body.category && VALID_CATEGORIES.includes(body.category)) {
      allowed.category = body.category;
    }
    if (body.accountType !== undefined) allowed.accountType = String(body.accountType).trim();
    if (body.projectNo !== undefined) allowed.projectNo = String(body.projectNo).trim();
    if (body.panelCode !== undefined) allowed.panelCode = String(body.panelCode).trim();
    if (body.description !== undefined) allowed.description = String(body.description).trim();
    if (body.pid !== undefined) allowed.pid = String(body.pid).trim();
    if (body.supplierId !== undefined) allowed.supplierId = String(body.supplierId).trim();
    if (body.country !== undefined) allowed.country = String(body.country).trim();
    if (body.ip !== undefined) allowed.ip = String(body.ip).trim();
    if (body.status !== undefined) allowed.status = String(body.status).trim();
    if (body.data !== undefined && typeof body.data === "object") {
      allowed.data = body.data;
    }
    if (body.rawPaste !== undefined) allowed.rawPaste = String(body.rawPaste);

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await SurveyData.findByIdAndUpdate(
      id,
      { $set: allowed },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Survey record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Record updated successfully",
      data: {
        ...updated,
        data: (updated as any).data || {},
      },
    });
  } catch (error: any) {
    console.error("Survey PUT error:", error);

    if (error?.name === "ValidationError") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update survey record",
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

// ======================================================
// DELETE – Remove a single survey record
// ======================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid survey ID" },
        { status: 400 }
      );
    }

    const deleted = await SurveyData.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Survey record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Record deleted successfully",
      data: {
        _id: (deleted as any)._id,
      },
    });
  } catch (error: any) {
    console.error("Survey DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete survey record",
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}