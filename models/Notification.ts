// models/Notification.ts
import mongoose, { Schema, models, model } from "mongoose";

const NotificationSchema = new Schema(
  {
    recipientId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["OE_SUBMITTED", "OE_REVIEWED"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: "" },
    oeId: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

export default models.Notification ||
  model("Notification", NotificationSchema);