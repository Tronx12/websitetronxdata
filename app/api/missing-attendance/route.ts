// import { NextRequest, NextResponse } from "next/server";
// import mongoose from "mongoose";
// import MissingAttendanceRequest from "@/models/missing-attendance";
// import Attendance from "@/models/Attendance";
// import Auth from "@/models/Auth";
// import { connectDB } from "@/config/db";
// import { createAuditLog } from "@/lib/auditLog";

// // GET /api/missing-attendance
// export async function GET(request: NextRequest) {
//   try {
//     await connectDB();

//     const { searchParams } = new URL(request.url);
//     const userId = searchParams.get("userId");
//     const status = searchParams.get("status"); // pending | approved | rejected
//     const from = searchParams.get("from");
//     const to = searchParams.get("to");

//     const filter: any = {};

//     if (userId) {
//       if (!mongoose.Types.ObjectId.isValid(userId)) {
//         return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
//       }
//       filter.userId = userId;
//     }

//     if (status) {
//       filter.status = status;
//     }

//     if (from || to) {
//       filter.date = {};
//       if (from) filter.date.$gte = new Date(from);
//       if (to) {
//         const end = new Date(to);
//         end.setHours(23, 59, 59, 999);
//         filter.date.$lte = end;
//       }
//     }

//     const requests = await MissingAttendanceRequest.find(filter)
//       .populate("userId", "name email workingShift role")
//       .populate("reviewedBy", "name email")
//       .populate("attendanceId")
//       .sort({ createdAt: -1 });

//     return NextResponse.json(requests);
//   } catch (error) {
//     console.error("GET /api/missing-attendance error:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

// // POST /api/missing-attendance  → Create new request
// export async function POST(request: NextRequest) {
//   try {
//     await connectDB();

//     const body = await request.json();
//     const {
//       userId,
//       date,
//       requestedLoggingTime,
//       requestedLogoutTime,
//       requestedLunchStart,
//       requestedLunchEnd,
//       reason,
//       attachment,
//     } = body;

//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       return NextResponse.json({ error: "Valid userId is required" }, { status: 400 });
//     }

//     if (!date) {
//       return NextResponse.json({ error: "Date is required" }, { status: 400 });
//     }

//     if (!reason || reason.trim().length < 5) {
//       return NextResponse.json(
//         { error: "Reason is required (minimum 5 characters)" },
//         { status: 400 }
//       );
//     }

//     // Normalize date to start of day
//     const targetDate = new Date(date);
//     targetDate.setHours(0, 0, 0, 0);

//     // Check if attendance already exists for this date
//     const existingAttendance = await Attendance.findOne({
//       userId,
//       date: targetDate,
//     });

//     if (existingAttendance && existingAttendance.loggingTime) {
//       return NextResponse.json(
//         { error: "Attendance already exists for this date" },
//         { status: 400 }
//       );
//     }

//     // Check if a pending request already exists
//     const existingRequest = await MissingAttendanceRequest.findOne({
//       userId,
//       date: targetDate,
//       status: "pending",
//     });

//     if (existingRequest) {
//       return NextResponse.json(
//         { error: "You already have a pending request for this date" },
//         { status: 400 }
//       );
//     }

//     const newRequest = await MissingAttendanceRequest.create({
//       userId,
//       date: targetDate,
//       requestedLoggingTime: requestedLoggingTime || null,
//       requestedLogoutTime: requestedLogoutTime || null,
//       requestedLunchStart: requestedLunchStart || null,
//       requestedLunchEnd: requestedLunchEnd || null,
//       reason: reason.trim(),
//       attachment: attachment || null,
//       status: "pending",
//     });

//     await createAuditLog({
//       userId,
//       action: "CREATE",
//       module: "Missing Attendance",
//       description: `Submitted missing attendance request for date ${targetDate.toDateString()}`,
//       entityType: "MissingAttendanceRequest",
//       entityId: String(newRequest._id),
//       metadata: { reason: reason.trim(), date: targetDate },
//     });

//     const populated = await MissingAttendanceRequest.findById(newRequest._id)
//       .populate("userId", "name email workingShift role");

//     return NextResponse.json(populated, { status: 201 });
//   } catch (error: any) {
//     console.error("POST /api/missing-attendance error:", error);

//     // Handle duplicate key error from unique index
//     if (error.code === 11000) {
//       return NextResponse.json(
//         { error: "You already have a pending request for this date" },
//         { status: 400 }
//       );
//     }

//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }


import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import MissingAttendanceRequest from "@/models/missing-attendance";
import Attendance from "@/models/Attendance";
import { connectDB } from "@/config/db";
import { createAuditLog } from "@/lib/auditLog";
import {
  istDayRangeUtc,
  normalizeToISTDateKey,
  parseISTDateTime,
} from "@/lib/ist";

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ONLY = /^\d{1,2}:\d{2}(:\d{2})?$/;

