import {
  NextRequest,
  NextResponse,
} from "next/server";

import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import OfficeOff from "@/models/OfficeOff";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  try {
    await connectDB();

    const user =
      await getCurrentUser();

    if (!user?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin access required",
        },
        { status: 403 }
      );
    }

    const { id } =
      await params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid office off ID",
        },
        { status: 400 }
      );
    }

    const officeOff =
      await OfficeOff.findById(id);

    if (!officeOff) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Office off not found",
        },
        { status: 404 }
      );
    }

    await OfficeOff.findByIdAndDelete(
      id
    );

    await createAuditLog({
      userId: user.userId,

      action: "DELETE",

      module: "Office Off",

      description:
        `Deleted office off: ${officeOff.title}`,

      entityType:
        "OfficeOff",

      entityId: id,

      metadata: {
        date: officeOff.date,
        title:
          officeOff.title,
        type:
          officeOff.type,
        groupId:
          officeOff.groupId,
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
        "Office off deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE OFFICE OFF ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to delete office off",
      },
      { status: 500 }
    );
  }
}