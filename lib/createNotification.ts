import Notification from "@/models/Notification";

interface CreateNotificationParams {
  recipientId: string;
  type:
    | "oe_status_changed"
    | "oe_approved"
    | "oe_rejected"
    | "survey_status_changed"
    | "survey_approved"
    | "survey_rejected";

  title: string;
  message: string;

  entityId: string;
  entityType: "oe" | "survey";

  oldStatus?: string;
  newStatus?: string;
}

export async function createNotification(
  data: CreateNotificationParams
) {
  try {
    return await Notification.create({
      recipientId: data.recipientId,
      type: data.type,
      title: data.title,
      message: data.message,
      entityId: data.entityId,
      entityType: data.entityType,
      oldStatus: data.oldStatus || "",
      newStatus: data.newStatus || "",
      read: false,
    });
  } catch (error) {
    console.error("Notification creation failed:", error);

    // Notification failure should not break the main operation.
    return null;
  }
}