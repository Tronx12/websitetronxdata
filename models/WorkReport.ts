import mongoose from "mongoose";

const workReportSchema = new mongoose.Schema(
  {
    range: { type: String, enum: ["weekly", "monthly", "custom"], required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    fileName: { type: String, required: true },
    // xlsx file contents, base64-encoded. Fine for occasional weekly/monthly reports;
    // move to blob storage (S3, Vercel Blob, etc.) if these grow large or frequent.
    fileBase64: { type: String, required: true },
    recordCount: { type: Number, default: 0 },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const WorkReport =
  mongoose.models.WorkReport || mongoose.model("WorkReport", workReportSchema);

export default WorkReport;
