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

// Attendance dates are stored as date-only values.
// Always normalize them to UTC midnight so a browser sending
// "2026-10-01T00:00:00.000Z" cannot become September 30 on the server.
// function normalizeAttendanceDate(value?: string | Date | null, fallback = new Date()): Date {
//   const raw =
//     value instanceof Date
//       ? value.toISOString().slice(0, 10)
//       : value
//         ? String(value).slice(0, 10)
//         : fallback.toISOString().slice(0, 10);

//   const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
//   if (!match) {
//     const d = new Date(fallback);
//     d.setUTCHours(0, 0, 0, 0);
//     return d;
//   }

//   return new Date(
//     Date.UTC(
//       Number(match[1]),
//       Number(match[2]) - 1,
//       Number(match[3])
//     )
//   );
// }

import {
  attendanceDateToUTC,
  getAttendanceDateString,
} from "@/lib/attendanceTimezone";

// function normalizeAttendanceDate(
//   value?: string | Date | null,
//   fallback = new Date()
// ): Date {
//   // Date-only value coming from API:
//   // YYYY-MM-DD
//   if (typeof value === "string") {
//     const raw = value.slice(0, 10);

//     if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
//       return attendanceDateToUTC(raw);
//     }
//   }

//   // Date object = calculate its calendar date in IST.
//   if (value instanceof Date) {
//     return attendanceDateToUTC(
//       getAttendanceDateString(value)
//     );
//   }

//   // No value = current IST attendance date.
//   return attendanceDateToUTC(
//     getAttendanceDateString(fallback)
//   );
// }

