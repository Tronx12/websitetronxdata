    import mongoose, { Schema, model, models } from "mongoose";

const NotificationSchema = new Schema(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "oe_status_changed",
        "oe_approved",
        "oe_rejected",
        "survey_status_changed",
        "survey_approved",
        "survey_rejected",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    entityType: {
      type: String,
      enum: ["oe", "survey"],
      required: true,
    },

    oldStatus: {
      type: String,
      default: "",
    },

    newStatus: {
      type: String,
      default: "",
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({
  recipientId: 1,
  read: 1,
  createdAt: -1,
});

NotificationSchema.index({
  recipientId: 1,
  createdAt: -1,
});

export default models.Notification ||
  model("Notification", NotificationSchema);