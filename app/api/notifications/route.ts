import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import Notification from "@/models/Notification";
import { getCurrentUser } from "@/lib/getuser";

async function getCurrentUserId(request: NextRequest) {
  const user = await getCurrentUser();
  if (user?.userId) return user.userId;
  return request.headers.get("x-user-id") || null;
}

export async function GET(request: NextRequest) {
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

    const notifications = await Notification.find({
      recipientId: userId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      read: false,
    });

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("GET notifications error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch notifications",
      },
      { status: 500 }
    );
  }
}