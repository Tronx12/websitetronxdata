import mongoose from "mongoose";

import OfficeOff from "@/models/OfficeOff";
import WeeklyOffPolicy, { WeekDay } from "@/models/WeeklyOffPolicy";
import OfficeSettings from "@/models/OfficeSettings";
import Shift from "@/models/Shift";
import Team from "@/models/Team";
import Auth from "@/models/Auth";

const DAYS: WeekDay[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export type DayName = WeekDay;

interface ResolveOptions {
  userId: string;
  teamId?: string | null;
  shiftId?: string | null;
  date: Date;
}

export async function resolveAttendanceDay({
  userId,
  teamId,
  shiftId,
  date,
}: ResolveOptions) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Auto-resolve teamId if not provided
  let resolvedTeamObjectId: mongoose.Types.ObjectId | null = null;
  if (teamId && mongoose.Types.ObjectId.isValid(teamId)) {
    resolvedTeamObjectId = new mongoose.Types.ObjectId(teamId);
  } else {
    const userTeam = await Team.findOne({
      $or: [{ members: userObjectId }, { teamLead: userObjectId }],
      isActive: true,
    }).lean();
    if (userTeam) {
      resolvedTeamObjectId = userTeam._id;
    }
  }

  // Auto-resolve shiftId if not provided
  let resolvedShiftObjectId: mongoose.Types.ObjectId | null = null;
  if (shiftId && mongoose.Types.ObjectId.isValid(shiftId)) {
    resolvedShiftObjectId = new mongoose.Types.ObjectId(shiftId);
  } else {
    const userDoc = await Auth.findById(userObjectId).select("workingShift").lean();
    const shiftCode = (userDoc?.workingShift || "day").toUpperCase();
    const matchedShift = await Shift.findOne({
      code: shiftCode,
      isActive: true,
    }).lean();
    if (matchedShift) {
      resolvedShiftObjectId = matchedShift._id;
    }
  }

  /*
   * --------------------------------------------------
   * HOLIDAY DATE QUERY (start and end of day)
   * Handles both UTC midnight and local midnight offsets
   * --------------------------------------------------
   */
  const utcStart = new Date(date);
  utcStart.setUTCHours(0, 0, 0, 0);
  const utcEnd = new Date(utcStart);
  utcEnd.setUTCDate(utcEnd.getUTCDate() + 1);

  const localStart = new Date(date);
  localStart.setHours(0, 0, 0, 0);
  const localEnd = new Date(date);
  localEnd.setHours(23, 59, 59, 999);

  const dateFilter = {
    $or: [
      { date: { $gte: utcStart, $lt: utcEnd } },
      { date: { $gte: localStart, $lte: localEnd } },
    ],
  };

  /*
   * --------------------------------------------------
   * HOLIDAY CHECKS (Employee -> Team -> Shift -> Company All)
   * --------------------------------------------------
   */
  const employeeHoliday = await OfficeOff.findOne({
    ...dateFilter,
    isActive: true,
    scope: "employee",
    employeeIds: userObjectId,
  })
    .sort({ createdAt: -1 })
    .lean();

  const teamHoliday = resolvedTeamObjectId
    ? await OfficeOff.findOne({
        ...dateFilter,
        isActive: true,
        scope: "team",
        teamIds: resolvedTeamObjectId,
      })
        .sort({ createdAt: -1 })
        .lean()
    : null;

  const shiftHoliday = resolvedShiftObjectId
    ? await OfficeOff.findOne({
        ...dateFilter,
        isActive: true,
        scope: "shift",
        shiftIds: resolvedShiftObjectId,
      })
        .sort({ createdAt: -1 })
        .lean()
    : null;

  const companyHoliday = await OfficeOff.findOne({
    ...dateFilter,
    isActive: true,
    scope: "all",
  })
    .sort({ createdAt: -1 })
    .lean();

  const holiday =
    employeeHoliday ||
    teamHoliday ||
    shiftHoliday ||
    companyHoliday ||
    null;

  /*
   * --------------------------------------------------
   * WEEKLY OFF CHECKS
   * --------------------------------------------------
   */
  const dayName = DAYS[date.getDay()];

  const activeDateFilter = {
    effectiveFrom: { $lte: date },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: date } },
    ],
  };

  const employeePolicy = await WeeklyOffPolicy.findOne({
    scope: "employee",
    employeeId: userObjectId,
    isActive: true,
    ...activeDateFilter,
  })
    .sort({ effectiveFrom: -1 })
    .lean();

  const teamPolicy = resolvedTeamObjectId
    ? await WeeklyOffPolicy.findOne({
        scope: "team",
        teamId: resolvedTeamObjectId,
        isActive: true,
        ...activeDateFilter,
      })
        .sort({ effectiveFrom: -1 })
        .lean()
    : null;

  const companyPolicy = await WeeklyOffPolicy.findOne({
    scope: "company",
    isActive: true,
    ...activeDateFilter,
  })
    .sort({ effectiveFrom: -1 })
    .lean();

  const weeklyPolicy =
    employeePolicy ||
    teamPolicy ||
    companyPolicy ||
    null;

  let weeklyOff = false;

  if (weeklyPolicy) {
    if (!weeklyPolicy.rotational) {
      weeklyOff = (weeklyPolicy.days as WeekDay[]).includes(dayName);
    } else {
      const effective = new Date(weeklyPolicy.effectiveFrom);
      const diff = date.getTime() - effective.getTime();
      const weekIndex = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
      const rotationCount = Math.max(1, weeklyPolicy.rotationWeeks?.length || 1);
      const rotationIndex = weekIndex % rotationCount;
      const currentRotation = weeklyPolicy.rotationWeeks?.[rotationIndex] || [];
      weeklyOff = currentRotation.includes(dayName);
    }
  } else {
    // Fallback to legacy OfficeSettings
    const settings = await OfficeSettings.findOne().lean();
    if (settings) {
      const isSunday = date.getDay() === 0;
      const isSaturday = date.getDay() === 6;
      if (
        (isSunday && settings.sundayOff) ||
        (isSaturday && settings.saturdayOff) ||
        ((isSunday || isSaturday) && settings.weekendOff)
      ) {
        weeklyOff = true;
      }
    }
  }

  /*
   * --------------------------------------------------
   * FINAL RESULT
   * --------------------------------------------------
   */
  if (holiday) {
    return {
      status: "holiday" as const,
      holiday: true,
      weeklyOff,
      holidayId: holiday._id.toString(),
      holidayTitle: holiday.title,
      holidayType: holiday.type,
      isPaid: holiday.isPaid ?? true,
      policy: weeklyPolicy,
      resolvedTeamId: resolvedTeamObjectId ? resolvedTeamObjectId.toString() : null,
      resolvedShiftId: resolvedShiftObjectId ? resolvedShiftObjectId.toString() : null,
    };
  }

  if (weeklyOff) {
    return {
      status: "weekly-off" as const,
      holiday: false,
      weeklyOff: true,
      holidayId: null,
      holidayTitle: null,
      holidayType: null,
      isPaid: false,
      policy: weeklyPolicy,
      resolvedTeamId: resolvedTeamObjectId ? resolvedTeamObjectId.toString() : null,
      resolvedShiftId: resolvedShiftObjectId ? resolvedShiftObjectId.toString() : null,
    };
  }

  return {
    status: "working-day" as const,
    holiday: false,
    weeklyOff: false,
    holidayId: null,
    holidayTitle: null,
    holidayType: null,
    isPaid: false,
    policy: weeklyPolicy,
    resolvedTeamId: resolvedTeamObjectId ? resolvedTeamObjectId.toString() : null,
    resolvedShiftId: resolvedShiftObjectId ? resolvedShiftObjectId.toString() : null,
  };
} 