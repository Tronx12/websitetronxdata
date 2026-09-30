export type LeaveType = "PAID" | "UNPAID";

export type ApprovalLevel =
  | "TEAM_LEAD"
  | "SENIOR_TEAMLEAD"
  | "HR"
  | "ADMIN";

export type LeaveStatus =
  | "PENDING_TEAM_LEAD"
  | "PENDING_SENIOR_TEAMLEAD"
  | "PENDING_HR"
  | "PENDING_ADMIN"
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
