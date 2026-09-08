import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Attendance from "@/models/Attendance";
import Auth from "@/models/Auth";
import { connectDB } from "@/config/db";

// ────────────────────────────────────────────────
// Office location (change these values or move to env)
const OFFICE_LAT = Number(process.env.OFFICE_LAT) || 28.6139;   // example: New Delhi
const OFFICE_LNG = Number(process.env.OFFICE_LNG) || 77.2090;
const MAX_DISTANCE_METERS = Number(process.env.MAX_ATTENDANCE_DISTANCE) || 200; // 200 meters

// Haversine formula
function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calculate late status based on shift
function calculateLate(loggingTime: Date, workingShift: "day" | "night") {
  const login = new Date(loggingTime);

  let allowedHour = 10;
  let allowedMinute = 15; // day default

  if (workingShift === "night") {
    allowedHour = 21; // 9:30 PM → 21:30 + 15 min = 21:45
    allowedMinute = 45;
  }

  const allowedTime = new Date(login);
  allowedTime.setHours(allowedHour, allowedMinute, 0, 0);

  if (login > allowedTime) {
    const diffMs = login.getTime() - allowedTime.getTime();
    const lateByMinutes = Math.ceil(diffMs / (1000 * 60));
    return { isLate: true, lateByMinutes };
  }

  return { isLate: false, lateByMinutes: 0 };
}

// ────────────────────────────────────────────────
// GET /api/attendance
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date"); // YYYY-MM-DD
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter: any = {};

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
      }
      filter.userId = userId;
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const records = await Attendance.find(filter)
      .populate("userId", "name email workingShift role")
      .populate("updatedBy", "name email")
      .sort({ date: -1 });

    return NextResponse.json(records);
  } catch (error) {
    console.error("GET /api/attendance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ────────────────────────────────────────────────
// POST /api/attendance
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      userId,
      action,
      date,
      updatedBy,
      latitude,
      longitude,
      locationAddress,
      ...rest
    } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Valid userId is required" },
        { status: 400 }
      );
    }

    // Normalize to start of day
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    let record = await Attendance.findOne({ userId, date: targetDate });
    const now = new Date();

    // ── Action based flow (login / logout / lunch) ──
    if (action) {
      // Fetch user to get workingShift
      const user = await Auth.findById(userId).select("workingShift name");
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (!record) {
        record = new Attendance({
          userId,
          date: targetDate,
          updatedBy: updatedBy || null,
        });
      }

      switch (action) {
        // ────────────── LOGIN ──────────────
        case "login": {
          if (record.loggingTime) {
            return NextResponse.json(
              { error: "Already logged in for this date" },
              { status: 400 }
            );
          }

          // Geo check is mandatory for login
          if (latitude == null || longitude == null) {
            return NextResponse.json(
              { error: "Latitude and longitude are required for login" },
              { status: 400 }
            );
          }

          const distance = getDistanceInMeters(
            latitude,
            longitude,
            OFFICE_LAT,
            OFFICE_LNG
          );

          if (distance > MAX_DISTANCE_METERS) {
            return NextResponse.json(
              {
                error: `You are not at the office location. Distance: ${Math.round(
                  distance
                )} meters (allowed: ${MAX_DISTANCE_METERS}m)`,
              },
              { status: 403 }
            );
          }

          // Set login time + location
          record.loggingTime = now;
          record.loginLocation = {
            type: "Point",
            coordinates: [longitude, latitude], // GeoJSON order: [lng, lat]
          };
          if (locationAddress) {
            record.loginLocationAddress = locationAddress;
          }

          // Calculate late
          const { isLate, lateByMinutes } = calculateLate(
            now,
            user.workingShift as "day" | "night"
          );
          record.isLate = isLate;
          record.lateByMinutes = lateByMinutes;

          break;
        }

        // ────────────── LOGOUT ──────────────
        case "logout": {
          if (!record.loggingTime) {
            return NextResponse.json(
              {
                error:
                  "You have not logged in today. Please contact your Team Lead.",
              },
              { status: 400 }
            );
          }
          if (record.logoutTime) {
            return NextResponse.json(
              { error: "Already logged out" },
              { status: 400 }
            );
          }
          record.logoutTime = now;
          break;
        }

        // ────────────── LUNCH START ──────────────
        case "lunchStart": {
          if (!record.loggingTime) {
            return NextResponse.json(
              {
                error:
                  "You have not logged in today. Please contact your Team Lead.",
              },
              { status: 400 }
            );
          }
          if (record.lunchStart) {
            return NextResponse.json(
              { error: "Lunch already started" },
              { status: 400 }
            );
          }
          record.lunchStart = now;
          break;
        }

        // ────────────── LUNCH END ──────────────
        case "lunchEnd": {
          if (!record.loggingTime) {
            return NextResponse.json(
              {
                error:
                  "You have not logged in today. Please contact your Team Lead.",
              },
              { status: 400 }
            );
          }
          if (!record.lunchStart) {
            return NextResponse.json(
              { error: "Lunch not started yet" },
              { status: 400 }
            );
          }
          if (record.lunchEnd) {
            return NextResponse.json(
              { error: "Lunch already ended" },
              { status: 400 }
            );
          }
          record.lunchEnd = now;
          break;
        }

        default:
          return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }

      if (updatedBy) record.updatedBy = updatedBy;
      await record.save();

      // Return populated record
      const populated = await Attendance.findById(record._id)
        .populate("userId", "name email workingShift role")
        .populate("updatedBy", "name email");

      return NextResponse.json(populated);
    }

    // ── Manual create / update (admin / TL) ──
    if (record) {
      Object.assign(record, rest);
      if (updatedBy) record.updatedBy = updatedBy;
      await record.save();
      return NextResponse.json(record);
    }

    const newRecord = await Attendance.create({
      userId,
      date: targetDate,
      updatedBy: updatedBy || null,
      ...rest,
    });

    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    console.error("POST /api/attendance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}