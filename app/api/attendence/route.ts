// import { NextRequest, NextResponse } from "next/server";
// import mongoose from "mongoose";
// import Attendance from "@/models/Attendance";
// import Auth from "@/models/Auth";
// import { connectDB } from "@/config/db";
// import { createAuditLog } from "@/lib/auditLog";
// import {
//   validateLoginShift,
//   validateLogoutShift,
//   validateLunchEnd,
// } from "@/lib/shiftValidation";
// import { resolveAttendanceDay } from "@/lib/attendanceRules";

// // ────────────────────────────────────────────────
// // Office location (change these values or move to env)
// const OFFICE_LAT = Number(process.env.OFFICE_LAT) || 28.6139; // example: New Delhi
// const OFFICE_LNG = Number(process.env.OFFICE_LNG) || 77.2090;
// const MAX_DISTANCE_METERS = Number(process.env.MAX_ATTENDANCE_DISTANCE) || 200; // 200 meters

// // Haversine formula
// function getDistanceInMeters(
//   lat1: number,
//   lon1: number,
//   lat2: number,
//   lon2: number
// ): number {
//   const R = 6371e3; // metres
//   const φ1 = (lat1 * Math.PI) / 180;
//   const φ2 = (lat2 * Math.PI) / 180;
//   const Δφ = ((lat2 - lat1) * Math.PI) / 180;
//   const Δλ = ((lon2 - lon1) * Math.PI) / 180;

//   const a =
//     Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//     Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//   return R * c;
// }

// // ────────────────────────────────────────────────
// // GET /api/attendence
// export async function GET(request: NextRequest) {
//   try {
//     await connectDB();

//     const { searchParams } = new URL(request.url);
//     const userId = searchParams.get("userId");
//     const date = searchParams.get("date"); // YYYY-MM-DD
//     const from = searchParams.get("from");
//     const to = searchParams.get("to");

//     const filter: any = {};

//     if (userId) {
//       if (!mongoose.Types.ObjectId.isValid(userId)) {
//         return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
//       }
//       filter.userId = new mongoose.Types.ObjectId(userId);
//     }

//     if (date) {
//       const start = new Date(date);
//       start.setHours(0, 0, 0, 0);
//       const end = new Date(date);
//       end.setHours(23, 59, 59, 999);
//       filter.date = { $gte: start, $lte: end };
//     } else if (from || to) {
//       filter.date = {};
//       if (from) filter.date.$gte = new Date(from);
//       if (to) {
//         const end = new Date(to);
//         end.setHours(23, 59, 59, 999);
//         filter.date.$lte = end;
//       }
//     }

//     const records = await Attendance.find(filter)
//       .populate("userId", "name email workingShift role")
//       .populate("updatedBy", "name email")
//       .populate("shiftId", "name code startTime endTime crossesMidnight graceMinutes")
//       .populate("holidayId", "title type scope isPaid")
//       .sort({ date: -1 });

//     const processed = records.map((rec) => {
//       const doc = rec.toObject();
//       if (doc.loggingTime) {
//         const shift = (doc.userId as any)?.workingShift || "day";
//         const validation = validateLoginShift(new Date(doc.loggingTime), shift);
//         if (validation.allowed && validation.isLate) {
//           doc.isLate = true;
//           doc.lateByMinutes = validation.lateByMinutes || 0;
//         }
//       }
//       return doc;
//     });

//     return NextResponse.json(processed);
//   } catch (error) {
//     console.error("GET /api/attendence error:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

// // ────────────────────────────────────────────────
// // POST /api/attendence
// export async function POST(request: NextRequest) {
//   try {
//     await connectDB();

//     const body = await request.json();
//     const {
//       userId,
//       action,
//       date,
//       updatedBy,
//       latitude,
//       longitude,
//       locationAddress,
//       ...rest
//     } = body;

//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       return NextResponse.json(
//         { error: "Valid userId is required" },
//         { status: 400 }
//       );
//     }

//     // Normalize to start of day
//     const targetDate = date ? new Date(date) : new Date();
//     targetDate.setHours(0, 0, 0, 0);

