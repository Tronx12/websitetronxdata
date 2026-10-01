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

  /** ISO date YYYY-MM-DD of the shift start date */
  shiftDate?: string;

  lunchDurationMinutes?: number;
  excessLunchMinutes?: number;
}

/**
 * All times are minutes since local midnight.
 */
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

    /**
     * 06:30 AM.
     *
     * Times before this belong to the previous
     * calendar day's night shift.
     */
    dayRollover: number;

    /**
     * Night logout becomes available at 06:30 AM.
     */
    logoutOpen: number;
  };

  lunch: {
    minMinutes: number;
    maxMinutes: number;
  };
}

/* =========================================================
   DEFAULT SHIFT RULES
   ========================================================= */

export const DEFAULT_RULES: ShiftRules = {
  timeZone: "Asia/Kolkata",

  day: {
    loginOpen: 11 * 60, // 11:00 AM
    lateAfter: 11 * 60 + 30, // 11:30 AM
    loginClose: 19 * 60, // 7:00 PM
    logoutOpen: 19 * 60, // 7:00 PM
  },

  night: {
    loginOpen: 21 * 60 + 30, // 9:30 PM
    lateAfter: 22 * 60 + 10, // 10:10 PM

    // IMPORTANT:
    // Night shift ends at 6:30 AM.
    dayRollover: 6 * 60 + 30,

    // Logout allowed from 6:30 AM.
    logoutOpen: 6 * 60 + 30,
  },

  lunch: {
    minMinutes: 30,
    maxMinutes: 35,
  },
};

/* =========================================================
   CONSTANTS
   ========================================================= */

const MIN_PER_DAY = 1440;
const MS_PER_MIN = 60_000;

/* =========================================================
   HELPERS
   ========================================================= */

const deny = (
  code: ValidationCode,
  message: string
): ValidationResult => ({
  allowed: false,
  code,
  message,
});

const formatterCache = new Map<
  string,
  Intl.DateTimeFormat
>();

function getFormatter(
  timeZone: string
): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    formatterCache.set(timeZone, formatter);
  }

  return formatter;
}

interface WallClock {
  dayIndex: number;
  minuteOfDay: number;
  total: number;
}

/**
 * Convert an instant to wall-clock time in configured timezone.
 */
function toWallClock(
  input: Date,
  timeZone: string
): WallClock | null {
  const d = new Date(input);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  const parts =
    getFormatter(timeZone).formatToParts(d);

  const get = (
    type: Intl.DateTimeFormatPartTypes
  ) =>
    Number(
      parts.find(
        (part) => part.type === type
      )?.value
    );

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");

  const dayIndex = Math.floor(
    Date.UTC(
      year,
      month - 1,
      day
    ) /
    (MIN_PER_DAY * MS_PER_MIN)
  );

  const minuteOfDay =
    hour * 60 + minute;

  return {
    dayIndex,
    minuteOfDay,
    total:
      dayIndex * MIN_PER_DAY +
      minuteOfDay,
  };
}

/**
 * Convert dayIndex back to YYYY-MM-DD.
 */
const dayIndexToISO = (
  dayIndex: number
) =>
  new Date(
    dayIndex *
    MIN_PER_DAY *
    MS_PER_MIN
  )
    .toISOString()
    .slice(0, 10);

/**
 * Determine the shift-start date for night shift.
 *
 * Example:
 *
 * 01 Oct 11:30 PM
 * -> shift date = 01 Oct
 *
 * 02 Oct 06:00 AM
 * -> shift date = 01 Oct
 *
 * 02 Oct 06:30 AM
 * -> shift date = 02 Oct
 */
const nightShiftDay = (
  w: WallClock,
  rollover: number
) =>
  w.minuteOfDay < rollover
    ? w.dayIndex - 1
    : w.dayIndex;

/**
 * Format minutes into 12-hour clock.
 */
function clock(mins: number): string {
  const h24 =
    Math.floor(mins / 60) % 24;

  const m = mins % 60;

  return `${h24 % 12 || 12}:${String(
    m
  ).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"
    }`;
}

/**
 * Example:
 * 309 -> 5 hrs 9 min
 * 45 -> 45 min
 */
export function formatLateTime(
  minutes?: number
): string {
  if (
    !Number.isFinite(minutes) ||
    (minutes as number) <= 0
  ) {
    return "0 min";
  }

  const total = Math.floor(
    minutes as number
  );

  const hrs = Math.floor(
    total / 60
  );

  const mins = total % 60;

  const hrLabel =
    `${hrs} ${hrs === 1 ? "hr" : "hrs"
    }`;

  if (hrs > 0 && mins > 0) {
    return `${hrLabel} ${mins} min`;
  }

  if (hrs > 0) {
    return hrLabel;
  }

  return `${mins} min`;
}

