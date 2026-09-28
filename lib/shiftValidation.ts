// export interface ValidationResult {
//   allowed: boolean;
//   message?: string;
//   isLate?: boolean;
//   lateByMinutes?: number;
//   lunchDurationMinutes?: number;
//   excessLunchMinutes?: number;
// }

// /**
//  * Format minutes into human-readable hr/min string (e.g. "5 hr 9 min", "45 min", "1 hr", "2 hrs")
//  */
// export function formatLateTime(minutes?: number): string {
//   if (!minutes || minutes <= 0) return "0 min";
//   const hrs = Math.floor(minutes / 60);
//   const mins = minutes % 60;
//   if (hrs > 0 && mins > 0) {
//     return `${hrs} hr ${mins} min`;
//   } else if (hrs > 0) {
//     return `${hrs} hr${hrs > 1 ? "s" : ""}`;
//   } else {
//     return `${mins} min`;
//   }
// }

// /**
//  * Validate employee login time based on working shift.
//  * - Day Shift: 11:00 AM (660 min) to 11:30 AM (690 min)
//  * - Night Shift: 9:30 PM (1290 min) to 10:10 PM (1330 min)
//  */
// export function validateLoginShift(
//   loggingTime: Date,
//   workingShift: "day" | "night"
// ): ValidationResult {
//   const login = new Date(loggingTime);
//   const hours = login.getHours();
//   const minutes = login.getMinutes();
//   const currentTotalMins = hours * 60 + minutes;

//   if (workingShift === "day") {
//     // Day shift login window: 11:00 AM (660 min) to 11:30 AM (690 min)
//     const startWindow = 11 * 60; // 11:00 AM
//     const lateDeadline = 11 * 60 + 30; // 11:30 AM

//     if (currentTotalMins < startWindow) {
//       return {
//         allowed: false,
//         message: "Day shift login starts at 11:00 AM. Please log in between 11:00 AM and 11:30 AM.",
//       };
//     }

//     if (currentTotalMins > lateDeadline) {
//       const diffMins = currentTotalMins - lateDeadline;
//       return {
//         allowed: true,
//         isLate: true,
//         lateByMinutes: diffMins,
//         message: `Logged in after 11:30 AM. Late by ${formatLateTime(diffMins)}.`,
//       };
//     }

//     return {
//       allowed: true,
//       isLate: false,
//       lateByMinutes: 0,
//     };
//   } else {
//     // Night shift login window: 9:30 PM (21:30 = 1290 min) to 10:10 PM (22:10 = 1330 min)
//     const startWindow = 21 * 60 + 30; // 9:30 PM (1290 min)
//     const lateDeadline = 22 * 60 + 10; // 10:10 PM (1330 min)

//     // Allowed night shift logins are between 9:30 PM (1290 min) and 6:00 AM (360 min next morning).
//     // Outside 9:30 PM to 6:00 AM (i.e. between 6:00 AM and 9:30 PM) logins are rejected.
//     if (currentTotalMins < startWindow && currentTotalMins >= 6 * 60) {
//       return {
//         allowed: false,
//         message: "Night shift login starts at 9:30 PM. Please log in between 9:30 PM and 10:10 PM.",
//       };
//     }

//     let lateMins = 0;
//     if (currentTotalMins < 6 * 60) {
//       // Logged in between 00:00 AM and 06:00 AM (e.g., 03:19 AM).
//       // Relative minutes from day 1 midnight: 1440 + currentTotalMins
//       lateMins = (1440 + currentTotalMins) - lateDeadline;
//     } else if (currentTotalMins > lateDeadline) {
//       // Logged in between 10:11 PM (1331 min) and 11:59 PM (1439 min)
//       lateMins = currentTotalMins - lateDeadline;
//     }

//     if (lateMins > 0) {
//       return {
//         allowed: true,
//         isLate: true,
//         lateByMinutes: lateMins,
//         message: `Logged in after 10:10 PM. Late by ${formatLateTime(lateMins)}.`,
//       };
//     }

//     return {
//       allowed: true,
//       isLate: false,
//       lateByMinutes: 0,
//     };
//   }
// }

