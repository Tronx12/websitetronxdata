import mongoose from "mongoose";

const surveyDataSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["B2B", "B2H", "B2C"],
      required: true,
      index: true,
    },

    accountType: {
      type: String,
      trim: true,
    },

    projectNo: {
      type: String,
      trim: true,
      index: true,
    },

    panelCode: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    pid: {
      type: String,
      trim: true,
      index: true,
    },

    supplierId: {
      type: String,
      trim: true,
    },

    country: {
      type: String,
      trim: true,
    },

    ip: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      trim: true,
    },

    // IMPORTANT:
    // Keep this as Mixed/plain object.
    // Do NOT use Map here.
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    rawPaste: {
      type: String,
      default: "",
    },

    batchId: {
      type: String,
      default: null,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

surveyDataSchema.index({
  category: 1,
  createdAt: -1,
});

surveyDataSchema.index({
  projectNo: 1,
  pid: 1,
});

// Prevent stale model schema during Next.js development.
const SurveyData =
  mongoose.models.SurveyData ||
  mongoose.model("SurveyData", surveyDataSchema);

export default SurveyData;