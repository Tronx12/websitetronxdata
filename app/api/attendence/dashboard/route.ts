// // app/api/attendence/dashboard/route.ts

// import { NextRequest, NextResponse } from "next/server";
// import { connectDB } from "@/config/db";
// import Auth from "@/models/Auth";
// import Attendance from "@/models/Attendance";
// import { getCurrentUser } from "@/lib/getuser";

// const ALLOWED_ROLES = ["admin", "hr", "team-lead", "senior-teamlead"];

// // Lunch allowed per person (minutes)
// const LUNCH_LIMIT_MINUTES = 35;

// // Office timing: day 9:30 AM–6:00 PM, night 9:30 PM–6:00 AM (ends next day).
// // A night-shift punch before 9:30 AM belongs to the PREVIOUS day's shift.
// // Uses server local time, like the rest of this app. If the server runs in UTC,
// // set TZ=Asia/Kolkata in the environment so these hours match the office.
// const DAY_START_MINUTES = 9 * 60 + 30;

// type ShiftType = "day" | "night";

// // Parses "YYYY-MM-DD" as a LOCAL date (avoids the UTC shift bug).
// // Falls back to normal Date parsing for full ISO strings.
// function parseDateParam(value: string | null): Date {
//   if (!value) return new Date();

//   const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
//   if (match) {
//     const [, y, m, d] = match;
//     return new Date(Number(y), Number(m) - 1, Number(d));
//   }

//   return new Date(value);
// }

// const dayKey = (d: Date) => {
//   const p = (n: number) => String(n).padStart(2, "0");
//   return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
// };

// // Which shift-day does this attendance record belong to?
// // Night shift: login 9:30 PM on 1 Oct (or 3 AM on 2 Oct, a late login)
// // → both belong to 1 Oct. The logout on 2 Oct never moves the record.
// function getShiftDayKey(record: any, shiftType: ShiftType): string {
//   if (shiftType === "night" && record.loggingTime) {
//     const login = new Date(record.loggingTime);
//     if (!Number.isNaN(login.getTime())) {
//       const minutes = login.getHours() * 60 + login.getMinutes();
//       const d = new Date(login);
//       if (minutes < DAY_START_MINUTES) d.setDate(d.getDate() - 1);
//       return dayKey(d);
//     }
//   }
//   return dayKey(new Date(record.date));
// }

// type Status =
//   | "Present"
//   | "Late"
//   | "Half Day"
//   | "Leave"
//   | "Absent"
//   | "Not Marked";

// // Attendance.status values seen in the app: present | absent | half-day | office-off
// // plus the isLate flag on the record.
// function resolveStatus(record: any): Status {
//   const raw = String(record.status || "").toLowerCase();

//   if (raw.includes("half")) return "Half Day";
//   if (raw.includes("absent") || raw === "a") return "Absent";
//   // office-off is not a working day, so it is shown as Leave rather than Present
//   if (raw.includes("leave") || raw.includes("off")) return "Leave";
//   if (record.isLate || raw.includes("late")) return "Late";
//   return "Present";
// }

// function buildStats(list: { status: Status }[]) {
//   const s = {
//     total: list.length,
//     present: 0,
//     absent: 0,
//     late: 0,
//     halfDay: 0,
//     leave: 0,
//     notMarked: 0,
//   };

//   for (const e of list) {
//     switch (e.status) {
//       case "Present":
//         s.present++;
//         break;
//       case "Absent":
//         s.absent++;
//         break;
//       case "Late":
//         s.late++;
//         break;
//       case "Half Day":
//         s.halfDay++;
//         break;
//       case "Leave":
//         s.leave++;
//         break;
//       default:
//         s.notMarked++;
//     }
//   }

//   const attendancePercentage =
//     s.total > 0
//       ? Number((((s.present + s.late + s.halfDay) / s.total) * 100).toFixed(2))
//       : 0;

//   return { ...s, attendancePercentage };
// }