// /**
//  * Validate employee logout time based on working shift.
//  * - Day Shift: Logout allowed between 7:00 PM and 7:30 PM (19:00 - 19:30)
//  * - Night Shift: Logout allowed after 6:00 AM (06:00 AM onwards)
//  */
// export function validateLogoutShift(
//   logoutTime: Date,
//   workingShift: "day" | "night"
// ): ValidationResult {
//   const logout = new Date(logoutTime);
//   const hours = logout.getHours();
//   const minutes = logout.getMinutes();
//   const currentTotalMins = hours * 60 + minutes;

//   if (workingShift === "day") {
//     const minLogoutTime = 19 * 60; // 7:00 PM (1140 min)

//     if (currentTotalMins < minLogoutTime) {
//       return {
//         allowed: false,
//         message: "Day shift logout is allowed only between 7:00 PM and 7:30 PM.",
//       };
//     }

//     return { allowed: true };
//   } else {
//     // Night shift logout is allowed after 6:00 AM
//     const minLogoutTime = 6 * 60; // 6:00 AM (360 min)

//     if (currentTotalMins < minLogoutTime && currentTotalMins >= 0) {
//       return {
//         allowed: false,
//         message: "Night shift logout is allowed only after 6:00 AM.",
//       };
//     }

//     return { allowed: true };
//   }
// }

// /**
//  * Validate lunch duration.
//  * - Lunch duration must be 30 to 35 minutes.
//  * - Minimum 30 min required.
//  * - Over 35 min flagged with excess duration.
//  */
// export function validateLunchEnd(
//   lunchStart: Date,
//   lunchEnd: Date
// ): ValidationResult {
//   const startMs = new Date(lunchStart).getTime();
//   const endMs = new Date(lunchEnd).getTime();

//   const diffMs = endMs - startMs;
//   if (diffMs < 0) {
//     return {
//       allowed: false,
//       message: "Invalid lunch end time.",
//     };
//   }

//   const durationMinutes = Math.round(diffMs / (1000 * 60));

//   if (durationMinutes < 30) {
//     return {
//       allowed: false,
//       message: `Lunch duration must be at least 30 minutes (minimum 30 min, maximum 35 min). You have taken ${durationMinutes} minutes.`,
//     };
//   }

//   const excessLunchMinutes = Math.max(0, durationMinutes - 35);
//   let warningMessage: string | undefined;

//   if (excessLunchMinutes > 0) {
//     warningMessage = `Lunch duration was ${durationMinutes} minutes (exceeded allowed 35 minutes by ${excessLunchMinutes} min).`;
//   }

//   return {
//     allowed: true,
//     lunchDurationMinutes: durationMinutes,
//     excessLunchMinutes,
//     message: warningMessage,
//   };
// }


export type WorkingShift = "day" | "night";

export type ValidationCode =
  | "OK"
  | "LATE"
  | "LUNCH_EXCEEDED"
  | "INVALID_TIME"
  | "LOGIN_TOO_EARLY"
  | "LOGIN_AFTER_SHIFT_HOURS"
  | "LOGIN_OUTSIDE_NIGHT_WINDOW"
  | "LOGOUT_BEFORE_LOGIN"
  | "LOGOUT_TOO_EARLY"
  | "LUNCH_INVALID_ORDER"
  | "LUNCH_TOO_SHORT";

export interface ValidationResult {
  allowed: boolean;
  code: ValidationCode;
  message?: string;
  isLate?: boolean;
  lateByMinutes?: number;
  /** ISO date (YYYY-MM-DD) of the shift this event belongs to, in the configured time zone. */
  shiftDate?: string;
  lunchDurationMinutes?: number;
  excessLunchMinutes?: number;
}

/** All times are minutes since local midnight. */
export interface ShiftRules {
  timeZone: string;
  day: {
    loginOpen: number;
    lateAfter: number;
    loginClose: number;
    logoutOpen: number;
  };
  night: {
    loginOpen: number;
    lateAfter: number;
    /** Times before this belong to the previous calendar day's shift; also the last moment to log in. */
    dayRollover: number;
    logoutOpen: number;
  };
  lunch: { minMinutes: number; maxMinutes: number };
}

