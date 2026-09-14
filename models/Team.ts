import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITeam extends Document {
  name: string;
  description?: string;
  teamLead: Types.ObjectId;
  members: Types.ObjectId[];
  createdBy: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
      unique: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    teamLead: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: [true, "Team lead is required"],
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "Auth",
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Fixed: no more "next" callback
teamSchema.pre("save", function () {
  if (
    this.members?.some(
      (m) => m.toString() === this.teamLead?.toString()
    )
  ) {
    throw new Error("Team lead cannot also be a member of the same team");
  }
});

const Team = mongoose.models.Team || mongoose.model<ITeam>("Team", teamSchema);

export default Team;