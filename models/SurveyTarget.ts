import mongoose, {
  Schema,
  model,
  models,
} from "mongoose";

const SurveyTargetSchema =
  new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "Auth",
        required: true,
        index: true,
      },

      month: {
        type: String,
        required: true,
        trim: true,
        match: /^\d{4}-\d{2}$/,
        index: true,
      },

      target: {
        type: Number,
        required: true,
        min: 0,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "Auth",
        required: true,
      },

      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "Auth",
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

// One target for one user in one month
SurveyTargetSchema.index(
  {
    userId: 1,
    month: 1,
  },
  {
    unique: true,
  }
);

const SurveyTarget =
  models.SurveyTarget ||
  model(
    "SurveyTarget",
    SurveyTargetSchema
  );

export default SurveyTarget;