export const DEFAULT_RULES: ShiftRules = {
  timeZone: "Asia/Kolkata",
  day: {
    loginOpen: 11 * 60,
    lateAfter: 11 * 60 + 30,
    loginClose: 19 * 60,
    logoutOpen: 19 * 60,
  },
  night: {
    loginOpen: 21 * 60 + 30,
    lateAfter: 22 * 60 + 10,
    dayRollover: 6 * 60,
    logoutOpen: 6 * 60,
  },
  lunch: { minMinutes: 30, maxMinutes: 35 },
};

/* ------------------------------ helpers ------------------------------ */

const MIN_PER_DAY = 1440;
const MS_PER_MIN = 60_000;

const deny = (code: ValidationCode, message: string): ValidationResult => ({
  allowed: false,
  code,
  message,
});

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

interface WallClock {
  /** Local calendar day as days since 1970-01-01 (wall-clock, not UTC). */
  dayIndex: number;
  minuteOfDay: number;
  /** Total wall-clock minutes; safe to compare/subtract between two WallClocks. */
  total: number;
}

/** Converts an instant to wall-clock time in `timeZone`. Returns null for invalid dates. */
function toWallClock(input: Date, timeZone: string): WallClock | null {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;

  const parts = getFormatter(timeZone).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === t)?.value);

  const dayIndex = Math.floor(
    Date.UTC(get("year"), get("month") - 1, get("day")) / (MIN_PER_DAY * MS_PER_MIN)
  );
  const minuteOfDay = get("hour") * 60 + get("minute");
  return { dayIndex, minuteOfDay, total: dayIndex * MIN_PER_DAY + minuteOfDay };
}

const dayIndexToISO = (dayIndex: number) =>
  new Date(dayIndex * MIN_PER_DAY * MS_PER_MIN).toISOString().slice(0, 10);

/** Which shift day a night-shift timestamp belongs to (00:00–06:00 → previous day). */
const nightShiftDay = (w: WallClock, rollover: number) =>
  w.minuteOfDay < rollover ? w.dayIndex - 1 : w.dayIndex;

function clock(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h24 % 12 || 12}:${String(m).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
}

/** e.g. "5 hr 9 min", "45 min", "1 hr", "2 hrs" */
export function formatLateTime(minutes?: number): string {
  if (!Number.isFinite(minutes) || (minutes as number) <= 0) return "0 min";
  const total = Math.floor(minutes as number);
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  const hrLabel = `${hrs} ${hrs === 1 ? "hr" : "hrs"}`;
  if (hrs > 0 && mins > 0) return `${hrLabel} ${mins} min`;
  if (hrs > 0) return hrLabel;
  return `${mins} min`;
}

function loginResult(
  shiftDay: number,
  lateBy: number,
  lateAfter: number
): ValidationResult {
  const shiftDate = dayIndexToISO(shiftDay);
  if (lateBy > 0) {
    return {
      allowed: true,
      code: "LATE",
      isLate: true,
      lateByMinutes: lateBy,
      shiftDate,
      message: `Logged in after ${clock(lateAfter)}. Late by ${formatLateTime(lateBy)}.`,
    };
  }
  return { allowed: true, code: "OK", isLate: false, lateByMinutes: 0, shiftDate };
}

/* ------------------------------ login ------------------------------ */

/**
 * Day shift:   login opens 11:00, on time until 11:30, late afterwards (until 19:00).
 * Night shift: login opens 21:30, on time until 22:10, late afterwards (until 06:00 next day).
 * Minutes are compared with seconds truncated, as shown on a clock.
 */
export function validateLoginShift(
  loggingTime: Date,
  workingShift: WorkingShift,
  rules: ShiftRules = DEFAULT_RULES
): ValidationResult {
  const w = toWallClock(loggingTime, rules.timeZone);
  if (!w) return deny("INVALID_TIME", "Invalid login time.");

  if (workingShift === "day") {
    const r = rules.day;
    if (w.minuteOfDay < r.loginOpen) {
      return deny(
        "LOGIN_TOO_EARLY",
        `Day shift login starts at ${clock(r.loginOpen)}. Please log in between ${clock(r.loginOpen)} and ${clock(r.lateAfter)}.`
      );
    }
    if (w.minuteOfDay > r.loginClose) {
      return deny(
        "LOGIN_AFTER_SHIFT_HOURS",
        `Day shift login is closed after ${clock(r.loginClose)}. Please contact your manager.`
      );
    }
    return loginResult(w.dayIndex, Math.max(0, w.minuteOfDay - r.lateAfter), r.lateAfter);
  }

  const r = rules.night;
  let minutesIntoShiftDay: number; // measured from midnight of the shift day
  if (w.minuteOfDay >= r.loginOpen) {
    minutesIntoShiftDay = w.minuteOfDay;
  } else if (w.minuteOfDay < r.dayRollover) {
    minutesIntoShiftDay = MIN_PER_DAY + w.minuteOfDay;
  } else {
    return deny(
      "LOGIN_OUTSIDE_NIGHT_WINDOW",
      `Night shift login starts at ${clock(r.loginOpen)}. Please log in between ${clock(r.loginOpen)} and ${clock(r.lateAfter)}.`
    );
  }
  return loginResult(
    nightShiftDay(w, r.dayRollover),
    Math.max(0, minutesIntoShiftDay - r.lateAfter),
    r.lateAfter
  );
}

