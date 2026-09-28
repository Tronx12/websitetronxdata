import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import Notification from "@/models/Notification";

async function getCurrentUserId(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  return userId || null;
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    await connectDB();

    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        recipientId: userId,
      },
      {
        $set: {
          read: true,
        },
      },
      {
        new: true,
      }
    );

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          message: "Notification not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error: any) {
    console.error("Mark notification read error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update notification",
      },
      { status: 500 }
    );
  }
}