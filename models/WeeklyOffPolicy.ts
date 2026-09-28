import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export type WeeklyOffScope =
  | "company"
  | "team"
  | "employee";

export type WeekDay =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

export interface IWeeklyOffPolicy
  extends Document {
  name: string;

  scope: WeeklyOffScope;

  teamId?: mongoose.Types.ObjectId | null;

  employeeId?: mongoose.Types.ObjectId | null;

  days: WeekDay[];

  rotational: boolean;

  rotationWeeks?: WeekDay[][];

  effectiveFrom: Date;

  effectiveTo?: Date | null;

  isActive: boolean;

  createdBy?: mongoose.Types.ObjectId | null;

  updatedBy?: mongoose.Types.ObjectId | null;

  createdAt: Date;

  updatedAt: Date;
}

const WeeklyOffPolicySchema =
  new Schema<IWeeklyOffPolicy>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      scope: {
        type: String,
        enum: [
          "company",
          "team",
          "employee",
        ],
        required: true,
      },

      teamId: {
        type: Schema.Types.ObjectId,
        ref: "Team",
        default: null,
      },

      employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Auth",
        default: null,
      },

      days: [
        {
          type: String,
          enum: [
            "SUNDAY",
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
          ],
        },
      ],

      rotational: {
        type: Boolean,
        default: false,
      },

      rotationWeeks: {
        type: [
          [
            {
              type: String,
              enum: [
                "SUNDAY",
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
                "SATURDAY",
              ],
            },
          ],
        ],
        default: [],
      },

      effectiveFrom: {
        type: Date,
        required: true,
      },

      effectiveTo: {
        type: Date,
        default: null,
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

WeeklyOffPolicySchema.index({
  scope: 1,
  isActive: 1,
});

WeeklyOffPolicySchema.index({
  teamId: 1,
  effectiveFrom: 1,
});

WeeklyOffPolicySchema.index({
  employeeId: 1,
  effectiveFrom: 1,
});

const WeeklyOffPolicy: Model<IWeeklyOffPolicy> =
  mongoose.models.WeeklyOffPolicy ||
  mongoose.model<IWeeklyOffPolicy>(
    "WeeklyOffPolicy",
    WeeklyOffPolicySchema
  );

export default WeeklyOffPolicy;