//     let record = await Attendance.findOne({
//       userId: new mongoose.Types.ObjectId(userId),
//       date: targetDate,
//     });
//     const now = new Date();

//     // ── Action based flow (login / logout / lunch) ──
//     if (action) {
//       // Fetch user to get workingShift
//       const user = await Auth.findById(userId).select("workingShift name");
//       if (!user) {
//         return NextResponse.json({ error: "User not found" }, { status: 404 });
//       }

//       const shift = (user.workingShift as "day" | "night") || "day";

//       if (!record) {
//         record = new Attendance({
//           userId: new mongoose.Types.ObjectId(userId),
//           date: targetDate,
//           shiftDate: targetDate,
//           updatedBy: updatedBy ? new mongoose.Types.ObjectId(updatedBy) : null,
//         });
//       }

//       switch (action) {
//         // ────────────── LOGIN ──────────────
//         case "login": {
//           if (record.loggingTime) {
//             return NextResponse.json(
//               { error: "Already logged in for this date" },
//               { status: 400 }
//             );
//           }

//           // Validate shift login window
//           const loginValidation = validateLoginShift(now, shift);
//           if (!loginValidation.allowed) {
//             return NextResponse.json(
//               { error: loginValidation.message },
//               { status: 400 }
//             );
//           }

//           if (latitude == null || longitude == null) {
//             return NextResponse.json(
//               {
//                 error: "Latitude and longitude are required for login",
//               },
//               { status: 400 }
//             );
//           }

//           const lat = Number(latitude);
//           const lng = Number(longitude);

//           if (
//             !Number.isFinite(lat) ||
//             !Number.isFinite(lng) ||
//             lat < -90 ||
//             lat > 90 ||
//             lng < -180 ||
//             lng > 180
//           ) {
//             return NextResponse.json(
//               {
//                 error: "Invalid latitude or longitude",
//               },
//               { status: 400 }
//             );
//           }

//           const distance = getDistanceInMeters(
//             lat,
//             lng,
//             OFFICE_LAT,
//             OFFICE_LNG
//           );

//           if (distance > MAX_DISTANCE_METERS) {
//             return NextResponse.json(
//               {
//                 error: `You are not at the office location. Distance: ${Math.round(
//                   distance
//                 )} meters (allowed: ${MAX_DISTANCE_METERS}m)`,
//               },
//               { status: 403 }
//             );
//           }

//           // ── CONNECT OFFICE OFF & RULES RESOLUTION ──
//           const dayResolution = await resolveAttendanceDay({
//             userId,
//             date: targetDate,
//           });

//           if (dayResolution.holiday) {
//             record.status = "worked-on-holiday";
//             record.holiday = true;
//             record.holidayId = dayResolution.holidayId
//               ? new mongoose.Types.ObjectId(dayResolution.holidayId)
//               : null;
//           } else if (dayResolution.weeklyOff) {
//             record.status = "worked-on-weekly-off";
//             record.weeklyOff = true;
//           } else {
//             record.status = "present";
//             record.holiday = false;
//             record.weeklyOff = false;
//           }

//           if (dayResolution.resolvedShiftId) {
//             record.shiftId = new mongoose.Types.ObjectId(dayResolution.resolvedShiftId);
//           }

//           record.shiftDate = targetDate;
//           record.loggingTime = now;

//           record.loginLocation = {
//             type: "Point",
//             coordinates: [lng, lat],
//           };

//           if (locationAddress) {
//             record.loginLocationAddress = locationAddress;
//           }

//           record.isLate = !!loginValidation.isLate;
//           record.lateByMinutes = loginValidation.lateByMinutes || 0;
//           if (loginValidation.message) {
//             record.remarks = loginValidation.message;
//           }

//           break;
//         }

//         // ────────────── LOGOUT ──────────────
//         case "logout": {
//           if (!record.loggingTime) {
//             return NextResponse.json(
//               {
//                 error:
//                   "You have not logged in today. Please contact your Team Lead.",
//               },
//               { status: 400 }
//             );
//           }
//           if (record.logoutTime) {
//             return NextResponse.json(
//               { error: "Already logged out" },
//               { status: 400 }
//             );
//           }