/* =========================================================
   LOGIN RESULT
   ========================================================= */

function loginResult(
  shiftDay: number,
  lateBy: number,
  lateAfter: number
): ValidationResult {
  const shiftDate =
    dayIndexToISO(shiftDay);

  if (lateBy > 0) {
    return {
      allowed: true,
      code: "LATE",
      isLate: true,
      lateByMinutes: lateBy,
      shiftDate,

      message:
        `Logged in after ${clock(
          lateAfter
        )}. Late by ${formatLateTime(
          lateBy
        )}.`,
    };
  }

  return {
    allowed: true,
    code: "OK",
    isLate: false,
    lateByMinutes: 0,
    shiftDate,
  };
}

/* =========================================================
   LOGIN VALIDATION
   ========================================================= */

/**
 * DAY:
 *   Login opens 11:00 AM
 *   On time until 11:30 AM
 *   Login closes 7:00 PM
 *
 * NIGHT:
 *   Login opens 9:30 PM
 *   On time until 10:10 PM
 *   Night shift belongs to that calendar date
 *   until 6:30 AM next morning.
 *
 * IMPORTANT:
 * This function does NOT allow a fresh login
 * during the overnight period after 10:10 PM.
 *
 * The overnight period is the continuation of
 * an already-started night shift.
 */
export function validateLoginShift(
  loggingTime: Date,
  workingShift: WorkingShift,
  rules: ShiftRules = DEFAULT_RULES
): ValidationResult {
  const w = toWallClock(
    loggingTime,
    rules.timeZone
  );

  if (!w) {
    return deny(
      "INVALID_TIME",
      "Invalid login time."
    );
  }

  /* =====================================================
     DAY SHIFT
     ===================================================== */

  if (workingShift === "day") {
    const r = rules.day;

    if (
      w.minuteOfDay <
      r.loginOpen
    ) {
      return deny(
        "LOGIN_TOO_EARLY",
        `Day shift login starts at ${clock(
          r.loginOpen
        )}. Please log in between ${clock(
          r.loginOpen
        )} and ${clock(
          r.lateAfter
        )}.`
      );
    }

    if (
      w.minuteOfDay >
      r.loginClose
    ) {
      return deny(
        "LOGIN_AFTER_SHIFT_HOURS",
        `Day shift login is closed after ${clock(
          r.loginClose
        )}. Please contact your manager.`
      );
    }

    return loginResult(
      w.dayIndex,
      Math.max(
        0,
        w.minuteOfDay -
        r.lateAfter
      ),
      r.lateAfter
    );
  }

  /* =====================================================
     NIGHT SHIFT
     ===================================================== */

  const r = rules.night;

  /*
   * Fresh night login is only allowed
   * from 9:30 PM onward.
   *
   * After 10:10 PM it is marked late.
   *
   * We DO NOT accept a fresh login at
   * 2 AM / 4 AM / 6 AM.
   */

  if (
    w.minuteOfDay <
    r.loginOpen
  ) {
    return deny(
      "LOGIN_OUTSIDE_NIGHT_WINDOW",
      `Night shift login starts at ${clock(
        r.loginOpen
      )}. Please log in from ${clock(
        r.loginOpen
      )}.`
    );
  }

  /*
   * Prevent a new login after the night
   * shift has already crossed into the
   * following morning.
   */
  if (
    w.minuteOfDay <
    r.dayRollover
  ) {
    return deny(
      "LOGIN_OUTSIDE_NIGHT_WINDOW",
      `Night shift login is available from ${clock(
        r.loginOpen
      )}. The previous night shift is already in progress.`
    );
  }

  /*
   * At/after 6:30 AM, night login is closed.
   */
  if (
    w.minuteOfDay >=
    r.dayRollover
  ) {
    return deny(
      "LOGIN_AFTER_SHIFT_HOURS",
      `Night shift login is closed after ${clock(
        r.dayRollover
      )}. Please contact your manager.`
    );
  }

  return loginResult(
    w.dayIndex,
    Math.max(
      0,
      w.minuteOfDay -
      r.lateAfter
    ),
    r.lateAfter
  );
}

/* =========================================================
   LOGOUT VALIDATION
   ========================================================= */

/**
 * DAY:
 *   Logout from 7:00 PM.
 *
 * NIGHT:
 *   Login:
 *     01 Oct 11:30 PM
 *
 *   Logout:
 *     02 Oct 06:30 AM
 *
 *   Both belong to the same shift:
 *     shiftDate = 01 Oct
 */