// export async function GET(request: NextRequest) {
//   try {
//     // =====================================================
//     // AUTH
//     // =====================================================

//     const currentUser = await getCurrentUser();

//     if (!currentUser?.userId) {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized" },
//         { status: 401 }
//       );
//     }

//     if (!ALLOWED_ROLES.includes(currentUser.role)) {
//       return NextResponse.json(
//         { success: false, message: "Forbidden" },
//         { status: 403 }
//       );
//     }

//     // =====================================================
//     // QUERY PARAMS
//     // =====================================================

//     const { searchParams } = new URL(request.url);

//     const dateParam = searchParams.get("date");
//     const shift = searchParams.get("shift") || "all";

//     const date = parseDateParam(dateParam);

//     if (Number.isNaN(date.getTime())) {
//       return NextResponse.json(
//         { success: false, message: "Invalid date" },
//         { status: 400 }
//       );
//     }

//     // =====================================================
//     // DATE RANGE
//     // The shift-day is the requested date. We read one extra day on
//     // each side so night punches that cross midnight are not missed,
//     // then keep only records whose shift-day matches (see below).
//     // =====================================================

//     const startOfDay = new Date(date);
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date(date);
//     endOfDay.setHours(23, 59, 59, 999);

//     const windowStart = new Date(startOfDay);
//     windowStart.setDate(windowStart.getDate() - 1);

//     const windowEnd = new Date(endOfDay);
//     windowEnd.setDate(windowEnd.getDate() + 1);

//     const requestedKey = dayKey(startOfDay);

//     // =====================================================
//     // DATABASE
//     // =====================================================

//     await connectDB();

//     // =====================================================
//     // EMPLOYEES (always everyone; the shift filter is applied at the end
//     // so shift-wise stats stay correct for both shifts)
//     // =====================================================

//     const employees = await Auth.find({ isActive: true })
//       .select("_id name email employeeId role workingShift isActive")
//       .lean();

//     const shiftByUser = new Map<string, ShiftType>();
//     for (const e of employees as any[]) {
//       shiftByUser.set(
//         String(e._id),
//         e.workingShift === "night" ? "night" : "day"
//       );
//     }

//     // =====================================================
//     // ATTENDANCE
//     // NOTE: no `workingShift` filter on Attendance. Records don't reliably
//     // carry that field, and filtering on it returned nothing for "night".
//     // =====================================================

//     const attendanceRecords = await Attendance.find({
//       date: { $gte: windowStart, $lte: windowEnd },
//     })
//       .sort({ createdAt: -1 })
//       .lean();

//     // Newest first, so keep the FIRST record per user for this shift-day
//     const attendanceMap = new Map<string, any>();

//     for (const record of attendanceRecords as any[]) {
//       const userId = String(
//         record.userId || record.employeeId || record.authId || ""
//       );

//       if (!userId || !shiftByUser.has(userId)) continue;
//       if (attendanceMap.has(userId)) continue;

//       const recordShift: ShiftType =
//         record.workingShift === "night"
//           ? "night"
//           : record.workingShift === "day"
//           ? "day"
//           : shiftByUser.get(userId)!;

//       if (getShiftDayKey(record, recordShift) !== requestedKey) continue;

//       attendanceMap.set(userId, record);
//     }

//     const nowMs = Date.now();

//     // =====================================================
//     // EMPLOYEE DATA
//     // =====================================================

//     const allEmployeeData = (employees as any[]).map((employee) => {
//       const id = String(employee._id);
//       const record = attendanceMap.get(id);

//       const normalizedShift: ShiftType =
//         (record?.workingShift || employee.workingShift) === "night"
//           ? "night"
//           : "day";

//       const status: Status = record ? resolveStatus(record) : "Not Marked";

//       // ---------------- LUNCH ----------------
//       const lunchStart = record?.lunchStart || record?.lunchStartTime || null;
//       const lunchEnd = record?.lunchEnd || record?.lunchEndTime || null;