// GET /api/missing-attendance
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status"); // pending | approved | rejected
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter: any = {};

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
      }
      filter.userId = userId;
    }

    if (status) filter.status = status;

    if (from || to) {
      filter.date = {};
      if (from) {
        const range = istDayRangeUtc(normalizeToISTDateKey(from));
        if (!range) {
          return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
        }
        filter.date.$gte = range.startUtc; // 00:00 IST
      }
      if (to) {
        const range = istDayRangeUtc(normalizeToISTDateKey(to));
        if (!range) {
          return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
        }
        filter.date.$lt = range.endUtc; // end of that IST day
      }
    }

    const requests = await MissingAttendanceRequest.find(filter)
      .populate("userId", "name email workingShift role")
      .populate("reviewedBy", "name email")
      .populate("attendanceId")
      .sort({ createdAt: -1 });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET /api/missing-attendance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/missing-attendance → Create new request
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      userId,
      date,
      requestedLoggingTime,
      requestedLogoutTime,
      requestedLunchStart,
      requestedLunchEnd,
      reason,
      attachment,
    } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId is required" }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "Reason is required (minimum 5 characters)" },
        { status: 400 }
      );
    }

    // ---- Everything below is IST ----
    const dateKey = normalizeToISTDateKey(date);
    const dayRange = istDayRangeUtc(dateKey);
    if (!dayRange) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const targetDate = dayRange.startUtc; // 00:00 IST of the selected day

    let loggingTime: Date | null;
    let logoutTime: Date | null;
    let lunchStart: Date | null;
    let lunchEnd: Date | null;

    try {
      loggingTime = parseISTDateTime(requestedLoggingTime, dateKey);
      logoutTime = parseISTDateTime(requestedLogoutTime, dateKey);
      lunchStart = parseISTDateTime(requestedLunchStart, dateKey);
      lunchEnd = parseISTDateTime(requestedLunchEnd, dateKey);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    // Time-only values earlier than their reference belong to the next day (night shift)
    const rollIfEarlier = (
      raw: unknown,
      parsed: Date | null,
      reference: Date | null
    ): Date | null => {
      if (!parsed || !reference) return parsed;
      if (!TIME_ONLY.test(String(raw).trim())) return parsed;
      return parsed <= reference ? new Date(parsed.getTime() + DAY_MS) : parsed;
    };

    logoutTime = rollIfEarlier(requestedLogoutTime, logoutTime, loggingTime);
    lunchStart = rollIfEarlier(requestedLunchStart, lunchStart, loggingTime);
    lunchEnd = rollIfEarlier(requestedLunchEnd, lunchEnd, lunchStart ?? loggingTime);

    // Sanity checks that still allow night shifts
    if (loggingTime && logoutTime) {
      if (
        logoutTime <= loggingTime ||
        logoutTime.getTime() - loggingTime.getTime() > DAY_MS
      ) {
        return NextResponse.json(
          { error: "Logout must be within 24 hours after login" },
          { status: 400 }
        );
      }
    }
    if (lunchStart && lunchEnd && lunchEnd <= lunchStart) {
      return NextResponse.json(
        { error: "Lunch end must be after lunch start" },
        { status: 400 }
      );
    }

    // Check if attendance already exists for this IST date
    const existingAttendance = await Attendance.findOne({
      userId,
      date: { $gte: dayRange.startUtc, $lt: dayRange.endUtc },
    });

    if (existingAttendance && existingAttendance.loggingTime) {
      return NextResponse.json(
        { error: "Attendance already exists for this date" },
        { status: 400 }
      );
    }

    // Check if a pending request already exists
    const existingRequest = await MissingAttendanceRequest.findOne({
      userId,
      date: { $gte: dayRange.startUtc, $lt: dayRange.endUtc },
      status: "pending",
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending request for this date" },
        { status: 400 }
      );
    }

    const newRequest = await MissingAttendanceRequest.create({
      userId,
      date: targetDate,
      requestedLoggingTime: loggingTime,
      requestedLogoutTime: logoutTime,
      requestedLunchStart: lunchStart,
      requestedLunchEnd: lunchEnd,
      reason: reason.trim(),
      attachment: attachment || null,
      status: "pending",
    });

    await createAuditLog({
      userId,
      action: "CREATE",
      module: "Missing Attendance",
      description: `Submitted missing attendance request for date ${dateKey} (IST)`,
      entityType: "MissingAttendanceRequest",
      entityId: String(newRequest._id),
      metadata: { reason: reason.trim(), date: targetDate },
    });

    const populated = await MissingAttendanceRequest.findById(
      newRequest._id
    ).populate("userId", "name email workingShift role");

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/missing-attendance error:", error);

    // Duplicate key error from unique index
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "You already have a pending request for this date" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}