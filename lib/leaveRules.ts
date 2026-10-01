import mongoose from "mongoose";

import Attendance from "@/models/Attendance";
import Leave from "@/models/Leave";

/* =========================================================
   APPROVAL ROLES
========================================================= */

export type ApprovalRole =
  | "survey-tester"
  | "team-lead"
  | "senior-teamlead"
  | "data-quality-analyst"
  | "hr"
  | "admin";

/* =========================================================
   APPROVAL PERMISSIONS
========================================================= */

/**
 * Employee role -> roles allowed to approve
 *
 * IMPORTANT:
 * This is NOT sequential.
 * Any ONE authorized approver can approve.
 */
export const APPROVAL_PERMISSIONS: Record<
  ApprovalRole,
  ApprovalRole[]
> = {
  "survey-tester": [
    "team-lead",
    "senior-teamlead",
    "hr",
    "admin",
  ],

  "team-lead": [
    "senior-teamlead",
    "hr",
    "admin",
  ],

  "data-quality-analyst": [
    "hr",
    "admin",
  ],

  "senior-teamlead": [
    "hr",
    "admin",
  ],

  hr: [
    "admin",
  ],

  admin: [],
};

/* =========================================================
   NORMALIZE ROLE
========================================================= */

export function normalizeRole(
  role?: string | null
): string {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

/* =========================================================
   GET ALLOWED APPROVERS
========================================================= */

export function getAllowedApprovers(
  employeeRole?: string | null
): string[] {
  const role = normalizeRole(employeeRole);

  return (
    APPROVAL_PERMISSIONS[
      role as ApprovalRole
    ] || []
  );
}

/* =========================================================
   CHECK APPROVAL PERMISSION
========================================================= */

export function canApproveLeave(
  employeeRole: string,
  approverRole: string
): boolean {
  const allowedRoles =
    getAllowedApprovers(employeeRole);

  return allowedRoles.includes(
    normalizeRole(approverRole)
  );
}

/* =========================================================
   CALCULATE CALENDAR DAYS
========================================================= */

export function calculateCalendarDays(
  startDate: Date,
  endDate: Date
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const difference =
    end.getTime() - start.getTime();

  return (
    Math.floor(
      difference /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
}

/* =========================================================
   GET ABSENT DAYS
========================================================= */

export async function getAbsentDays(
  employeeId: mongoose.Types.ObjectId,
  year: number,
  month: number
): Promise<number> {
  const start = new Date(
    year,
    month - 1,
    1
  );

  const end = new Date(
    year,
    month,
    1
  );

  const records =
    await Attendance.find({
      employeeId,

      status: "absent",

      date: {
        $gte: start,
        $lt: end,
      },
    }).lean();

  return records.length;
}

/* =========================================================
   PAID LEAVE SUMMARY
========================================================= */

export async function getPaidLeaveSummary(
  employeeId:
    | string
    | mongoose.Types.ObjectId,
  year: number,
  month: number
) {
  const employeeObjectId =
    new mongoose.Types.ObjectId(
      employeeId.toString()
    );

  /*
   * Get absent days for this month.
   */
  const absentDays =
    await getAbsentDays(
      employeeObjectId,
      year,
      month
    );

  /*
   * Monthly paid leave entitlement.
   *
   * More than 3 absent days = no paid leave.
   */
  const monthlyEntitlement = 1;

  const eligible =
    absentDays <= 3;

  /*
   * Current month range.
   */
  const start = new Date(
    year,
    month - 1,
    1
  );

  const end = new Date(
    year,
    month,
    1
  );

  /*
   * Find already approved paid leaves.
   */
  const paidLeaves =
    await Leave.find({
      employeeId:
        employeeObjectId,

      leaveType: "PAID",

      status: "APPROVED",

      startDate: {
        $lt: end,
      },

      endDate: {
        $gte: start,
      },
    }).lean();

  /*
   * Calculate already-used paid leave days.
   */
  const used =
    paidLeaves.reduce(
      (
        total: number,
        leave: any
      ) =>
        total +
        Number(
          leave.totalDays || 0
        ),
      0
    );

  /*
   * Calculate remaining entitlement.
   */
  const remaining = eligible
    ? Math.max(
        monthlyEntitlement - used,
        0
      )
    : 0;

  return {
    year,
    month,

    absentDays,

    monthlyEntitlement,

    eligible,

    used,

    remaining,
  };
}