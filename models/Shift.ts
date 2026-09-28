import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IShift extends Document {
  name: string;

  code: string;

  startTime: string;

  endTime: string;

  crossesMidnight: boolean;

  graceMinutes: number;

  isActive: boolean;

  createdBy?: mongoose.Types.ObjectId | null;

  updatedBy?: mongoose.Types.ObjectId | null;

  createdAt: Date;

  updatedAt: Date;
}

const ShiftSchema =
  new Schema<IShift>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
      },

      startTime: {
        type: String,
        required: true,
      },

      endTime: {
        type: String,
        required: true,
      },

      crossesMidnight: {
        type: Boolean,
        default: false,
      },

      graceMinutes: {
        type: Number,
        default: 0,
        min: 0,
      },

      isActive: {
        type: Boolean,
        default: true,
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

ShiftSchema.index(
  { code: 1 },
  { unique: true }
);

const Shift: Model<IShift> =
  mongoose.models.Shift ||
  mongoose.model<IShift>(
    "Shift",
    ShiftSchema
  );

export default Shift;