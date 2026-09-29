import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import IpWhitelist from "@/models/IpWhitelist";
import { isValidIp } from "@/lib/ip-validation";

export async function GET() {
  try {
    await connectDB();

    const records = await IpWhitelist.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("GET IP WHITELIST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch IP whitelist",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    await connectDB();

    const body = await request.json();

    const ipAddress = String(
      body.ipAddress || ""
    ).trim();

    const name = String(
      body.name || ""
    ).trim();

    const description = String(
      body.description || ""
    ).trim();

    if (!ipAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "IP address is required",
        },
        { status: 400 }
      );
    }

    if (!isValidIp(ipAddress)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid IP address",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Network name is required",
        },
        { status: 400 }
      );
    }

    const existing =
      await IpWhitelist.findOne({
        ipAddress,
      });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "This IP address already exists",
        },
        { status: 409 }
      );
    }

    const record =
      await IpWhitelist.create({
        ipAddress,
        name,
        description,
        isActive: true,
      });

    return NextResponse.json(
      {
        success: true,
        message: "IP address added successfully",
        data: record,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE IP WHITELIST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to add IP address",
      },
      { status: 500 }
    );
  }
}