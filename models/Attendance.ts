import mongoose, { Schema, Document, Model } from "mongoose";

interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;

  loggingTime?: Date | null;
  logoutTime?: Date | null;

  lunchStart?: Date | null;
  lunchEnd?: Date | null;

  isLate?: boolean;
  lateByMinutes?: number;
  isManual?: boolean;

  loginLocation?: {
    type: "Point";
    coordinates: [number, number];
  };

  loginLocationAddress?: string;

  updatedBy?: mongoose.Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    loggingTime: {
      type: Date,
      default: null,
    },

    logoutTime: {
      type: Date,
      default: null,
    },

    lunchStart: {
      type: Date,
      default: null,
    },

    lunchEnd: {
      type: Date,
      default: null,
    },

    isLate: {
      type: Boolean,
      default: false,
    },

    lateByMinutes: {
      type: Number,
      default: 0,
    },

    isManual: {
      type: Boolean,
      default: false,
    },

    loginLocation: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },

    loginLocationAddress: {
      type: String,
      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Geo index
AttendanceSchema.index({
  loginLocation: "2dsphere",
});

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export default Attendance;