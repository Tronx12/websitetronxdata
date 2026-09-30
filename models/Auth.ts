import mongoose from "mongoose";

const authSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    workingShift: {
      type: String,
      enum: ["day","night"],
      default: "day",
    },

    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["survey-tester", "team-lead", "senior-teamlead", "data-quality-analyst", "hr", "admin"],
      default: "survey-tester",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationOtp: {
      type: String,
      select: false,
      default: null,
    },

    emailVerificationOtpExpires: {
      type: Date,
      select: false,
      default: null,
    },
    resetPasswordOTP: {
    type: String,
    default: null,
    },

    resetPasswordOTPExpires: {
    type: Date,
    default: null,
    },

    isActive: {
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

const Auth =
  mongoose.models.Auth ||
  mongoose.model("Auth", authSchema);

export default Auth;
