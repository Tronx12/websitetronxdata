import mongoose, { Document, Model, Schema } from "mongoose";

export interface IIpWhitelist extends Document {
  ipAddress: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IpWhitelistSchema = new Schema<IIpWhitelist>(
  {
    ipAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const IpWhitelist: Model<IIpWhitelist> =
  mongoose.models.IpWhitelist ||
  mongoose.model<IIpWhitelist>(
    "IpWhitelist",
    IpWhitelistSchema
  );

export default IpWhitelist;