import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IOfficeSettings extends Document {
  weekendOff: boolean;

  saturdayOff: boolean;
  sundayOff: boolean;

  updatedBy?: mongoose.Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const OfficeSettingsSchema =
  new Schema<IOfficeSettings>(
    {
      weekendOff: {
        type: Boolean,
        default: false,
      },

      saturdayOff: {
        type: Boolean,
        default: false,
      },

      sundayOff: {
        type: Boolean,
        default: false,
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

const OfficeSettings: Model<IOfficeSettings> =
  mongoose.models.OfficeSettings ||
  mongoose.model<IOfficeSettings>(
    "OfficeSettings",
    OfficeSettingsSchema
  );

export default OfficeSettings;