// lib/ist.ts
// India Standard Time = UTC+05:30, no daylight saving.
// Everything in the app uses this file, so nothing depends on the
// browser or server timezone.

import "@/lib/forceIST";

export const IST_TIME_ZONE = "Asia/Kolkata";
export const IST_OFFSET_MINUTES = 330;
export const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

// Night-shift rollover: before 06:30 AM IST, we are still on the previous business day.
const ROLLOVER_MS = (6 * 60 + 30) * 60 * 1000;

const pad2 = (n: number) => String(n).padStart(2, "0");

const keyFromUtcFields = (d: Date) =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

/** "YYYY-MM-DD" of the calendar date in India for any instant (defaults to current IST time). */
export function toISTDateKey(input: Date | string | number = new Date()): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return keyFromUtcFields(new Date(date.getTime() + IST_OFFSET_MS));
}

/** Get today's calendar date in India as "YYYY-MM-DD". */
export function getTodayISTDate(): string {
  return toISTDateKey(new Date());
}

/** Business date key (night shift aware): before 06:30 AM IST = previous day. */
export function getISTBusinessDateKey(date: Date = new Date()): string {
  return keyFromUtcFields(
    new Date(date.getTime() + IST_OFFSET_MS - ROLLOVER_MS)
  );
}

/** UTC range covering one full IST calendar day. */
export function istDayRangeUtc(
  key: string
): { startUtc: Date; endUtc: Date } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!m) return null;

  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const midnightUtc = new Date(Date.UTC(y, mo - 1, d));

  if (
    midnightUtc.getUTCFullYear() !== y ||
    midnightUtc.getUTCMonth() !== mo - 1 ||
    midnightUtc.getUTCDate() !== d
  ) {
    return null;
  }

  const startUtc = new Date(midnightUtc.getTime() - IST_OFFSET_MS); // 00:00 IST
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
}

/** Format a "YYYY-MM-DD" key without any timezone shifting. */
export function formatDateKey(
  key: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(options || {}),
    timeZone: "UTC",
  });
}

/** Format any date or timestamp in Indian Standard Time (e.g. "15 Oct 2026") */
export function formatISTDate(
  input: Date | string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    timeZone: IST_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

/** Format any time in Indian Standard Time (e.g. "11:30 AM") */
export function formatISTTime(
  input: Date | string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", {
    timeZone: IST_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

/** Format date and time together in Indian Standard Time (e.g. "15 Oct 2026, 11:30 AM") */
export function formatISTDateTime(
  input: Date | string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    timeZone: IST_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const LOCAL_DATETIME =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

/**
 * Turns user input into an IST calendar key "YYYY-MM-DD".
 *  - "2026-10-15"            -> kept as-is
 *  - "2026-10-15T09:30"      -> date part kept (no timezone given = IST)
 *  - "2026-10-14T20:00:00Z"  -> converted to IST date (2026-10-15)
 * Returns "" if invalid.
 */
export function normalizeToISTDateKey(input: string | Date): string {
  if (typeof input === "string") {
    const v = input.trim();
    if (DATE_ONLY.test(v)) return istDayRangeUtc(v) ? v : "";
    const m = LOCAL_DATETIME.exec(v);
    if (m) return istDayRangeUtc(m[1]) ? m[1] : "";
  }
  return toISTDateKey(input);
}

/**
 * Parses a time as IST and returns the exact instant (Date).
 *  - "09:30"                 -> 09:30 IST on dateKey
 *  - "2026-10-15T09:30"      -> 09:30 IST (no timezone = IST)
 *  - "...Z" or "...+05:30"   -> exact instant, untouched
 * Returns null for empty values, throws for invalid ones.
 */
export function parseISTDateTime(
  value: string | null | undefined,
  dateKey: string
): Date | null {
  if (!value || !String(value).trim()) return null;
  const v = String(value).trim();

  const build = (key: string, h: number, mi: number, s: number) => {
    const range = istDayRangeUtc(key);
    if (!range || h > 23 || mi > 59 || s > 59) {
      throw new Error(`Invalid time: ${value}`);
    }
    return new Date(range.startUtc.getTime() + ((h * 60 + mi) * 60 + s) * 1000);
  };

  let m = TIME_ONLY.exec(v);
  if (m) return build(dateKey, +m[1], +m[2], +(m[3] ?? 0));

  m = LOCAL_DATETIME.exec(v);
  if (m) return build(m[1], +m[2], +m[3], +(m[4] ?? 0));

  const d = new Date(v); // has Z or offset, so it is an exact instant
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid time: ${value}`);
  return d;
}