//           // Validate shift logout window
//           const logoutValidation = validateLogoutShift(now, shift);
//           if (!logoutValidation.allowed) {
//             return NextResponse.json(
//               { error: logoutValidation.message },
//               { status: 400 }
//             );
//           }

//           record.logoutTime = now;
//           break;
//         }

//         // ────────────── LUNCH START ──────────────
//         case "lunchStart": {
//           if (!record.loggingTime) {
//             return NextResponse.json(
//               {
//                 error:
//                   "You have not logged in today. Please contact your Team Lead.",
//               },
//               { status: 400 }
//             );
//           }
//           if (record.lunchStart) {
//             return NextResponse.json(
//               { error: "Lunch already started" },
//               { status: 400 }
//             );
//           }
//           record.lunchStart = now;
//           break;
//         }

//         // ────────────── LUNCH END ──────────────
//         case "lunchEnd": {
//           if (!record.loggingTime) {
//             return NextResponse.json(
//               {
//                 error:
//                   "You have not logged in today. Please contact your Team Lead.",
//               },
//               { status: 400 }
//             );
//           }
//           if (!record.lunchStart) {
//             return NextResponse.json(
//               { error: "Lunch not started yet" },
//               { status: 400 }
//             );
//           }
//           if (record.lunchEnd) {
//             return NextResponse.json(
//               { error: "Lunch already ended" },
//               { status: 400 }
//             );
//           }

//           // Validate lunch duration (30 to 35 min)
//           const lunchValidation = validateLunchEnd(record.lunchStart, now);
//           if (!lunchValidation.allowed) {
//             return NextResponse.json(
//               { error: lunchValidation.message },
//               { status: 400 }
//             );
//           }

//           record.lunchEnd = now;
//           record.lunchDurationMinutes = lunchValidation.lunchDurationMinutes || 0;
//           record.excessLunchMinutes = lunchValidation.excessLunchMinutes || 0;
//           if (lunchValidation.message) {
//             record.remarks = record.remarks
//               ? `${record.remarks} | ${lunchValidation.message}`
//               : lunchValidation.message;
//           }
//           break;
//         }

//         default:
//           return NextResponse.json({ error: "Invalid action" }, { status: 400 });
//       }

//       if (updatedBy) {
//         record.updatedBy = new mongoose.Types.ObjectId(updatedBy);
//       }
//       await record.save();

//       // AUDIT LOG
//       const auditAction =
//         action === "login" ? "LOGIN" : action === "logout" ? "LOGOUT" : "UPDATE";
//       await createAuditLog({
//         userId,
//         action: auditAction,
//         module: "Attendance",
//         description: `Marked attendance action: ${action} for ${user.name || "user"}`,
//         entityType: "Attendance",
//         entityId: String(record._id),
//         metadata: { action, date: targetDate, status: record.status },
//       });

//       // Return populated record
//       const populated = await Attendance.findById(record._id)
//         .populate("userId", "name email workingShift role")
//         .populate("updatedBy", "name email")
//         .populate("shiftId", "name code startTime endTime crossesMidnight graceMinutes")
//         .populate("holidayId", "title type scope isPaid");

//       return NextResponse.json(populated);
//     }

//     // ── Manual create / update (admin / TL / HR) ──
//     const userObjectId = new mongoose.Types.ObjectId(userId);
//     const updatedByObjectId = updatedBy ? new mongoose.Types.ObjectId(updatedBy) : null;

//     if (record) {
//       Object.assign(record, rest);
//       if (rest.status === "holiday" || rest.status === "office-off") {
//         record.holiday = true;
//       } else if (rest.status === "weekly-off") {
//         record.weeklyOff = true;
//       }
//       if (updatedByObjectId) record.updatedBy = updatedByObjectId;
//       await record.save();

//       await createAuditLog({
//         userId: updatedBy || userId,
//         action: "UPDATE",
//         module: "Attendance",
//         description: `Updated attendance record for user ${userId}`,
//         entityType: "Attendance",
//         entityId: String(record._id),
//         metadata: rest,
//       });

