// app/api/survey/days/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Survey from "@/models/SurveyData"; // <-- adjust to your model path
// import dbConnect from "@/lib/dbConnect"; // <-- use whatever you call in /api/survey

export async function GET(req: NextRequest) {
  try {
    // await dbConnect(); // same connection helper as your other survey routes

    const sp = req.nextUrl.searchParams;
    const createdBy = sp.get("createdBy");
    const category = sp.get("category");
    const search = sp.get("search")?.trim();
    const tzOffset = Number(sp.get("tzOffset") || 0); // JS sign: IST = -330

    if (!createdBy || !mongoose.Types.ObjectId.isValid(createdBy)) {
      return NextResponse.json(
        { success: false, message: "Valid createdBy is required" },
        { status: 400 }
      );
    }

    // Convert JS offset (-330) to Mongo timezone string ("+05:30")
    const mins = -tzOffset;
    const sign = mins >= 0 ? "+" : "-";
    const hh = String(Math.floor(Math.abs(mins) / 60)).padStart(2, "0");
    const mm = String(Math.abs(mins) % 60).padStart(2, "0");
    const timezone = `${sign}${hh}:${mm}`;

    const match: Record<string, any> = {
      createdBy: new mongoose.Types.ObjectId(createdBy),
    };

    if (category) match.category = category;

    // Keep this in sync with how your /api/survey route applies `search`.
    // Example using a regex over common fields:
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [
        { pid: rx },
        { projectNo: rx },
        { supplierId: rx },
        { country: rx },
        { description: rx },
      ];
    }

    const data = await Survey.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone,
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $project: { _id: 0, date: "$_id", count: 1 } },
    ]);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Days route error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch days" },
      { status: 500 }
    );
  }
}