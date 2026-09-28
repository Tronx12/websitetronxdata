import OfficeOff from "@/models/OfficeOff";
import OfficeSettings from "@/models/OfficeSettings";
import { resolveAttendanceDay } from "@/lib/attendanceRules";

interface OfficeOffResult {
  isOfficeOff: boolean;
  title: string | null;
  type: string | null;
  description: string | null;
  reason: "saturday" | "sunday" | "holiday" | "weekly-off" | null;
  isPaid?: boolean;
}

export async function getOfficeOffForDate(
  date: Date,
  options?: {
    userId?: string;
    teamId?: string | null;
    shiftId?: string | null;
  }
): Promise<OfficeOffResult> {
  if (options?.userId) {
    const res = await resolveAttendanceDay({
      userId: options.userId,
      teamId: options.teamId,
      shiftId: options.shiftId,
      date,
    });

    if (res.holiday) {
      return {
        isOfficeOff: true,
        title: res.holidayTitle,
        type: res.holidayType,
        description: null,
        reason: "holiday",
        isPaid: res.isPaid,
      };
    }

    if (res.weeklyOff) {
      return {
        isOfficeOff: true,
        title: "Weekly Off",
        type: "weekly-off",
        description: "Scheduled weekly off",
        reason: "weekly-off",
        isPaid: false,
      };
    }

    return {
      isOfficeOff: false,
      title: null,
      type: null,
      description: null,
      reason: null,
    };
  }

  // Fallback global check without userId
  const utcStart = new Date(date);
  utcStart.setUTCHours(0, 0, 0, 0);
  const utcEnd = new Date(utcStart);
  utcEnd.setUTCDate(utcEnd.getUTCDate() + 1);

  const localStart = new Date(date);
  localStart.setHours(0, 0, 0, 0);
  const localEnd = new Date(date);
  localEnd.setHours(23, 59, 59, 999);

  // Check manual company-wide holiday
  const holiday = await OfficeOff.findOne({
    $or: [
      { date: { $gte: utcStart, $lt: utcEnd } },
      { date: { $gte: localStart, $lte: localEnd } },
    ],
    scope: "all",
    isActive: true,
  }).lean();

  if (holiday) {
    return {
      isOfficeOff: true,
      title: holiday.title,
      type: holiday.type,
      description: holiday.description || null,
      reason: "holiday",
      isPaid: holiday.isPaid ?? true,
    };
  }

  // Check OfficeSettings
  const settings = await OfficeSettings.findOne().lean();
  const day = date.getDay();

  if (day === 0 && (settings?.sundayOff || settings?.weekendOff)) {
    return {
      isOfficeOff: true,
      title: "Sunday",
      type: "weekend",
      description: "Weekly office off",
      reason: "sunday",
      isPaid: false,
    };
  }

  if (day === 6 && (settings?.saturdayOff || settings?.weekendOff)) {
    return {
      isOfficeOff: true,
      title: "Saturday",
      type: "weekend",
      description: "Weekly office off",
      reason: "saturday",
      isPaid: false,
    };
  }

  return {
    isOfficeOff: false,
    title: null,
    type: null,
    description: null,
    reason: null,
  };
}