import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/config/db";
import IpWhitelist from "@/models/IpWhitelist";
import { isValidIp } from "@/lib/ip-validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await connectDB();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid IP whitelist ID",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const update: Record<string, unknown> = {};

    if (body.ipAddress !== undefined) {
      const ipAddress = String(
        body.ipAddress
      ).trim();

      if (!isValidIp(ipAddress)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid IP address",
          },
          { status: 400 }
        );
      }

      update.ipAddress = ipAddress;
    }

    if (body.name !== undefined) {
      update.name = String(
        body.name
      ).trim();
    }

    if (body.description !== undefined) {
      update.description = String(
        body.description
      ).trim();
    }

    if (body.isActive !== undefined) {
      update.isActive = Boolean(
        body.isActive
      );
    }

    const record =
      await IpWhitelist.findByIdAndUpdate(
        id,
        update,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          message: "IP whitelist record not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "IP whitelist updated",
      data: record,
    });
  } catch (error) {
    console.error(
      "UPDATE IP WHITELIST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update IP whitelist",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await connectDB();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid IP whitelist ID",
        },
        { status: 400 }
      );
    }

    const record =
      await IpWhitelist.findByIdAndDelete(id);

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          message: "IP whitelist record not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "IP address deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE IP WHITELIST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete IP address",
      },
      { status: 500 }
    );
  }
}