import mongoose from "mongoose";

const missingAttendanceRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    // The date for which attendance is missing
    date: {
      type: Date,
      required: true,
    },

    // Requested times (user can fill what they remember)
    requestedLoggingTime: {
      type: Date,
      default: null,
    },
    requestedLogoutTime: {
      type: Date,
      default: null,
    },
    requestedLunchStart: {
      type: Date,
      default: null,
    },
    requestedLunchEnd: {
      type: Date,
      default: null,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    // Optional proof (screenshot, etc.)
    attachment: {
      type: String, // URL / path
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Who approved / rejected
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      default: null,
    },

    reviewComment: {
      type: String,
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    // After approval, link to the created Attendance document
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending requests for same user + date
missingAttendanceRequestSchema.index(
  { userId: 1, date: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

const MissingAttendanceRequest =
  mongoose.models.MissingAttendanceRequest ||
  mongoose.model("MissingAttendanceRequest", missingAttendanceRequestSchema);

export default MissingAttendanceRequest;