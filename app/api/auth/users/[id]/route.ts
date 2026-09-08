import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import { requireRole } from "@/lib/authorize";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(
  req: NextRequest,
  { params }: Params
) {
  try {
    requireRole(req, [
      "admin",
      "hr",
      "team-lead",
    ]);

    const { id } = await params;

    await connectDB();

    const user = await Auth.findById(id)
      .select("-password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    const status =
      error.message === "FORBIDDEN"
        ? 403
        : 401;

    return NextResponse.json(
      {
        success: false,
        message:
          error.message === "FORBIDDEN"
            ? "Forbidden"
            : "Unauthorized",
      },
      { status }
    );
  }
}


export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    const authUser = requireRole(req, [
      "admin",
      "hr",
      "survey-tester",
    ]);

    const { id } = await params;

    const body = await req.json();

    await connectDB();

    const allowedFields = [
      "name",
      "email",
      "phoneNumber",
      "role",
    ];

    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    updateData.updatedBy = authUser.userId;

    const user = await Auth.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Update failed",
      },
      { status: 500 }
    );
  }
}


export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  try {
    requireRole(req, ["admin"]);

    const { id } = await params;

    await connectDB();

    const user = await Auth.findByIdAndDelete(id);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Delete failed",
      },
      { status: 500 }
    );
  }
}
