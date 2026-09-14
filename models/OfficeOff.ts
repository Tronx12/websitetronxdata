import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export type OfficeOffType =
  | "festival"
  | "holiday"
  | "special";

export interface IOfficeOff extends Document {
  date: Date;
  title: string;
  type: OfficeOffType;
  description?: string | null;

  // Same groupId for multiple days of one holiday
  groupId?: string | null;

  isActive: boolean;

  createdBy?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const OfficeOffSchema = new Schema<IOfficeOff>(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "festival",
        "holiday",
        "special",
      ],
      default: "holiday",
      index: true,
    },

    description: {
      type: String,
      default: null,
      trim: true,
    },

    groupId: {
      type: String,
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One manual office-off record per date
OfficeOffSchema.index(
  { date: 1 },
  { unique: true }
);

OfficeOffSchema.index({
  date: 1,
  isActive: 1,
});

OfficeOffSchema.index({
  groupId: 1,
});

const OfficeOff: Model<IOfficeOff> =
  mongoose.models.OfficeOff ||
  mongoose.model<IOfficeOff>(
    "OfficeOff",
    OfficeOffSchema
  );

export default OfficeOff;