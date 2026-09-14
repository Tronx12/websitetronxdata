import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import OfficeOff from "@/models/OfficeOff";
import OfficeSettings from "@/models/OfficeSettings";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";

// ======================================================
// GET OFFICE OFF + WEEKEND SETTINGS
// ======================================================

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser();

    if (!user?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { searchParams } =
      new URL(req.url);

    const year =
      searchParams.get("year") ||
      new Date().getFullYear().toString();

    const yearNumber = Number(year);

    if (
      !Number.isInteger(yearNumber) ||
      yearNumber < 2000 ||
      yearNumber > 2100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid year",
        },
        { status: 400 }
      );
    }

    const startDate = new Date(
      `${yearNumber}-01-01T00:00:00.000Z`
    );

    const endDate = new Date(
      `${yearNumber + 1}-01-01T00:00:00.000Z`
    );

    const [
      officeOffs,
      settings,
    ] = await Promise.all([
      OfficeOff.find({
        date: {
          $gte: startDate,
          $lt: endDate,
        },
        isActive: true,
      })
        .populate(
          "createdBy",
          "name email role"
        )
        .sort({
          date: 1,
        })
        .lean(),

      OfficeSettings.findOne().lean(),
    ]);

    return NextResponse.json({
      success: true,

      data: officeOffs,

      settings: {
        weekendOff:
          settings?.weekendOff ?? false,

        saturdayOff:
          settings?.saturdayOff ?? false,

        sundayOff:
          settings?.sundayOff ?? false,
      },
    });
  } catch (error) {
    console.error(
      "GET OFFICE OFF ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load office off days",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// CREATE MULTI-DAY OFFICE OFF
// ======================================================

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser();

    if (!user?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // ONLY ADMIN
    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      startDate,
      endDate,
      title,
      type,
      description,
    } = body;

    // ==================================================
    // VALIDATION
    // ==================================================

    if (
      !startDate ||
      !endDate ||
      !title?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Start date, end date and title are required",
        },
        { status: 400 }
      );
    }

    if (
      type &&
      ![
        "festival",
        "holiday",
        "special",
      ].includes(type)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid office off type",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // CREATE DATE RANGE
    // ==================================================

    const start = new Date(
      `${startDate}T00:00:00.000Z`
    );

    const end = new Date(
      `${endDate}T00:00:00.000Z`
    );

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid date",
        },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Start date cannot be after end date",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // LIMIT RANGE
    // ==================================================

    const dates: Date[] = [];

    const current = new Date(start);

    while (current <= end) {
      dates.push(
        new Date(current)
      );

      current.setUTCDate(
        current.getUTCDate() + 1
      );

      // Safety limit
      if (dates.length > 366) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Maximum holiday range is 366 days",
          },
          { status: 400 }
        );
      }
    }

    // ==================================================
    // CHECK EXISTING DATES
    // ==================================================

    const existing =
      await OfficeOff.find({
        date: {
          $in: dates,
        },
        isActive: true,
      }).lean();

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more selected dates already have an office off",

          existingDates:
            existing.map(
              (item) =>
                item.date
                  .toISOString()
                  .split("T")[0]
            ),
        },
        { status: 409 }
      );
    }

    // ==================================================
    // GROUP ID
    // ==================================================

    const groupId =
      new mongoose.Types.ObjectId().toString();

    // ==================================================
    // CREATE ONE RECORD PER DATE
    // ==================================================

    const records = dates.map(
      (date) => ({
        date,

        title: title.trim(),

        type:
          type || "holiday",

        description:
          description?.trim() ||
          null,

        groupId,

        isActive: true,

        createdBy:
          user.userId,

        updatedBy:
          user.userId,
      })
    );

    const officeOffs =
      await OfficeOff.insertMany(
        records
      );

    // ==================================================
    // AUDIT
    // ==================================================

    await createAuditLog({
      userId: user.userId,

      action: "CREATE",

      module: "Office Off",

      description:
        `Created ${officeOffs.length}-day office off: ${title.trim()}`,

      entityType: "OfficeOff",

      entityId: groupId,

      metadata: {
        startDate,
        endDate,

        totalDays:
          officeOffs.length,

        title:
          title.trim(),

        type:
          type || "holiday",

        description:
          description?.trim() ||
          null,

        dates:
          dates.map(
            (date) =>
              date
                .toISOString()
                .split("T")[0]
          ),
      },

      ipAddress:
        req.headers
          .get("x-forwarded-for")
          ?.split(",")[0]
          ?.trim() ||
        req.headers.get(
          "x-real-ip"
        ) ||
        null,

      userAgent:
        req.headers.get(
          "user-agent"
        ) || null,
    });

    return NextResponse.json(
      {
        success: true,

        message:
          `${officeOffs.length} office off days created successfully`,

        data: officeOffs,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "CREATE OFFICE OFF ERROR:",
      error
    );

    if (
      error?.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more dates already have an office off",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to create office off",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// UPDATE WEEKEND SETTINGS
// ======================================================

export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser();

    if (!user?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // ONLY ADMIN
    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const weekendOff =
      body.weekendOff === true;

    // When weekendOff is true,
    // BOTH Saturday and Sunday become off.
    const saturdayOff =
      weekendOff;

    const sundayOff =
      weekendOff;

    const settings =
      await OfficeSettings.findOneAndUpdate(
        {},

        {
          $set: {
            weekendOff,
            saturdayOff,
            sundayOff,
            updatedBy:
              user.userId,
          },
        },

        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    // ==================================================
    // AUDIT
    // ==================================================

    await createAuditLog({
      userId: user.userId,

      action: "UPDATE",

      module: "Office Off",

      description:
        weekendOff
          ? "Enabled Saturday and Sunday as weekly office off"
          : "Disabled Saturday and Sunday weekly office off",

      entityType:
        "OfficeSettings",

      entityId:
        settings._id.toString(),

      metadata: {
        weekendOff,
        saturdayOff,
        sundayOff,
      },

      ipAddress:
        req.headers
          .get("x-forwarded-for")
          ?.split(",")[0]
          ?.trim() ||
        req.headers.get(
          "x-real-ip"
        ) ||
        null,

      userAgent:
        req.headers.get(
          "user-agent"
        ) || null,
    });

    return NextResponse.json({
      success: true,

      message:
        weekendOff
          ? "Saturday and Sunday are now office off"
          : "Weekend office off disabled",

      data: {
        weekendOff,
        saturdayOff,
        sundayOff,
      },
    });
  } catch (error) {
    console.error(
      "UPDATE OFFICE SETTINGS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update office settings",
      },
      { status: 500 }
    );
  }
}