//       let lunchMinutes: number | null = null;

//       if (lunchStart) {
//         const startMs = new Date(lunchStart).getTime();

//         if (!Number.isNaN(startMs)) {
//           if (lunchEnd) {
//             const endMs = new Date(lunchEnd).getTime();
//             lunchMinutes =
//               typeof record?.lunchDurationMinutes === "number"
//                 ? record.lunchDurationMinutes
//                 : Math.round((endMs - startMs) / 60000);
//           } else {
//             lunchMinutes = Math.max(0, Math.floor((nowMs - startMs) / 60000));
//           }
//         }
//       }

//       return {
//         _id: employee._id,
//         name: employee.name,
//         employeeId: employee.employeeId || "—",
//         email: employee.email,
//         role: employee.role,
//         workingShift: normalizedShift,

//         // Attendance schema uses `loggingTime` (kept old names as fallback)
//         loginTime:
//           record?.loggingTime || record?.loginTime || record?.checkIn || null,
//         logoutTime: record?.logoutTime || record?.checkOut || null,
//         lateByMinutes: record?.lateByMinutes ?? null,

//         lunchStart,
//         lunchEnd,
//         lunchMinutes,

//         status,

//         attendanceId: record?._id || null,
//       };
//     });

//     // =====================================================
//     // SHIFT FILTER + STATS
//     // =====================================================

//     const employeeData =
//       shift === "all"
//         ? allEmployeeData
//         : allEmployeeData.filter((e) => e.workingShift === shift);

//     const summaryStats = buildStats(employeeData);

//     const dayStats = buildStats(
//       allEmployeeData.filter((e) => e.workingShift === "day")
//     );
//     const nightStats = buildStats(
//       allEmployeeData.filter((e) => e.workingShift === "night")
//     );

//     // =====================================================
//     // LUNCH SUMMARY
//     // =====================================================

//     const lunch = {
//       limitMinutes: LUNCH_LIMIT_MINUTES,
//       onLunch: 0,
//       overdue: 0, // started, not ended, over the limit
//       exceeded: 0, // ended, but took longer than the limit
//     };

//     for (const e of employeeData) {
//       if (!e.lunchStart || e.lunchMinutes === null) continue;

//       if (!e.lunchEnd) {
//         if (e.lunchMinutes > LUNCH_LIMIT_MINUTES) lunch.overdue++;
//         else lunch.onLunch++;
//       } else if (e.lunchMinutes > LUNCH_LIMIT_MINUTES) {
//         lunch.exceeded++;
//       }
//     }

//     // =====================================================
//     // RESPONSE
//     // =====================================================

//     return NextResponse.json({
//       success: true,

//       data: {
//         date: startOfDay.toISOString(),
//         dateKey: requestedKey,

//         summary: {
//           totalEmployees: summaryStats.total,
//           present: summaryStats.present,
//           absent: summaryStats.absent,
//           late: summaryStats.late,
//           halfDay: summaryStats.halfDay,
//           leave: summaryStats.leave,
//           notMarked: summaryStats.notMarked,
//           attendancePercentage: summaryStats.attendancePercentage,
//         },

//         lunch,

//         shiftWise: {
//           day: dayStats,
//           night: nightStats,
//         },

//         employees: employeeData,
//       },
//     });
//   } catch (error: any) {
//     console.error("GET /api/attendence/dashboard ERROR:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         message: error?.message || "Failed to load attendance dashboard",
//       },
//       { status: 500 }
//     );
//   }
// }


// app/api/attendence/dashboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import Attendance from "@/models/Attendance";
import Leave from "@/models/Leave";
import OfficeOff from "@/models/OfficeOff";
import OfficeSettings from "@/models/OfficeSettings";
import WeeklyOffPolicy from "@/models/WeeklyOffPolicy";
import Shift from "@/models/Shift";
import { getCurrentUser } from "@/lib/getuser";

