// app/api/survey/attendance-summary/route.ts
//
// Returns attendance status per user per date for one month:
//   { success: true, data: { [userId]: { "YYYY-MM-DD": "Present" | "Absent" | "Work From Home" | ... } } }
//
// !! I could not see your Attendance model, so the model import and the field
// !! names (userId, date, status) below are ASSUMPTIONS. Adjust them to match.

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Attendance from "@/models/Attendance"; // <-- adjust to your attendance model
// import dbConnect from "@/lib/dbConnect";   // <-- same connect helper as your other routes

export async function GET(req: NextRequest) {
  try {
    // await dbConnect();

    const sp = req.nextUrl.searchParams;
    const month = sp.get("month") || ""; // "2026-09"
    const tzOffset = Number(sp.get("tzOffset") || 0); // JS sign: IST = -330
    const requestedIds = (sp.get("userIds") || "")
      .split(",")
      .map((s) => s.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, message: "month must be YYYY-MM" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // SECURITY: do NOT trust userIds from the client.
    // Intersect requestedIds with the users the logged-in person may see
    // (Team Lead -> their own team only, HR/Admin -> everyone). Reuse the same
    // logic as /api/survey/team-members. Placeholder:
    //
    // const allowedIds = await getAllowedUserIdsForSession(req);
    // const userIds = requestedIds.filter((id) => allowedIds.includes(id));
    // ------------------------------------------------------------------
    const userIds = requestedIds;

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, data: {} });
    }

    // Local-day boundaries -> UTC
    const [y, m] = month.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1) + tzOffset * 60000);
    const end = new Date(Date.UTC(y, m, 1) + tzOffset * 60000);

    const rows = await Attendance.find({
      userId: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) }, // <-- field name
      date: { $gte: start, $lt: end }, // <-- field name
    })
      .select("userId date status") // <-- field names
      .lean();

    const data: Record<string, Record<string, string>> = {};

    for (const row of rows as any[]) {
      const uid = String(row.userId);

      // local date key: local time = UTC - tzOffset minutes
      const local = new Date(new Date(row.date).getTime() - tzOffset * 60000);
      const dateKey = local.toISOString().slice(0, 10);

      data[uid] = data[uid] || {};
      data[uid][dateKey] = String(row.status || "");
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Attendance summary error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load attendance" },
      { status: 500 }
    );
  }
}