// lib/notify.ts
import Notification from "@/models/Notification";
import Auth from "@/models/Auth"; // adjust to your user model

type Payload = {
  type: "OE_SUBMITTED" | "OE_REVIEWED";
  title: string;
  message: string;
  link?: string;
  oeId?: string;
};

// Notify everyone with one of these roles (e.g. DQA + team lead)
export async function notifyRoles(
  roles: string[],
  payload: Payload,
  excludeUserId?: string
) {
  const users = await Auth.find({ role: { $in: roles } })
    .select("_id")
    .lean();

  const docs = users
    .filter((u: any) => String(u._id) !== String(excludeUserId))
    .map((u: any) => ({ ...payload, recipientId: String(u._id) }));

  if (docs.length) await Notification.insertMany(docs);
}

// Notify one specific user (e.g. the survey tester who submitted)
export async function notifyUser(userId: string, payload: Payload) {
  if (!userId) return;
  await Notification.create({ ...payload, recipientId: String(userId) });
}