//       const populated = await Attendance.findById(record._id)
//         .populate("userId", "name email workingShift role")
//         .populate("updatedBy", "name email")
//         .populate("shiftId", "name code startTime endTime crossesMidnight graceMinutes")
//         .populate("holidayId", "title type scope isPaid");

//       return NextResponse.json(populated);
//     }

//     const newRecord = await Attendance.create({
//       userId: userObjectId,
//       date: targetDate,
//       shiftDate: targetDate,
//       updatedBy: updatedByObjectId,
//       holiday: rest.status === "holiday" || rest.status === "office-off",
//       weeklyOff: rest.status === "weekly-off",
//       ...rest,
//     });

//     await createAuditLog({
//       userId: updatedBy || userId,
//       action: "CREATE",
//       module: "Attendance",
//       description: `Created attendance record for user ${userId}`,
//       entityType: "Attendance",
//       entityId: String(newRecord._id),
//       metadata: rest,
//     });

//     const populated = await Attendance.findById(newRecord._id)
//       .populate("userId", "name email workingShift role")
//       .populate("updatedBy", "name email")
//       .populate("shiftId", "name code startTime endTime crossesMidnight graceMinutes")
//       .populate("holidayId", "title type scope isPaid");

//     return NextResponse.json(populated, { status: 201 });
//   } catch (error) {
//     console.error("POST /api/attendence error:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Attendance from "@/models/Attendance";
import Auth from "@/models/Auth";
import { connectDB } from "@/config/db";
import { createAuditLog } from "@/lib/auditLog";
import {
  validateLoginShift,
  validateLogoutShift,
  validateLunchEnd,
} from "@/lib/shiftValidation";
import { resolveAttendanceDay } from "@/lib/attendanceRules";