/* ------------------------------ logout ------------------------------ */

/**
 * Day shift:   logout allowed from 19:00 on the login day (or any later day, e.g. forgotten logout).
 * Night shift: logout allowed from 06:00 on the day AFTER the shift started.
 *
 * Pass `loginTime` whenever you have it. Without it, only the time of day is checked,
 * which lets a night-shift user log out at 11 PM the same evening.
 */
export function validateLogoutShift(
  logoutTime: Date,
  workingShift: WorkingShift,
  loginTime?: Date,
  rules: ShiftRules = DEFAULT_RULES
): ValidationResult {
  const out = toWallClock(logoutTime, rules.timeZone);
  if (!out) return deny("INVALID_TIME", "Invalid logout time.");

  const logoutOpen = workingShift === "day" ? rules.day.logoutOpen : rules.night.logoutOpen;
  let anchorDay = out.dayIndex; // fallback when loginTime is unknown

  if (loginTime) {
    const inn = toWallClock(loginTime, rules.timeZone);
    if (!inn) return deny("INVALID_TIME", "Invalid login time.");
    if (out.total < inn.total) {
      return deny("LOGOUT_BEFORE_LOGIN", "Logout time cannot be earlier than login time.");
    }
    anchorDay =
      workingShift === "day"
        ? inn.dayIndex
        : nightShiftDay(inn, rules.night.dayRollover) + 1;
  }

  if (out.total < anchorDay * MIN_PER_DAY + logoutOpen) {
    return deny(
      "LOGOUT_TOO_EARLY",
      workingShift === "day"
        ? `Day shift logout is allowed only after ${clock(logoutOpen)}.`
        : `Night shift logout is allowed only after ${clock(logoutOpen)}.`
    );
  }
  return { allowed: true, code: "OK" };
}

/* ------------------------------ lunch ------------------------------ */

/**
 * Lunch must last between min and max minutes (default 30–35).
 * Under the minimum is rejected; over the maximum is allowed but flagged with the excess.
 * Both timestamps are truncated to the minute before subtracting.
 */
export function validateLunchEnd(
  lunchStart: Date,
  lunchEnd: Date,
  rules: ShiftRules = DEFAULT_RULES
): ValidationResult {
  const startMs = new Date(lunchStart).getTime();
  const endMs = new Date(lunchEnd).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return deny("INVALID_TIME", "Invalid lunch time.");
  }

  const duration = Math.floor(endMs / MS_PER_MIN) - Math.floor(startMs / MS_PER_MIN);
  if (duration < 0) {
    return deny("LUNCH_INVALID_ORDER", "Lunch end time cannot be before lunch start time.");
  }

  const { minMinutes, maxMinutes } = rules.lunch;
  if (duration < minMinutes) {
    return {
      ...deny(
        "LUNCH_TOO_SHORT",
        `Lunch must be at least ${minMinutes} minutes (max ${maxMinutes}). You have taken ${duration} minutes.`
      ),
      lunchDurationMinutes: duration,
    };
  }

  const excess = Math.max(0, duration - maxMinutes);
  return {
    allowed: true,
    code: excess > 0 ? "LUNCH_EXCEEDED" : "OK",
    lunchDurationMinutes: duration,
    excessLunchMinutes: excess,
    message:
      excess > 0
        ? `Lunch duration was ${duration} minutes (exceeded allowed ${maxMinutes} minutes by ${excess} min).`
        : undefined,
  };
}