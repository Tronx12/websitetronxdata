import mongoose, { Schema, Model } from "mongoose";

const ApprovalHistorySchema = new Schema(
  {
    level: {
      type: String,
      enum: ["TEAM_LEAD", "SENIOR_TEAMLEAD", "HR", "ADMIN"],
      required: true,
    },
    approverId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    approverName: String,
    approverEmail: String,
    action: {
      type: String,
      enum: ["APPROVED", "REJECTED"],
      required: true,
    },
    comment: String,
    actionAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const LeaveSchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    employeeEmail: {
      type: String,
      required: true,
    },
    employeeRole: {
      type: String,
      required: true,
      index: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      default: null,
      index: true,
    },
    leaveType: {
      type: String,
      enum: ["PAID", "UNPAID"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: [
        "PENDING_TEAM_LEAD",
        "PENDING_SENIOR_TEAMLEAD",
        "PENDING_HR",
        "PENDING_ADMIN",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
      ],
      required: true,
      index: true,
    },
    currentApprovalLevel: {
      type: String,
      enum: ["TEAM_LEAD", "SENIOR_TEAMLEAD", "HR", "ADMIN", null],
      default: null,
      index: true,
    },
    approvalHistory: {
      type: [ApprovalHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

LeaveSchema.index({ employeeId: 1, startDate: 1, endDate: 1 });
LeaveSchema.index({ status: 1, currentApprovalLevel: 1 });

const Leave: Model<any> =
  mongoose.models.Leave ||
  mongoose.model("Leave", LeaveSchema);

export default Leave;
