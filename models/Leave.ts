import mongoose, {
  Schema,
  Model,
} from "mongoose";

/**
 * ============================================================
 * APPROVAL HISTORY
 * ============================================================
 *
 * Stores who approved/rejected the leave.
 *
 * `level` is only for audit/history.
 * It does NOT control the approval sequence.
 */
const ApprovalHistorySchema = new Schema(
  {
    level: {
      type: String,
      enum: [
        "TEAM_LEAD",
        "SENIOR_TEAMLEAD",
        "HR",
        "ADMIN",
      ],
      required: true,
    },

    approverId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    approverName: {
      type: String,
      default: "",
    },

    approverEmail: {
      type: String,
      default: "",
    },

    action: {
      type: String,
      enum: [
        "APPROVED",
        "REJECTED",
      ],
      required: true,
    },

    comment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    actionAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

/**
 * ============================================================
 * LEAVE SCHEMA
 * ============================================================
 */
const LeaveSchema = new Schema(
  {
    /**
     * Employee who applied for leave
     */
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

    /**
     * Role of employee who applied
     *
     * Examples:
     * survey-tester
     * team-lead
     * data-quality-analyst
     * senior-teamlead
     * hr
     * admin
     */
    employeeRole: {
      type: String,
      required: true,
      index: true,
    },

    /**
     * Team of employee
     *
     * Used mainly for Team Lead approval restriction.
     */
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      default: null,
      index: true,
    },

    /**
     * Leave type
     */
    leaveType: {
      type: String,
      enum: [
        "PAID",
        "UNPAID",
      ],
      required: true,
    },

    /**
     * Leave start date
     */
    startDate: {
      type: Date,
      required: true,
      index: true,
    },

    /**
     * Leave end date
     */
    endDate: {
      type: Date,
      required: true,
      index: true,
    },

    /**
     * Total number of leave days
     */
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },

    /**
     * Employee reason
     */
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    /**
     * ========================================================
     * LEAVE STATUS
     * ========================================================
     *
     * PENDING_APPROVAL
     *   Any authorized approver can approve.
     *
     * APPROVED
     *   One authorized approver already approved.
     *
     * REJECTED
     *   Leave rejected.
     *
     * CANCELLED
     *   Employee cancelled the leave.
     */
    status: {
      type: String,
      enum: [
        "PENDING_APPROVAL",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
      ],
      required: true,
      index: true,
    },

    /**
     * ========================================================
     * APPROVAL HISTORY
     * ========================================================
     *
     * Example:
     *
     * [
     *   {
     *     level: "HR",
     *     approverId: "...",
     *     approverName: "John",
     *     action: "APPROVED",
     *     actionAt: "..."
     *   }
     * ]
     *
     * Only ONE approval is required.
     */
    approvalHistory: {
      type: [ApprovalHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * ============================================================
 * INDEXES
 * ============================================================
 */

/**
 * Find employee leaves quickly
 */
LeaveSchema.index({
  employeeId: 1,
  startDate: 1,
  endDate: 1,
});

/**
 * Find pending leaves by employee role
 */
LeaveSchema.index({
  status: 1,
  employeeRole: 1,
});

/**
 * Useful for team-lead pending leave queries
 */
LeaveSchema.index({
  status: 1,
  teamId: 1,
});

/**
 * ============================================================
 * MODEL
 * ============================================================
 */
const Leave: Model<any> =
  mongoose.models.Leave ||
  mongoose.model("Leave", LeaveSchema);

export default Leave;