export function validateLogoutShift(
  logoutTime: Date,
  workingShift: WorkingShift,
  loginTime?: Date,
  rules: ShiftRules = DEFAULT_RULES
): ValidationResult {
  const out = toWallClock(
    logoutTime,
    rules.timeZone
  );

  if (!out) {
    return deny(
      "INVALID_TIME",
      "Invalid logout time."
    );
  }

  const logoutOpen =
    workingShift === "day"
      ? rules.day.logoutOpen
      : rules.night.logoutOpen;

  /* =====================================================
     If loginTime exists, use it.
     ===================================================== */

  if (loginTime) {
    const inn = toWallClock(
      loginTime,
      rules.timeZone
    );

    if (!inn) {
      return deny(
        "INVALID_TIME",
        "Invalid login time."
      );
    }

    /*
     * Actual instant comparison.
     */
    if (
      out.total < inn.total
    ) {
      return deny(
        "LOGOUT_BEFORE_LOGIN",
        "Logout time cannot be earlier than login time."
      );
    }

    /*
     * Determine the shift start date.
     */
    const shiftDay =
      workingShift === "day"
        ? inn.dayIndex
        : nightShiftDay(
          inn,
          rules.night.dayRollover
        );

    /*
     * DAY:
     * 11:00 AM -> 7:00 PM
     */
    if (
      workingShift === "day"
    ) {
      const earliestLogout =
        shiftDay *
        MIN_PER_DAY +
        logoutOpen;

      if (
        out.total <
        earliestLogout
      ) {
        return deny(
          "LOGOUT_TOO_EARLY",
          `Day shift logout is allowed only after ${clock(
            logoutOpen
          )}.`
        );
      }

      return {
        allowed: true,
        code: "OK",
      };
    }

    /*
     * NIGHT:
     *
     * Login:
     * 01 Oct 11:30 PM
     *
     * shiftDay = 01 Oct
     *
     * Logout must be:
     * 02 Oct 06:30 AM or later
     */
    const logoutDay =
      shiftDay + 1;

    const earliestLogout =
      logoutDay *
      MIN_PER_DAY +
      logoutOpen;

    if (
      out.total <
      earliestLogout
    ) {
      return deny(
        "LOGOUT_TOO_EARLY",
        `Night shift logout is allowed only after ${clock(
          logoutOpen
        )} on the next day.`
      );
    }

    return {
      allowed: true,
      code: "OK",
    };
  }

  /* =====================================================
     Fallback when loginTime is unavailable.
     ===================================================== */

  if (
    workingShift === "night"
  ) {
    /*
     * At 06:30 AM or later logout is allowed.
     */
    if (
      out.minuteOfDay <
      rules.night.logoutOpen
    ) {
      return deny(
        "LOGOUT_TOO_EARLY",
        `Night shift logout is allowed only after ${clock(
          rules.night.logoutOpen
        )}.`
      );
    }

    return {
      allowed: true,
      code: "OK",
    };
  }

  /* DAY FALLBACK */

  if (
    out.minuteOfDay <
    rules.day.logoutOpen
  ) {
    return deny(
      "LOGOUT_TOO_EARLY",
      `Day shift logout is allowed only after ${clock(
        rules.day.logoutOpen
      )}.`
    );
  }

  return {
    allowed: true,
    code: "OK",
  };
}

/* =========================================================
   LUNCH VALIDATION
   ========================================================= */

export function validateLunchEnd(
  lunchStart: Date,
  lunchEnd: Date,
  rules: ShiftRules = DEFAULT_RULES
): ValidationResult {
  const startMs =
    new Date(
      lunchStart
    ).getTime();

  const endMs =
    new Date(
      lunchEnd
    ).getTime();

  if (
    Number.isNaN(startMs) ||
    Number.isNaN(endMs)
  ) {
    return deny(
      "INVALID_TIME",
      "Invalid lunch time."
    );
  }

  const duration =
    Math.floor(
      endMs / MS_PER_MIN
    ) -
    Math.floor(
      startMs / MS_PER_MIN
    );

  if (duration < 0) {
    return deny(
      "LUNCH_INVALID_ORDER",
      "Lunch end time cannot be before lunch start time."
    );
  }

  const {
    minMinutes,
    maxMinutes,
  } = rules.lunch;

  if (
    duration <
    minMinutes
  ) {
    return {
      ...deny(
        "LUNCH_TOO_SHORT",
        `Lunch must be at least ${minMinutes} minutes (max ${maxMinutes}). You have taken ${duration} minutes.`
      ),

      lunchDurationMinutes:
        duration,
    };
  }

  const excess = Math.max(
    0,
    duration - maxMinutes
  );

  return {
    allowed: true,

    code:
      excess > 0
        ? "LUNCH_EXCEEDED"
        : "OK",

    lunchDurationMinutes:
      duration,

    excessLunchMinutes:
      excess,

    message:
      excess > 0
        ? `Lunch duration was ${duration} minutes (exceeded allowed ${maxMinutes} minutes by ${excess} min).`
        : undefined,
  };
}