const ALLOWED_ROLES = ["admin", "hr", "team-lead", "senior-teamlead"];

// Lunch allowed per person (minutes)
const LUNCH_LIMIT_MINUTES = 35;

// Office timing: day 9:30 AM–6:00 PM, night 9:30 PM–6:00 AM (ends next day).
// A night-shift punch before 9:30 AM belongs to the PREVIOUS day's shift.
// Uses server local time, like the rest of this app. If the server runs in UTC,
// set TZ=Asia/Kolkata in the environment so these hours match the office.
const DAY_START_MINUTES = 9 * 60 + 30;

const DAY_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

type ShiftType = "day" | "night";

type Status =
  | "Present"
  | "Late"
  | "Half Day"
  | "Leave"
  | "Absent"
  | "Office Off"
  | "Not Marked";

// Parses "YYYY-MM-DD" as a LOCAL date (avoids the UTC shift bug).
// Falls back to normal Date parsing for full ISO strings.
function parseDateParam(value: string | null): Date {
  if (!value) return new Date();

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  return new Date(value);
}

const dayKey = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const shortDate = (d: any) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

// Which shift-day does this attendance record belong to?
// Night shift: login 9:30 PM on 1 Oct (or 3 AM on 2 Oct, a late login)
// → both belong to 1 Oct. The logout on 2 Oct never moves the record.
function getShiftDayKey(record: any, shiftType: ShiftType): string {
  if (shiftType === "night" && record.loggingTime) {
    const login = new Date(record.loggingTime);
    if (!Number.isNaN(login.getTime())) {
      const minutes = login.getHours() * 60 + login.getMinutes();
      const d = new Date(login);
      if (minutes < DAY_START_MINUTES) d.setDate(d.getDate() - 1);
      return dayKey(d);
    }
  }
  return dayKey(new Date(record.date));
}

// Status stored on the Attendance record itself
// (present | absent | half-day | office-off, plus the isLate flag)
function resolveStatus(record: any): Status {
  const raw = String(record.status || "").toLowerCase();

  if (raw.includes("half")) return "Half Day";
  if (raw.includes("absent") || raw === "a") return "Absent";
  if (raw.includes("leave")) return "Leave";
  if (raw.includes("off")) return "Office Off";
  if (record.isLate || raw.includes("late")) return "Late";
  return "Present";
}

function buildStats(list: { status: Status }[]) {
  const s = {
    total: list.length,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
    officeOff: 0,
    notMarked: 0,
  };

  for (const e of list) {
    switch (e.status) {
      case "Present":
        s.present++;
        break;
      case "Absent":
        s.absent++;
        break;
      case "Late":
        s.late++;
        break;
      case "Half Day":
        s.halfDay++;
        break;
      case "Leave":
        s.leave++;
        break;
      case "Office Off":
        s.officeOff++;
        break;
      default:
        s.notMarked++;
    }
  }

  // People on office off / holiday are not expected at work,
  // so they are left out of the percentage.
  const expected = s.total - s.officeOff;

  const attendancePercentage =
    expected > 0
      ? Number((((s.present + s.late + s.halfDay) / expected) * 100).toFixed(2))
      : 0;

  return { ...s, attendancePercentage };
}