// ────────────────────────────────────────────────
// GET /api/attendence
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
      filter.userId = new mongoose.Types.ObjectId(userId);
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
      .populate("shiftId", "name code startTime endTime crossesMidnight graceMinutes")
      .populate("holidayId", "title type scope isPaid")
      .sort({ date: -1 });

    const processed = records.map((rec) => {
      const doc = rec.toObject();
      if (doc.loggingTime) {
        const shift = (doc.userId as any)?.workingShift || "day";
        const validation = validateLoginShift(new Date(doc.loggingTime), shift);
        if (validation.allowed && validation.isLate) {
          doc.isLate = true;
          doc.lateByMinutes = validation.lateByMinutes || 0;
        }
      }
      return doc;
    });

    return NextResponse.json(processed);
  } catch (error) {
    console.error("GET /api/attendence error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ────────────────────────────────────────────────
// POST /api/attendence
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      userId,
      action,
      date,
      updatedBy,
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

    let record = await Attendance.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      date: targetDate,
    });
    const now = new Date();

    // ── Action based flow (login / logout / lunch) ──
    if (action) {
      // Fetch user to get workingShift
      const user = await Auth.findById(userId).select("workingShift name");
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const shift = (user.workingShift as "day" | "night") || "day";

      if (!record) {
        record = new Attendance({
          userId: new mongoose.Types.ObjectId(userId),
          date: targetDate,
          shiftDate: targetDate,
          updatedBy: updatedBy ? new mongoose.Types.ObjectId(updatedBy) : null,
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

          // Validate shift login window
          const loginValidation = validateLoginShift(now, shift);
          if (!loginValidation.allowed) {
            return NextResponse.json(
              { error: loginValidation.message },
              { status: 400 }
            );
          }

          // ── CONNECT OFFICE OFF & RULES RESOLUTION ──
          const dayResolution = await resolveAttendanceDay({
            userId,
            date: targetDate,
          });

          if (dayResolution.holiday) {
            record.status = "worked-on-holiday";
            record.holiday = true;
            record.holidayId = dayResolution.holidayId
              ? new mongoose.Types.ObjectId(dayResolution.holidayId)
              : null;
          } else if (dayResolution.weeklyOff) {
            record.status = "worked-on-weekly-off";
            record.weeklyOff = true;
          } else {
            record.status = "present";
            record.holiday = false;
            record.weeklyOff = false;
          }

          if (dayResolution.resolvedShiftId) {
            record.shiftId = new mongoose.Types.ObjectId(dayResolution.resolvedShiftId);
          }

          record.shiftDate = targetDate;
          record.loggingTime = now;

          record.isLate = !!loginValidation.isLate;
          record.lateByMinutes = loginValidation.lateByMinutes || 0;
          if (loginValidation.message) {
            record.remarks = loginValidation.message;
          }

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

          // Validate shift logout window
          const logoutValidation = validateLogoutShift(now, shift);
          if (!logoutValidation.allowed) {
            return NextResponse.json(
              { error: logoutValidation.message },
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

          // Validate lunch duration (30 to 35 min)
          const lunchValidation = validateLunchEnd(record.lunchStart, now);
          if (!lunchValidation.allowed) {
            return NextResponse.json(
              { error: lunchValidation.message },
              { status: 400 }
            );
          }

          record.lunchEnd = now;
          record.lunchDurationMinutes = lunchValidation.lunchDurationMinutes || 0;
          record.excessLunchMinutes = lunchValidation.excessLunchMinutes || 0;
          if (lunchValidation.message) {
            record.remarks = record.remarks
              ? `${record.remarks} | ${lunchValidation.message}`
              : lunchValidation.message;
          }
          break;
        }

        default:
          return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }

      if (updatedBy) {
        record.updatedBy = new mongoose.Types.ObjectId(updatedBy);
      }
      await record.save();

      // AUDIT LOG
      const auditAction =
        action === "login" ? "LOGIN" : action === "logout" ? "LOGOUT" : "UPDATE";
      await createAuditLog({
        userId,
        action: auditAction,
        module: "Attendance",
        description: `Marked attendance action: ${action} for ${user.name || "user"}`,
        entityType: "Attendance",
        entityId: String(record._id),
        metadata: { action, date: targetDate, status: record.status },
      });

      // Return populated record
      const populated = await Attendance.findById(record._id)
        .populate("userId", "name email workingShift role")
        .populate("updatedBy", "name email")
        .populate("shiftId", "name code startTime endTime crossesMidnight graceMinutes")
        .populate("holidayId", "title type scope isPaid");

      return NextResponse.json(populated);
    }

    // ── Manual create / update (admin / TL / HR) ──
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const updatedByObjectId = updatedBy ? new mongoose.Types.ObjectId(updatedBy) : null;

    if (record) {
      Object.assign(record, rest);
      if (rest.status === "holiday" || rest.status === "office-off") {
        record.holiday = true;
      } else if (rest.status === "weekly-off") {
        record.weeklyOff = true;
      }
      if (updatedByObjectId) record.updatedBy = updatedByObjectId;
      await record.save();

      await createAuditLog({
        userId: updatedBy || userId,
        action: "UPDATE",
        module: "Attendance",
        description: `Updated attendance record for user ${userId}`,
        entityType: "Attendance",
        entityId: String(record._id),
        metadata: rest,
      });

      const populated = await Attendance.findById(record._id)
        .populate("userId", "name email workingShift role")
        .populate("updatedBy", "name email")
        .populate("shiftId", "name code startTime endTime crossesMidnight graceMinutes")
        .populate("holidayId", "title type scope isPaid");

      return NextResponse.json(populated);
    }

    const newRecord = await Attendance.create({
      userId: userObjectId,
      date: targetDate,
      shiftDate: targetDate,
      updatedBy: updatedByObjectId,
      holiday: rest.status === "holiday" || rest.status === "office-off",
      weeklyOff: rest.status === "weekly-off",
      ...rest,
    });

    await createAuditLog({
      userId: updatedBy || userId,
      action: "CREATE",
      module: "Attendance",
      description: `Created attendance record for user ${userId}`,
      entityType: "Attendance",
      entityId: String(newRecord._id),
      metadata: rest,
    });

    const populated = await Attendance.findById(newRecord._id)
      .populate("userId", "name email workingShift role")
      .populate("updatedBy", "name email")
      .populate("shiftId", "name code startTime endTime crossesMidnight graceMinutes")
      .populate("holidayId", "title type scope isPaid");

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error("POST /api/attendence error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}