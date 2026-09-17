export interface ValidationResult {
  allowed: boolean;
  message?: string;
  isLate?: boolean;
  lateByMinutes?: number;
  lunchDurationMinutes?: number;
  excessLunchMinutes?: number;
}

/**
 * Format minutes into human-readable hr/min string (e.g. "5 hr 9 min", "45 min", "1 hr", "2 hrs")
 */
export function formatLateTime(minutes?: number): string {
  if (!minutes || minutes <= 0) return "0 min";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) {
    return `${hrs} hr ${mins} min`;
  } else if (hrs > 0) {
    return `${hrs} hr${hrs > 1 ? "s" : ""}`;
  } else {
    return `${mins} min`;
  }
}

/**
 * Validate employee login time based on working shift.
 * - Day Shift: 11:00 AM (660 min) to 11:30 AM (690 min)
 * - Night Shift: 9:30 PM (1290 min) to 10:10 PM (1330 min)
 */
export function validateLoginShift(
  loggingTime: Date,
  workingShift: "day" | "night"
): ValidationResult {
  const login = new Date(loggingTime);
  const hours = login.getHours();
  const minutes = login.getMinutes();
  const currentTotalMins = hours * 60 + minutes;

  if (workingShift === "day") {
    // Day shift login window: 11:00 AM (660 min) to 11:30 AM (690 min)
    const startWindow = 11 * 60; // 11:00 AM
    const lateDeadline = 11 * 60 + 30; // 11:30 AM

    if (currentTotalMins < startWindow) {
      return {
        allowed: false,
        message: "Day shift login starts at 11:00 AM. Please log in between 11:00 AM and 11:30 AM.",
      };
    }

    if (currentTotalMins > lateDeadline) {
      const diffMins = currentTotalMins - lateDeadline;
      return {
        allowed: true,
        isLate: true,
        lateByMinutes: diffMins,
        message: `Logged in after 11:30 AM. Late by ${formatLateTime(diffMins)}.`,
      };
    }

    return {
      allowed: true,
      isLate: false,
      lateByMinutes: 0,
    };
  } else {
    // Night shift login window: 9:30 PM (21:30 = 1290 min) to 10:10 PM (22:10 = 1330 min)
    const startWindow = 21 * 60 + 30; // 9:30 PM (1290 min)
    const lateDeadline = 22 * 60 + 10; // 10:10 PM (1330 min)

    // Allowed night shift logins are between 9:30 PM (1290 min) and 6:00 AM (360 min next morning).
    // Outside 9:30 PM to 6:00 AM (i.e. between 6:00 AM and 9:30 PM) logins are rejected.
    if (currentTotalMins < startWindow && currentTotalMins >= 6 * 60) {
      return {
        allowed: false,
        message: "Night shift login starts at 9:30 PM. Please log in between 9:30 PM and 10:10 PM.",
      };
    }

    let lateMins = 0;
    if (currentTotalMins < 6 * 60) {
      // Logged in between 00:00 AM and 06:00 AM (e.g., 03:19 AM).
      // Relative minutes from day 1 midnight: 1440 + currentTotalMins
      lateMins = (1440 + currentTotalMins) - lateDeadline;
    } else if (currentTotalMins > lateDeadline) {
      // Logged in between 10:11 PM (1331 min) and 11:59 PM (1439 min)
      lateMins = currentTotalMins - lateDeadline;
    }

    if (lateMins > 0) {
      return {
        allowed: true,
        isLate: true,
        lateByMinutes: lateMins,
        message: `Logged in after 10:10 PM. Late by ${formatLateTime(lateMins)}.`,
      };
    }

    return {
      allowed: true,
      isLate: false,
      lateByMinutes: 0,
    };
  }
}

/**
 * Validate employee logout time based on working shift.
 * - Day Shift: Logout allowed between 7:00 PM and 7:30 PM (19:00 - 19:30)
 * - Night Shift: Logout allowed after 6:00 AM (06:00 AM onwards)
 */
export function validateLogoutShift(
  logoutTime: Date,
  workingShift: "day" | "night"
): ValidationResult {
  const logout = new Date(logoutTime);
  const hours = logout.getHours();
  const minutes = logout.getMinutes();
  const currentTotalMins = hours * 60 + minutes;

  if (workingShift === "day") {
    const minLogoutTime = 19 * 60; // 7:00 PM (1140 min)

    if (currentTotalMins < minLogoutTime) {
      return {
        allowed: false,
        message: "Day shift logout is allowed only between 7:00 PM and 7:30 PM.",
      };
    }

    return { allowed: true };
  } else {
    // Night shift logout is allowed after 6:00 AM
    const minLogoutTime = 6 * 60; // 6:00 AM (360 min)

    if (currentTotalMins < minLogoutTime && currentTotalMins >= 0) {
      return {
        allowed: false,
        message: "Night shift logout is allowed only after 6:00 AM.",
      };
    }

    return { allowed: true };
  }
}

/**
 * Validate lunch duration.
 * - Lunch duration must be 30 to 35 minutes.
 * - Minimum 30 min required.
 * - Over 35 min flagged with excess duration.
 */
export function validateLunchEnd(
  lunchStart: Date,
  lunchEnd: Date
): ValidationResult {
  const startMs = new Date(lunchStart).getTime();
  const endMs = new Date(lunchEnd).getTime();

  const diffMs = endMs - startMs;
  if (diffMs < 0) {
    return {
      allowed: false,
      message: "Invalid lunch end time.",
    };
  }

  const durationMinutes = Math.round(diffMs / (1000 * 60));

  if (durationMinutes < 30) {
    return {
      allowed: false,
      message: `Lunch duration must be at least 30 minutes (minimum 30 min, maximum 35 min). You have taken ${durationMinutes} minutes.`,
    };
  }

  const excessLunchMinutes = Math.max(0, durationMinutes - 35);
  let warningMessage: string | undefined;

  if (excessLunchMinutes > 0) {
    warningMessage = `Lunch duration was ${durationMinutes} minutes (exceeded allowed 35 minutes by ${excessLunchMinutes} min).`;
  }

  return {
    allowed: true,
    lunchDurationMinutes: durationMinutes,
    excessLunchMinutes,
    message: warningMessage,
  };
}