function normalizeAttendanceDate(
  value?: string | Date | null,
  fallback = new Date()
): Date {
  /**
   * API date:
   * YYYY-MM-DD
   *
   * This is already an attendance calendar date,
   * so do not convert it through browser/server timezone.
   */
  if (typeof value === "string") {
    const raw = value.slice(0, 10);

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return attendanceDateToUTC(raw);
    }
  }

  /**
   * Date object:
   * Extract its calendar date specifically
   * from Asia/Kolkata.
   */
  if (value instanceof Date) {
    return attendanceDateToUTC(
      getAttendanceDateString(value)
    );
  }

  /**
   * No date supplied:
   * use today's Asia/Kolkata date.
   */
  return attendanceDateToUTC(
    getAttendanceDateString(fallback)
  );
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}


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
      const start = normalizeAttendanceDate(date);
      const end = addUtcDays(start, 1);
      filter.date = { $gte: start, $lt: end };
    } else if (from || to) {
      filter.date = {};
      if (from) {
        filter.date.$gte = normalizeAttendanceDate(from);
      }
      if (to) {
        filter.date.$lt = addUtcDays(normalizeAttendanceDate(to), 1);
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
// export async function POST(request: NextRequest) {
//   try {
//     await connectDB();

//     const body = await request.json();
//     const {
//       userId,
//       action,
//       date,
//       updatedBy,
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

    // =====================================================
    // VALIDATE USER ID
    // =====================================================

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Valid userId is required" },
        { status: 400 }
      );
    }

    // =====================================================
    // CURRENT TIME
    // =====================================================

    const now = new Date();

    // =====================================================
    // GET USER + SHIFT
    // =====================================================

    const user = await Auth.findById(userId).select(
      "workingShift name"
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const shift =
      (user.workingShift as "day" | "night") || "day";

    // =====================================================
    // RESOLVE TARGET ATTENDANCE DATE
    //
    // Day shift:
    //   Login/Logout same calendar date.
    //
    // Night shift:
    //   Login: 30 Sep
    //   Logout: 01 Oct
    //
    //   Logout must find the 30 Sep record.
    // =====================================================

    // =====================================================
    // RESOLVE ATTENDANCE DATE / ACTIVE SHIFT RECORD
    // =====================================================
    //
    // IMPORTANT:
    // Do NOT trust an ISO datetime coming from the browser as a
    // local midnight. "2026-10-01T00:00:00.000Z" can become
    // Sep 30 when setHours() is used in another timezone.
    //
    // For logout/lunch, the server finds the latest open record
    // directly. This is the reliable solution for cross-midnight
    // night shifts:
    //
    // 01 Oct 11:25 PM -> login stored in 01 Oct record
    // 02 Oct 06:30 AM -> logout updates the same 01 Oct record
    // =====================================================

    let targetDate = normalizeAttendanceDate(date, now);

    let record = await Attendance.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      date: targetDate,
    });

    if (action && action !== "login") {
      // A night-shift attendance record remains open across midnight.
      // Find the most recent open attendance record rather than relying
      // on the browser's calendar date.
      const openSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const activeRecord = await Attendance.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        loggingTime: { $gte: openSince, $ne: null },
        logoutTime: null,
      }).sort({ loggingTime: -1 });

      if (activeRecord) {
        record = activeRecord;
        targetDate = normalizeAttendanceDate(
          activeRecord.date,
          activeRecord.loggingTime || now
        );
      }
    }

    // Prevent a second login while a previous shift is still open.
    if (action === "login") {
      const openSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const activeRecord = await Attendance.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        loggingTime: { $gte: openSince, $ne: null },
        logoutTime: null,
      }).sort({ loggingTime: -1 });

      if (activeRecord?.loggingTime) {
        return NextResponse.json(
          {
            error: "You already have an active attendance login. Please logout the previous shift first.",
          },
          { status: 400 }
        );
      }
    }

    // =====================================================
    // ACTION BASED FLOW
    // =====================================================

    if (action) {
      switch (action) {

        // =================================================
        // LOGIN
        // =================================================

        case "login": {

          // -----------------------------------------------
          // Don't allow duplicate login
          // -----------------------------------------------

          if (record?.loggingTime) {
            return NextResponse.json(
              {
                error:
                  "Already logged in for this date",
              },
              { status: 400 }
            );
          }

          // -----------------------------------------------
          // Validate login shift window
          // -----------------------------------------------

          const loginValidation =
            validateLoginShift(
              now,
              shift
            );

          if (!loginValidation.allowed) {
            return NextResponse.json(
              {
                error:
                  loginValidation.message,
              },
              { status: 400 }
            );
          }

          // -----------------------------------------------
          // Resolve holiday / weekly off / shift
          // -----------------------------------------------

          const dayResolution =
            await resolveAttendanceDay({
              userId,
              date: targetDate,
            });

          // -----------------------------------------------
          // Create record if it doesn't exist
          // -----------------------------------------------

          if (!record) {
            record = new Attendance({
              userId:
                new mongoose.Types.ObjectId(
                  userId
                ),

              date: targetDate,

              shiftDate: targetDate,

              updatedBy: updatedBy
                ? new mongoose.Types.ObjectId(
                  updatedBy
                )
                : null,
            });
          }

          // -----------------------------------------------
          // Attendance status
          // -----------------------------------------------

          if (dayResolution.holiday) {

            record.status =
              "worked-on-holiday";

            record.holiday = true;

            record.holidayId =
              dayResolution.holidayId
                ? new mongoose.Types.ObjectId(
                  dayResolution.holidayId
                )
                : null;

          } else if (
            dayResolution.weeklyOff
          ) {

            record.status =
              "worked-on-weekly-off";

            record.weeklyOff = true;

          } else {

            record.status = "present";

            record.holiday = false;

            record.weeklyOff = false;
          }

          // -----------------------------------------------
          // Assign resolved shift
          // -----------------------------------------------

          if (
            dayResolution.resolvedShiftId
          ) {
            record.shiftId =
              new mongoose.Types.ObjectId(
                dayResolution.resolvedShiftId
              );
          }

          // -----------------------------------------------
          // Store login
          // -----------------------------------------------

          record.shiftDate =
            targetDate;

          record.loggingTime =
            now;

          // -----------------------------------------------
          // Late calculation
          // -----------------------------------------------

          record.isLate =
            !!loginValidation.isLate;

          record.lateByMinutes =
            loginValidation.lateByMinutes ||
            0;

          if (
            loginValidation.message
          ) {
            record.remarks =
              loginValidation.message;
          }

          break;
        }

        // =================================================
        // LOGOUT
        // =================================================

        case "logout": {

          // -----------------------------------------------
          // IMPORTANT:
          // For night shift, `record` may belong to
          // yesterday because the shift crosses midnight.
          // -----------------------------------------------

          if (!record?.loggingTime) {
            return NextResponse.json(
              {
                error:
                  "You have not logged in today. Please contact your Team Lead.",
              },
              { status: 400 }
            );
          }

          // -----------------------------------------------
          // Already logged out
          // -----------------------------------------------

          if (record.logoutTime) {
            return NextResponse.json(
              {
                error:
                  "Already logged out",
              },
              { status: 400 }
            );
          }

          // -----------------------------------------------
          // Validate logout window
          // -----------------------------------------------

          const logoutValidation =
            validateLogoutShift(
              now,
              shift,
              record.loggingTime
            );

          if (!logoutValidation.allowed) {
            return NextResponse.json(
              {
                error:
                  logoutValidation.message,
              },
              { status: 400 }
            );
          }

          // -----------------------------------------------
          // Store logout
          //
          // Example:
          // loggingTime = 30 Sep 11:25 PM
          // logoutTime  = 01 Oct 06:00 AM
          //
          // Both stay in the SAME Attendance document.
          // -----------------------------------------------

          record.logoutTime = now;

          break;
        }

        // =================================================
        // LUNCH START
        // =================================================

        case "lunchStart": {

          if (!record?.loggingTime) {
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
              {
                error:
                  "Lunch already started",
              },
              { status: 400 }
            );
          }

          record.lunchStart = now;

          break;
        }

        // =================================================
        // LUNCH END
        // =================================================

        case "lunchEnd": {

          if (!record?.loggingTime) {
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
              {
                error:
                  "Lunch not started yet",
              },
              { status: 400 }
            );
          }

          if (record.lunchEnd) {
            return NextResponse.json(
              {
                error:
                  "Lunch already ended",
              },
              { status: 400 }
            );
          }

          // -----------------------------------------------
          // Validate lunch duration
          // 30 - 35 minutes
          // -----------------------------------------------

          const lunchValidation =
            validateLunchEnd(
              record.lunchStart,
              now
            );

          if (!lunchValidation.allowed) {
            return NextResponse.json(
              {
                error:
                  lunchValidation.message,
              },
              { status: 400 }
            );
          }

          record.lunchEnd = now;

          record.lunchDurationMinutes =
            lunchValidation.lunchDurationMinutes ||
            0;

          record.excessLunchMinutes =
            lunchValidation.excessLunchMinutes ||
            0;

          if (
            lunchValidation.message
          ) {
            record.remarks =
              record.remarks
                ? `${record.remarks} | ${lunchValidation.message}`
                : lunchValidation.message;
          }

          break;
        }

        // =================================================
        // INVALID ACTION
        // =================================================

        default:
          return NextResponse.json(
            {
              error:
                "Invalid action",
            },
            { status: 400 }
          );
      }

      // ===================================================
      // UPDATED BY
      // ===================================================

      if (updatedBy) {
        record.updatedBy =
          new mongoose.Types.ObjectId(
            updatedBy
          );
      }

      // ===================================================
      // SAVE
      // ===================================================

      await record.save();

      // ===================================================
      // AUDIT LOG
      // ===================================================

      const auditAction =
        action === "login"
          ? "LOGIN"
          : action === "logout"
            ? "LOGOUT"
            : "UPDATE";

      await createAuditLog({
        userId,

        action: auditAction,

        module: "Attendance",

        description:
          `Marked attendance action: ${action} for ${user.name || "user"
          }`,

        entityType: "Attendance",

        entityId: String(
          record._id
        ),

        metadata: {
          action,
          date: targetDate,
          status: record.status,
        },
      });

      // ===================================================
      // RETURN POPULATED RECORD
      // ===================================================

      const populated =
        await Attendance.findById(
          record._id
        )
          .populate(
            "userId",
            "name email workingShift role"
          )
          .populate(
            "updatedBy",
            "name email"
          )
          .populate(
            "shiftId",
            "name code startTime endTime crossesMidnight graceMinutes"
          )
          .populate(
            "holidayId",
            "title type scope isPaid"
          );

      return NextResponse.json(
        populated
      );
    }

    // =====================================================
    // MANUAL CREATE / UPDATE
    // Admin / TL / HR
    // =====================================================

    const userObjectId =
      new mongoose.Types.ObjectId(
        userId
      );

    const updatedByObjectId =
      updatedBy
        ? new mongoose.Types.ObjectId(
          updatedBy
        )
        : null;

    // =====================================================
    // UPDATE EXISTING RECORD
    // =====================================================

    if (record) {

      Object.assign(
        record,
        rest
      );

      if (
        rest.status === "holiday" ||
        rest.status === "office-off"
      ) {
        record.holiday = true;

      } else if (
        rest.status === "weekly-off"
      ) {
        record.weeklyOff = true;
      }

      if (updatedByObjectId) {
        record.updatedBy =
          updatedByObjectId;
      }

      await record.save();

      await createAuditLog({
        userId:
          updatedBy || userId,

        action: "UPDATE",

        module: "Attendance",

        description:
          `Updated attendance record for user ${userId}`,

        entityType: "Attendance",

        entityId:
          String(record._id),

        metadata: rest,
      });

      const populated =
        await Attendance.findById(
          record._id
        )
          .populate(
            "userId",
            "name email workingShift role"
          )
          .populate(
            "updatedBy",
            "name email"
          )
          .populate(
            "shiftId",
            "name code startTime endTime crossesMidnight graceMinutes"
          )
          .populate(
            "holidayId",
            "title type scope isPaid"
          );

      return NextResponse.json(
        populated
      );
    }

    // =====================================================
    // CREATE MANUAL RECORD
    // =====================================================

    const newRecord =
      await Attendance.create({
        userId:
          userObjectId,

        date:
          targetDate,

        shiftDate:
          targetDate,

        updatedBy:
          updatedByObjectId,

        holiday:
          rest.status === "holiday" ||
          rest.status === "office-off",

        weeklyOff:
          rest.status === "weekly-off",

        ...rest,
      });

    await createAuditLog({
      userId:
        updatedBy || userId,

      action: "CREATE",

      module: "Attendance",

      description:
        `Created attendance record for user ${userId}`,

      entityType: "Attendance",

      entityId:
        String(newRecord._id),

      metadata: rest,
    });

    const populated =
      await Attendance.findById(
        newRecord._id
      )
        .populate(
          "userId",
          "name email workingShift role"
        )
        .populate(
          "updatedBy",
          "name email"
        )
        .populate(
          "shiftId",
          "name code startTime endTime crossesMidnight graceMinutes"
        )
        .populate(
          "holidayId",
          "title type scope isPaid"
        );

    return NextResponse.json(
      populated,
      { status: 201 }
    );

  } catch (error) {

    console.error(
      "POST /api/attendence error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      { status: 500 }
    );
  }
}