import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import Notification from "@/models/Notification";
import { getCurrentUser } from "@/lib/getuser";

async function getCurrentUserId(request: NextRequest) {
  const user = await getCurrentUser();
  if (user?.userId) return user.userId;
  return request.headers.get("x-user-id") || null;
}

export async function PATCH(request: NextRequest) {
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

    await Notification.updateMany(
      {
        recipientId: userId,
        read: false,
      },
      {
        $set: {
          read: true,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error: any) {
    console.error("Mark all notifications read error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update notifications",
      },
      { status: 500 }
    );
  }
}