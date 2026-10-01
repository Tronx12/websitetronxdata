// lib/attendanceTimezone.ts

export const ATTENDANCE_TIMEZONE = "Asia/Kolkata";

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter() {
  let formatter = formatterCache.get(ATTENDANCE_TIMEZONE);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: ATTENDANCE_TIMEZONE,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    formatterCache.set(ATTENDANCE_TIMEZONE, formatter);
  }

  return formatter;
}

/**
 * Get date/time parts in Asia/Kolkata.
 */
export function getAttendanceParts(date: Date = new Date()) {
  const parts = getFormatter().formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/**
 * Get YYYY-MM-DD according to Asia/Kolkata.
 */
export function getAttendanceDateString(
  date: Date = new Date()
): string {
  const { year, month, day } = getAttendanceParts(date);

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

/**
 * Convert YYYY-MM-DD attendance date into
 * UTC midnight for MongoDB date-only storage.
 *
 * IMPORTANT:
 * This does NOT mean attendance uses UTC.
 * UTC midnight is only the database representation
 * of the IST calendar date.
 */
export function attendanceDateToUTC(dateString: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (!match) {
    throw new Error(`Invalid attendance date: ${dateString}`);
  }

  return new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    )
  );
}

/**
 * Get today's attendance date in Asia/Kolkata.
 */
export function getCurrentAttendanceDate(): Date {
  return attendanceDateToUTC(
    getAttendanceDateString(new Date())
  );
}