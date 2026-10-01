export type LeaveType = "PAID" | "UNPAID";

export type ApprovalLevel =
  | "TEAM_LEAD"
  | "SENIOR_TEAMLEAD"
  | "HR"
  | "ADMIN";

export type LeaveStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface ApprovalHistoryItem {
  level: ApprovalLevel;
  approverId: string;
  approverName?: string;
  approverEmail?: string;
  action: "APPROVED" | "REJECTED";
  comment?: string;
  actionAt: string;
}

export interface MonthLeaveSummary {
  year: number;
  month: number;
  monthName: string;
  monthlyEntitlement: number;
  absentDays: number;
  eligible: boolean;
  earned: number;
  carriedForward: number;
  totalAvailable: number;
  used: number;
  unpaidUsed: number;
  remaining: number;
}

export interface YearLeaveSummary {
  year: number;
  totalEarned: number;
  carriedForwardFromPrevYear: number;
  totalPaidUsed: number;
  totalUnpaidUsed: number;
  totalAbsentDays: number;
  remainingBalance: number;
  monthlyBreakdown: MonthLeaveSummary[];
}

export interface LifetimeLeaveSummary {
  totalEarned: number;
  totalPaidUsed: number;
  totalUnpaidUsed: number;
  totalAbsentDays: number;
  currentBalance: number;
  totalLeaveRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
}

export interface LeaveSummaryData {
  employeeId: string;
  monthly: MonthLeaveSummary;
  yearly: YearLeaveSummary;
  lifetime: LifetimeLeaveSummary;
  // Legacy / convenience fields:
  year: number;
  month: number;
  absentDays: number;
  monthlyEntitlement: number;
  eligible: boolean;
  earned: number;
  carriedForward: number;
  totalAvailable: number;
  used: number;
  remaining: number;
}
