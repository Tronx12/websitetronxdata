import mongoose from "mongoose";
import AuditLog, { AuditAction } from "@/models/AuditLog";

interface CreateAuditLogParams {
  userId?: string | mongoose.Types.ObjectId | null;
  action: AuditAction;
  module: string;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Matches only real 24-character hex ObjectId strings — avoids
// mongoose.Types.ObjectId.isValid()'s quirk of also accepting any
// arbitrary 12-character string as "valid" (it treats it as raw bytes).
const HEX24_REGEX = /^[0-9a-fA-F]{24}$/;

function toObjectId(
  value?: string | mongoose.Types.ObjectId | null
): mongoose.Types.ObjectId | null {
  if (!value) return null;

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (typeof value === "string" && HEX24_REGEX.test(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  return null;
}

export async function createAuditLog({
  userId,
  action,
  module,
  description,
  entityType,
  entityId,
  metadata = {},
  ipAddress,
  userAgent,
}: CreateAuditLogParams) {
  try {
    const normalizedUserId = toObjectId(userId);

    return await AuditLog.create({
      userId: normalizedUserId,
      action,
      module,
      description,
      entityType: entityType || null,
      entityId: entityId || null,
      metadata,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  } catch (error) {
    // Audit logging should never break the main operation.
    console.error("AUDIT LOG ERROR:", error);
    return null;
  }
}