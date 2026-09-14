import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import AuditLog from "@/models/AuditLog";
import { getCurrentUser } from "@/lib/getuser";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?.userId) {
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

    const page = Math.max(
      1,
      Number(searchParams.get("page") || "1")
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(
          searchParams.get("limit") || "25"
        )
      )
    );

    const search =
      searchParams.get("search")?.trim() || "";

    const action =
      searchParams.get("action") || "";

    const module =
      searchParams.get("module") || "";

    const userId =
      searchParams.get("userId") || "";

    const skip =
      (page - 1) * limit;

    const filter: any = {};

    /* ------------------------------------------
       ACTION
    ------------------------------------------ */

    if (action) {
      filter.action = action;
    }

    /* ------------------------------------------
       MODULE
    ------------------------------------------ */

    if (module) {
      filter.module = module;
    }

    /* ------------------------------------------
       USER
    ------------------------------------------ */

    if (userId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid userId",
          },
          { status: 400 }
        );
      }

      filter.userId =
        new mongoose.Types.ObjectId(userId);
    }

    /* ------------------------------------------
       SEARCH
    ------------------------------------------ */

    if (search) {
      filter.$or = [
        {
          description: {
            $regex: search,
            $options: "i",
          },
        },
        {
          module: {
            $regex: search,
            $options: "i",
          },
        },
        {
          action: {
            $regex: search,
            $options: "i",
          },
        },
        {
          entityType: {
            $regex: search,
            $options: "i",
          },
        },
        {
          entityId: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const [logs, total] =
      await Promise.all([
        AuditLog.find(filter)
          .populate(
            "userId",
            "name email role"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        AuditLog.countDocuments(filter),
      ]);

    return NextResponse.json({
      success: true,

      data: logs,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error(
      "AUDIT LOG GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch audit logs",
        error:
          error?.message ||
          String(error),
      },
      { status: 500 }
    );
  }
}