export async function GET(request: NextRequest) {
  try {
    // =====================================================
    // AUTH
    // =====================================================

    const currentUser = await getCurrentUser();

    if (!currentUser?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // =====================================================
    // QUERY PARAMS
    // =====================================================

    const { searchParams } = new URL(request.url);

    const dateParam = searchParams.get("date");
    const shift = searchParams.get("shift") || "all";

    const date = parseDateParam(dateParam);

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date" },
        { status: 400 }
      );
    }

    // =====================================================
    // DATE RANGE
    // The shift-day is the requested date. We read one extra day on
    // each side so night punches that cross midnight are not missed,
    // then keep only records whose shift-day matches (see below).
    // =====================================================

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const windowStart = new Date(startOfDay);
    windowStart.setDate(windowStart.getDate() - 1);

    const windowEnd = new Date(endOfDay);
    windowEnd.setDate(windowEnd.getDate() + 1);

    const requestedKey = dayKey(startOfDay);

    // OfficeOff / WeeklyOffPolicy dates are stored as UTC midnight
    const dayUTC = new Date(`${requestedKey}T00:00:00.000Z`);
    const nextDayUTC = new Date(dayUTC);
    nextDayUTC.setUTCDate(nextDayUTC.getUTCDate() + 1);
    const weekdayName = DAY_NAMES[dayUTC.getUTCDay()];

    // =====================================================
    // DATABASE
    // =====================================================

    await connectDB();

    // =====================================================
    // EMPLOYEES (always everyone; the shift filter is applied at the end
    // so shift-wise stats stay correct for both shifts)
    // =====================================================

    const employees = (await Auth.find({ isActive: true })
      .select("_id name email employeeId role workingShift teamId shiftId isActive")
      .lean()) as any[];

    const shiftByUser = new Map<string, ShiftType>();
    for (const e of employees) {
      shiftByUser.set(
        String(e._id),
        e.workingShift === "night" ? "night" : "day"
      );
    }

    // =====================================================
    // ATTENDANCE, LEAVES, OFFICE OFF, WEEKLY OFF — in parallel
    // NOTE: no `workingShift` filter on Attendance. Records don't reliably
    // carry that field, and filtering on it returned nothing for "night".
    // =====================================================

    const [
      attendanceRecords,
      approvedLeaves,
      officeOffs,
      weeklyPolicies,
      officeSettings,
      shifts,
    ] = await Promise.all([
      Attendance.find({ date: { $gte: windowStart, $lte: windowEnd } })
        .sort({ createdAt: -1 })
        .lean(),

      // Only APPROVED leaves covering the requested day
      Leave.find({
        status: "APPROVED",
        startDate: { $lte: endOfDay },
        endDate: { $gte: startOfDay },
      }).lean(),

      OfficeOff.find({
        isActive: true,
        date: { $gte: dayUTC, $lt: nextDayUTC },
      }).lean(),

      WeeklyOffPolicy.find({ isActive: true }).lean(),

      OfficeSettings.findOne().lean(),

      Shift.find({ isActive: true }).lean(),
    ]);

    // ---------------- attendance (newest first, keep first per user) -------------
    const attendanceMap = new Map<string, any>();

    for (const record of attendanceRecords as any[]) {
      const userId = String(
        record.userId || record.employeeId || record.authId || ""
      );

      if (!userId || !shiftByUser.has(userId)) continue;
      if (attendanceMap.has(userId)) continue;

      const recordShift: ShiftType =
        record.workingShift === "night"
          ? "night"
          : record.workingShift === "day"
          ? "day"
          : shiftByUser.get(userId)!;

      if (getShiftDayKey(record, recordShift) !== requestedKey) continue;

      attendanceMap.set(userId, record);
    }

    // ---------------- leaves ----------------
    const leaveByUser = new Map<string, any>();
    for (const leave of approvedLeaves as any[]) {
      const id = String(leave.employeeId);
      if (!leaveByUser.has(id)) leaveByUser.set(id, leave);
    }

    // ---------------- office off (holiday) ----------------
    // Shift documents are mapped to day/night: crossesMidnight (or "night" in
    // the name/code) = night shift.
    const shiftTypeById = new Map<string, ShiftType>();
    for (const s of shifts as any[]) {
      const looksNight =
        s.crossesMidnight === true || /night/i.test(`${s.name || ""} ${s.code || ""}`);
      shiftTypeById.set(String(s._id), looksNight ? "night" : "day");
    }

    const includesId = (list: any[] | undefined, id: any) =>
      !!id && Array.isArray(list) && list.some((x) => String(x) === String(id));

    const findOfficeOff = (employee: any, employeeShift: ShiftType) => {
      for (const off of officeOffs as any[]) {
        switch (off.scope) {
          case "all":
            return off;
          case "team":
            if (includesId(off.teamIds, employee.teamId)) return off;
            break;
          case "shift": {
            if (includesId(off.shiftIds, employee.shiftId)) return off;
            const types = (off.shiftIds || []).map((id: any) =>
              shiftTypeById.get(String(id))
            );
            if (types.includes(employeeShift)) return off;
            break;
          }
          case "employee":
            if (includesId(off.employeeIds, employee._id)) return off;
            break;
        }
      }
      return null;
    };

    // ---------------- weekly off ----------------
    const policyActive = (p: any) =>
      (!p.effectiveFrom || new Date(p.effectiveFrom) <= dayUTC) &&
      (!p.effectiveTo || new Date(p.effectiveTo) >= dayUTC);

    const policyDays = (p: any): string[] => {
      if (p.rotational && Array.isArray(p.rotationWeeks) && p.rotationWeeks.length) {
        // Assumes rotationWeeks = [["SUNDAY"], ["SATURDAY","SUNDAY"], ...]
        // (or [{ days: [...] }, ...]), starting from effectiveFrom.
        const from = p.effectiveFrom ? new Date(p.effectiveFrom) : dayUTC;
        const weeks = Math.floor((dayUTC.getTime() - from.getTime()) / (7 * 86400000));
        const idx = ((weeks % p.rotationWeeks.length) + p.rotationWeeks.length) % p.rotationWeeks.length;
        const entry = p.rotationWeeks[idx];
        return Array.isArray(entry) ? entry : entry?.days || [];
      }
      return Array.isArray(p.days) ? p.days : [];
    };

    const latest = (list: any[]) =>
      list.sort(
        (a, b) =>
          new Date(b.effectiveFrom || 0).getTime() -
          new Date(a.effectiveFrom || 0).getTime()
      )[0];

    const activePolicies = (weeklyPolicies as any[]).filter(policyActive);

    // Most specific policy wins: employee > team > company.
    // Without any company policy, fall back to OfficeSettings (Sat/Sun flags).
    const weeklyOffDays = (employee: any): string[] | null => {
      const emp = activePolicies.filter(
        (p) => p.scope === "employee" && String(p.employeeId) === String(employee._id)
      );
      if (emp.length) return policyDays(latest(emp));

      const team = activePolicies.filter(
        (p) => p.scope === "team" && employee.teamId && String(p.teamId) === String(employee.teamId)
      );
      if (team.length) return policyDays(latest(team));

      const company = activePolicies.filter((p) => p.scope === "company");
      if (company.length) return policyDays(latest(company));

      const settings: any = officeSettings || {};
      const days: string[] = [];
      if (settings.saturdayOff || settings.weekendOff) days.push("SATURDAY");
      if (settings.sundayOff || settings.weekendOff) days.push("SUNDAY");
      return days;
    };

    const nowMs = Date.now();

    // =====================================================
    // EMPLOYEE DATA
    // =====================================================

    const allEmployeeData = employees.map((employee) => {
      const id = String(employee._id);
      const record = attendanceMap.get(id);

      const normalizedShift: ShiftType =
        (record?.workingShift || employee.workingShift) === "night"
          ? "night"
          : "day";

      let status: Status = record ? resolveStatus(record) : "Not Marked";
      let statusNote: string | null = null;

      // Someone who actually worked keeps their attendance status,
      // even on a holiday or approved leave.
      const worked =
        status === "Present" || status === "Late" || status === "Half Day";

      if (!worked) {
        const off = findOfficeOff(employee, normalizedShift);

        if (off) {
          status = "Office Off";
          statusNote = `${titleCase(String(off.type || "holiday"))}: ${off.title}${
            off.isPaid === false ? " (unpaid)" : ""
          }`;
        } else if (weeklyOffDays(employee)?.includes(weekdayName)) {
          status = "Office Off";
          statusNote = `Weekly off · ${titleCase(weekdayName)}`;
        } else {
          const leave = leaveByUser.get(id);
          if (leave) {
            status = "Leave";
            statusNote = `Approved ${titleCase(String(leave.leaveType || ""))} leave · ${shortDate(
              leave.startDate
            )}${
              String(leave.startDate) !== String(leave.endDate)
                ? ` – ${shortDate(leave.endDate)}`
                : ""
            }`;
          } else if (status === "Office Off") {
            statusNote = "Marked office off";
          } else if (status === "Leave") {
            statusNote = "Marked leave";
          }
        }
      }

      // ---------------- LUNCH ----------------
      const lunchStart = record?.lunchStart || record?.lunchStartTime || null;
      const lunchEnd = record?.lunchEnd || record?.lunchEndTime || null;

      let lunchMinutes: number | null = null;

      if (lunchStart) {
        const startMs = new Date(lunchStart).getTime();

        if (!Number.isNaN(startMs)) {
          if (lunchEnd) {
            const endMs = new Date(lunchEnd).getTime();
            lunchMinutes =
              typeof record?.lunchDurationMinutes === "number"
                ? record.lunchDurationMinutes
                : Math.round((endMs - startMs) / 60000);
          } else {
            lunchMinutes = Math.max(0, Math.floor((nowMs - startMs) / 60000));
          }
        }
      }

      return {
        _id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId || "—",
        email: employee.email,
        role: employee.role,
        workingShift: normalizedShift,

        // Attendance schema uses `loggingTime` (kept old names as fallback)
        loginTime:
          record?.loggingTime || record?.loginTime || record?.checkIn || null,
        logoutTime: record?.logoutTime || record?.checkOut || null,
        lateByMinutes: record?.lateByMinutes ?? null,

        lunchStart,
        lunchEnd,
        lunchMinutes,

        status,
        statusNote,

        attendanceId: record?._id || null,
      };
    });

    // =====================================================
    // SHIFT FILTER + STATS
    // =====================================================

    const employeeData =
      shift === "all"
        ? allEmployeeData
        : allEmployeeData.filter((e) => e.workingShift === shift);

    const summaryStats = buildStats(employeeData);

    const dayStats = buildStats(
      allEmployeeData.filter((e) => e.workingShift === "day")
    );
    const nightStats = buildStats(
      allEmployeeData.filter((e) => e.workingShift === "night")
    );

    // =====================================================
    // LUNCH SUMMARY
    // =====================================================

    const lunch = {
      limitMinutes: LUNCH_LIMIT_MINUTES,
      onLunch: 0,
      overdue: 0, // started, not ended, over the limit
      exceeded: 0, // ended, but took longer than the limit
    };

    for (const e of employeeData) {
      if (!e.lunchStart || e.lunchMinutes === null) continue;

      if (!e.lunchEnd) {
        if (e.lunchMinutes > LUNCH_LIMIT_MINUTES) lunch.overdue++;
        else lunch.onLunch++;
      } else if (e.lunchMinutes > LUNCH_LIMIT_MINUTES) {
        lunch.exceeded++;
      }
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      data: {
        date: startOfDay.toISOString(),
        dateKey: requestedKey,

        summary: {
          totalEmployees: summaryStats.total,
          present: summaryStats.present,
          absent: summaryStats.absent,
          late: summaryStats.late,
          halfDay: summaryStats.halfDay,
          leave: summaryStats.leave,
          officeOff: summaryStats.officeOff,
          notMarked: summaryStats.notMarked,
          attendancePercentage: summaryStats.attendancePercentage,
        },

        lunch,

        shiftWise: {
          day: dayStats,
          night: nightStats,
        },

        employees: employeeData,
      },
    });
  } catch (error: any) {
    console.error("GET /api/attendence/dashboard ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to load attendance dashboard",
      },
      { status: 500 }
    );
  }
}