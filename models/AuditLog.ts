import mongoose, { Schema, Document, Model } from "mongoose";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "UPLOAD"
  | "EXPORT"
  | "DOWNLOAD"
  | "VIEW"
  | "REPORT"
  | "ASSIGN"
  | "UNASSIGN"
  | "OTHER";

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId | null;

  action: AuditAction;

  module: string;

  description: string;

  entityType?: string | null;

  entityId?: string | null;

  metadata?: Record<string, any>;

  ipAddress?: string | null;

  userAgent?: string | null;

  createdAt: Date;

  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      default: null,
      index: true,
    },

    action: {
      type: String,
      enum: [
        "LOGIN",
        "LOGOUT",
        "CREATE",
        "UPDATE",
        "DELETE",
        "UPLOAD",
        "EXPORT",
        "DOWNLOAD",
        "VIEW",
        "REPORT",
        "ASSIGN",
        "UNASSIGN",
        "OTHER",
      ],
      required: true,
      index: true,
    },

    module: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    entityType: {
      type: String,
      default: null,
      trim: true,
    },

    entityId: {
      type: String,
      default: null,
      index: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({
  createdAt: -1,
});

auditLogSchema.index({
  module: 1,
  createdAt: -1,
});

auditLogSchema.index({
  userId: 1,
  createdAt: -1,
});

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>(
    "AuditLog",
    auditLogSchema
  );

export default AuditLog;