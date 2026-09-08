import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import { requireRole } from "@/lib/authorize";

export async function GET(req: NextRequest) {
  try {
    requireRole(req, [
      "admin",
      "hr",
      "team-lead",
    ]);

    await connectDB();

    const users = await Auth.find()
      .select("-password")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}
