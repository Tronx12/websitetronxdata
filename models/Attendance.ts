import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
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

    // New: Late status
    isLate: {
      type: Boolean,
      default: false,
    },

    // Optional: how many minutes late (useful for reports)
    lateByMinutes: {
      type: Number,
      default: 0,
    },

    // Geo-location at login
    loginLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: undefined,
      },
    },

    // Optional: store address / raw location string if needed
    loginLocationAddress: {
      type: String,
      default: null,
    },

    // Flag to know if attendance was marked via regular flow or request
    isManual: {
      type: Boolean,
      default: false,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for geo queries (optional but recommended)
attendanceSchema.index({ loginLocation: "2dsphere" });

// Prevent OverwriteModelError during hot reload
const Attendance =
  mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);

export default Attendance;