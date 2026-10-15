// lib/forceIST.ts
// Forces India Standard Time (IST, UTC+05:30) everywhere in the application.
// Completely decouples UI, date formatting, and Date calculations from browser / VPN timezone.

export const IST_TIME_ZONE = "Asia/Kolkata";
export const IST_OFFSET_MINUTES = 330;
export const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

let patched = false;

const pad2 = (n: number) => String(n).padStart(2, "0");

export function forceIST() {
  if (patched) return;
  if (typeof globalThis === "undefined") return;

  patched = true;

  const OriginalDate = globalThis.Date;
  const OriginalDTF = Intl.DateTimeFormat;

  // ─────────────────────────────────────────────────────────────
  // 1. Date.prototype local getters (Year, Month, Date, Day, Hour, Min, Sec, Ms)
  // IST has no daylight saving time, so IST fields always equal UTC fields of (t + 19,800,000ms).
  // ─────────────────────────────────────────────────────────────
  OriginalDate.prototype.getFullYear = function () {
    const t = this.getTime();
    return Number.isNaN(t) ? NaN : new OriginalDate(t + IST_OFFSET_MS).getUTCFullYear();
  };

  OriginalDate.prototype.getMonth = function () {
    const t = this.getTime();
    return Number.isNaN(t) ? NaN : new OriginalDate(t + IST_OFFSET_MS).getUTCMonth();
  };

  OriginalDate.prototype.getDate = function () {
    const t = this.getTime();
    return Number.isNaN(t) ? NaN : new OriginalDate(t + IST_OFFSET_MS).getUTCDate();
  };

  OriginalDate.prototype.getDay = function () {
    const t = this.getTime();
    return Number.isNaN(t) ? NaN : new OriginalDate(t + IST_OFFSET_MS).getUTCDay();
  };

  OriginalDate.prototype.getHours = function () {
    const t = this.getTime();
    return Number.isNaN(t) ? NaN : new OriginalDate(t + IST_OFFSET_MS).getUTCHours();
  };

  OriginalDate.prototype.getMinutes = function () {
    const t = this.getTime();
    return Number.isNaN(t) ? NaN : new OriginalDate(t + IST_OFFSET_MS).getUTCMinutes();
  };

  OriginalDate.prototype.getSeconds = function () {
    const t = this.getTime();
    return Number.isNaN(t) ? NaN : new OriginalDate(t + IST_OFFSET_MS).getUTCSeconds();
  };

  OriginalDate.prototype.getMilliseconds = function () {
    const t = this.getTime();
    return Number.isNaN(t) ? NaN : new OriginalDate(t + IST_OFFSET_MS).getUTCMilliseconds();
  };

  OriginalDate.prototype.getTimezoneOffset = function () {
    return Number.isNaN(this.getTime()) ? NaN : -IST_OFFSET_MINUTES;
  };

  // ─────────────────────────────────────────────────────────────
  // 2. Date.prototype local setters
  // ─────────────────────────────────────────────────────────────
  OriginalDate.prototype.setFullYear = function (
    year: number,
    month?: number,
    date?: number
  ) {
    const t = this.getTime();
    const utc = new OriginalDate(Number.isNaN(t) ? 0 : t + IST_OFFSET_MS);
    if (month === undefined) utc.setUTCFullYear(year);
    else if (date === undefined) utc.setUTCFullYear(year, month);
    else utc.setUTCFullYear(year, month, date);
    const newTime = utc.getTime() - IST_OFFSET_MS;
    this.setTime(newTime);
    return newTime;
  };

  OriginalDate.prototype.setMonth = function (month: number, date?: number) {
    const t = this.getTime();
    const utc = new OriginalDate(Number.isNaN(t) ? 0 : t + IST_OFFSET_MS);
    if (date === undefined) utc.setUTCMonth(month);
    else utc.setUTCMonth(month, date);
    const newTime = utc.getTime() - IST_OFFSET_MS;
    this.setTime(newTime);
    return newTime;
  };

  OriginalDate.prototype.setDate = function (date: number) {
    const t = this.getTime();
    const utc = new OriginalDate(Number.isNaN(t) ? 0 : t + IST_OFFSET_MS);
    utc.setUTCDate(date);
    const newTime = utc.getTime() - IST_OFFSET_MS;
    this.setTime(newTime);
    return newTime;
  };

  OriginalDate.prototype.setHours = function (
    hours: number,
    min?: number,
    sec?: number,
    ms?: number
  ) {
    const t = this.getTime();
    const utc = new OriginalDate(Number.isNaN(t) ? 0 : t + IST_OFFSET_MS);
    if (min === undefined) utc.setUTCHours(hours);
    else if (sec === undefined) utc.setUTCHours(hours, min);
    else if (ms === undefined) utc.setUTCHours(hours, min, sec);
    else utc.setUTCHours(hours, min, sec, ms);
    const newTime = utc.getTime() - IST_OFFSET_MS;
    this.setTime(newTime);
    return newTime;
  };

  OriginalDate.prototype.setMinutes = function (
    min: number,
    sec?: number,
    ms?: number
  ) {
    const t = this.getTime();
    const utc = new OriginalDate(Number.isNaN(t) ? 0 : t + IST_OFFSET_MS);
    if (sec === undefined) utc.setUTCMinutes(min);
    else if (ms === undefined) utc.setUTCMinutes(min, sec);
    else utc.setUTCMinutes(min, sec, ms);
    const newTime = utc.getTime() - IST_OFFSET_MS;
    this.setTime(newTime);
    return newTime;
  };

  OriginalDate.prototype.setSeconds = function (sec: number, ms?: number) {
    const t = this.getTime();
    const utc = new OriginalDate(Number.isNaN(t) ? 0 : t + IST_OFFSET_MS);
    if (ms === undefined) utc.setUTCSeconds(sec);
    else utc.setUTCSeconds(sec, ms);
    const newTime = utc.getTime() - IST_OFFSET_MS;
    this.setTime(newTime);
    return newTime;
  };

  OriginalDate.prototype.setMilliseconds = function (ms: number) {
    const t = this.getTime();
    const utc = new OriginalDate(Number.isNaN(t) ? 0 : t + IST_OFFSET_MS);
    utc.setUTCMilliseconds(ms);
    const newTime = utc.getTime() - IST_OFFSET_MS;
    this.setTime(newTime);
    return newTime;
  };

  // ─────────────────────────────────────────────────────────────
  // 3. String representation methods
  // ─────────────────────────────────────────────────────────────
  const origToLocaleString = OriginalDate.prototype.toLocaleString;
  OriginalDate.prototype.toLocaleString = function (
    this: Date,
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions
  ) {
    const opts: Intl.DateTimeFormatOptions = { ...(options || {}) };
    if (opts.timeZone !== "UTC") {
      opts.timeZone = IST_TIME_ZONE;
    }
    return origToLocaleString.call(this, locales || "en-IN", opts);
  } as any;

  const origToLocaleDateString = OriginalDate.prototype.toLocaleDateString;
  OriginalDate.prototype.toLocaleDateString = function (
    this: Date,
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions
  ) {
    const opts: Intl.DateTimeFormatOptions = { ...(options || {}) };
    if (opts.timeZone !== "UTC") {
      opts.timeZone = IST_TIME_ZONE;
    }
    return origToLocaleDateString.call(this, locales || "en-IN", opts);
  } as any;

  const origToLocaleTimeString = OriginalDate.prototype.toLocaleTimeString;
  OriginalDate.prototype.toLocaleTimeString = function (
    this: Date,
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions
  ) {
    const opts: Intl.DateTimeFormatOptions = { ...(options || {}) };
    if (opts.timeZone !== "UTC") {
      opts.timeZone = IST_TIME_ZONE;
    }
    return origToLocaleTimeString.call(this, locales || "en-IN", opts);
  } as any;

  OriginalDate.prototype.toTimeString = function () {
    if (Number.isNaN(this.getTime())) return "Invalid Date";
    return `${pad2(this.getHours())}:${pad2(this.getMinutes())}:${pad2(
      this.getSeconds()
    )} GMT+0530 (India Standard Time)`;
  };

  OriginalDate.prototype.toDateString = function () {
    if (Number.isNaN(this.getTime())) return "Invalid Date";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${days[this.getDay()]} ${months[this.getMonth()]} ${pad2(
      this.getDate()
    )} ${this.getFullYear()}`;
  };

  OriginalDate.prototype.toString = function () {
    if (Number.isNaN(this.getTime())) return "Invalid Date";
    return `${this.toDateString()} ${this.toTimeString()}`;
  };

  // ─────────────────────────────────────────────────────────────
  // 4. Intl.DateTimeFormat
  // ─────────────────────────────────────────────────────────────
  const PatchedDTF: any = function (
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions
  ) {
    const opts: Intl.DateTimeFormatOptions = { ...(options || {}) };
    if (opts.timeZone !== "UTC") {
      opts.timeZone = IST_TIME_ZONE;
    }
    return new OriginalDTF(locales || "en-IN", opts);
  };
  PatchedDTF.prototype = OriginalDTF.prototype;
  PatchedDTF.supportedLocalesOf = OriginalDTF.supportedLocalesOf.bind(OriginalDTF);
  (Intl as any).DateTimeFormat = PatchedDTF;

}

// Automatically enforce IST as soon as this module is evaluated
forceIST();