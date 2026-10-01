import mongoose, { Schema, Model, Document } from "mongoose";

export interface ILeaveBalance extends Document {
  employeeId: mongoose.Types.ObjectId;
  year: number;
  month: number; // 1-12
  monthlyEntitlement: number; // base: 1
  absentDays: number;
  isEligible: boolean; // absentDays <= 3
  earned: number; // 1 if eligible else 0
  carriedIn: number; // balance carried from previous month
  totalAvailable: number; // carriedIn + earned + manualAdjustment
  usedPaid: number; // paid leaves used in this month
  usedUnpaid: number; // unpaid leaves used in this month
  remaining: number; // totalAvailable - usedPaid
  manualAdjustment: number; // bonus or deduction by HR/Admin
  adjustmentReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },
    monthlyEntitlement: {
      type: Number,
      default: 1,
    },
    absentDays: {
      type: Number,
      default: 0,
    },
    isEligible: {
      type: Boolean,
      default: true,
    },
    earned: {
      type: Number,
      default: 1,
    },
    carriedIn: {
      type: Number,
      default: 0,
    },
    totalAvailable: {
      type: Number,
      default: 1,
    },
    usedPaid: {
      type: Number,
      default: 0,
    },
    usedUnpaid: {
      type: Number,
      default: 0,
    },
    remaining: {
      type: Number,
      default: 1,
    },
    manualAdjustment: {
      type: Number,
      default: 0,
    },
    adjustmentReason: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index so there is only 1 balance record per employee per month
LeaveBalanceSchema.index({ employeeId: 1, year: 1, month: 1 }, { unique: true });

const LeaveBalance: Model<ILeaveBalance> =
  mongoose.models.LeaveBalance ||
  mongoose.model<ILeaveBalance>("LeaveBalance", LeaveBalanceSchema);

export default LeaveBalance;
