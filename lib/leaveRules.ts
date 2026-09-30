import mongoose from "mongoose";
import Attendance from "@/models/Attendance";
import Leave from "@/models/Leave";
import Auth from "@/models/Auth";

export const APPROVAL_FLOW: Record<string, string[]> = {
  "survey-tester": ["TEAM_LEAD", "SENIOR_TEAMLEAD", "HR", "ADMIN"],
  "team-lead": ["SENIOR_TEAMLEAD", "HR", "ADMIN"],
  "senior-teamlead": ["HR", "ADMIN"],
  "data-quality-analyst": ["HR", "ADMIN"],
  "hr": ["ADMIN"],
  admin: [],
};

export function normalizeRole(role: unknown) {
  return String(role || "").trim().toLowerCase().replace(/_/g, "-");
}

export function getApprovalFlow(role: unknown): string[] {
  return APPROVAL_FLOW[normalizeRole(role)] || ["HR", "ADMIN"];
}

export function pendingStatus(level: string) {
  return `PENDING_${level}` as const;
}

export function nextApproval(
  role: unknown,
  currentLevel: string | null
) {
  const flow = getApprovalFlow(role);
  if (!flow.length) return null;

  if (!currentLevel) return flow[0];

  const index = flow.indexOf(currentLevel);
  return index >= 0 && index + 1 < flow.length
    ? flow[index + 1]
    : null;
}

function dayStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayEnd(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function calculateCalendarDays(
  startDate: Date,
  endDate: Date
) {
  const start = dayStart(startDate);
  const end = dayStart(endDate);

  const diff =
    end.getTime() - start.getTime();

  return Math.floor(
    diff / (1000 * 60 * 60 * 24)
  ) + 1;
}

/**
 * Counts actual Attendance documents marked ABSENT in the month.
 * Approved leave records are not counted as absence.
 *
 * The exact Attendance status strings in the supplied attendance
 * route include "present", "worked-on-holiday", and
 * "worked-on-weekly-off". This function therefore only counts
 * explicit "absent" records.
 */
export async function getAbsentDays(
  employeeId: string,
  year: number,
  month: number
) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return Attendance.countDocuments({
    userId: new mongoose.Types.ObjectId(employeeId),
    date: { $gte: start, $lte: end },
    status: "absent",
  });
}

export async function getPaidLeaveSummary(
  employeeId: string,
  year: number,
  month: number
) {
  const absentDays = await getAbsentDays(
    employeeId,
    year,
    month
  );

  const entitlement = absentDays > 3 ? 0 : 1;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(
    year,
    month,
    0,
    23,
    59,
    59,
    999
  );

  const approvedPaidLeaves =
    await Leave.find({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      leaveType: "PAID",
      status: "APPROVED",
      startDate: { $lte: monthEnd },
      endDate: { $gte: monthStart },
    }).lean();

  let used = 0;

  for (const leave of approvedPaidLeaves) {
    const start =
      new Date(leave.startDate) < monthStart
        ? monthStart
        : new Date(leave.startDate);

    const end =
      new Date(leave.endDate) > monthEnd
        ? monthEnd
        : new Date(leave.endDate);

    used += calculateCalendarDays(start, end);
  }

  const remaining = Math.max(
    0,
    entitlement - used
  );

  return {
    year,
    month,
    absentDays,
    monthlyEntitlement: 1,
    eligible: absentDays <= 3,
    used,
    remaining,
  };
}

export async function getUserForLeave(
  userId: string
) {
  return Auth.findById(userId)
    .select("_id name email role teamId")
    .lean();
}
