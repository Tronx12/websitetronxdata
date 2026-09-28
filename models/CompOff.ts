import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export type CompOffReason =
  | "worked_on_weekly_off"
  | "worked_on_holiday"
  | "other";

export type CompOffStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "used"
  | "expired";

export interface ICompOff
  extends Document {
  employeeId: mongoose.Types.ObjectId;

  workedDate: Date;

  reason: CompOffReason;

  earnedDays: number;

  status: CompOffStatus;

  requestedDate?: Date | null;

  approvedBy?: mongoose.Types.ObjectId | null;

  approvedAt?: Date | null;

  remarks?: string | null;

  createdAt: Date;

  updatedAt: Date;
}

const CompOffSchema =
  new Schema<ICompOff>(
    {
      employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Auth",
        required: true,
        index: true,
      },

      workedDate: {
        type: Date,
        required: true,
        index: true,
      },

      reason: {
        type: String,
        enum: [
          "worked_on_weekly_off",
          "worked_on_holiday",
          "other",
        ],
        required: true,
      },

      earnedDays: {
        type: Number,
        default: 1,
        min: 0,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "approved",
          "rejected",
          "used",
          "expired",
        ],
        default: "pending",
        index: true,
      },

      requestedDate: {
        type: Date,
        default: null,
      },

      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "Auth",
        default: null,
      },

      approvedAt: {
        type: Date,
        default: null,
      },

      remarks: {
        type: String,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

CompOffSchema.index({
  employeeId: 1,
  workedDate: 1,
});

const CompOff: Model<ICompOff> =
  mongoose.models.CompOff ||
  mongoose.model<ICompOff>(
    "CompOff",
    CompOffSchema
  );

export default CompOff;