// import mongoose, {
//   Schema,
//   Document,
//   Model,
// } from "mongoose";

// export type OfficeOffType =
//   | "festival"
//   | "holiday"
//   | "special";

// export interface IOfficeOff extends Document {
//   date: Date;
//   title: string;
//   type: OfficeOffType;
//   description?: string | null;

//   // Same groupId for multiple days of one holiday
//   groupId?: string | null;

//   isActive: boolean;

//   createdBy?: mongoose.Types.ObjectId | null;
//   updatedBy?: mongoose.Types.ObjectId | null;

//   createdAt: Date;
//   updatedAt: Date;
// }

// const OfficeOffSchema = new Schema<IOfficeOff>(
//   {
//     date: {
//       type: Date,
//       required: true,
//       index: true,
//     },

//     title: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     type: {
//       type: String,
//       enum: [
//         "festival",
//         "holiday",
//         "special",
//       ],
//       default: "holiday",
//       index: true,
//     },

//     description: {
//       type: String,
//       default: null,
//       trim: true,
//     },

//     groupId: {
//       type: String,
//       default: null,
//       index: true,
//     },

//     isActive: {
//       type: Boolean,
//       default: true,
//       index: true,
//     },

//     createdBy: {
//       type: Schema.Types.ObjectId,
//       ref: "Auth",
//       default: null,
//     },

//     updatedBy: {
//       type: Schema.Types.ObjectId,
//       ref: "Auth",
//       default: null,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // One manual office-off record per date
// OfficeOffSchema.index(
//   { date: 1 },
//   { unique: true }
// );

// OfficeOffSchema.index({
//   date: 1,
//   isActive: 1,
// });

// OfficeOffSchema.index({
//   groupId: 1,
// });

// const OfficeOff: Model<IOfficeOff> =
//   mongoose.models.OfficeOff ||
//   mongoose.model<IOfficeOff>(
//     "OfficeOff",
//     OfficeOffSchema
//   );

// export default OfficeOff;


import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export type OfficeOffType =
  | "festival"
  | "holiday"
  | "special";

export type OfficeOffScope =
  | "all"
  | "team"
  | "shift"
  | "employee";

export interface IOfficeOff extends Document {
  date: Date;

  title: string;

  type: OfficeOffType;

  description?: string | null;

  groupId?: string | null;

  scope: OfficeOffScope;

  teamIds: mongoose.Types.ObjectId[];

  shiftIds: mongoose.Types.ObjectId[];

  employeeIds: mongoose.Types.ObjectId[];

  isPaid: boolean;

  isActive: boolean;

  createdBy?: mongoose.Types.ObjectId | null;

  updatedBy?: mongoose.Types.ObjectId | null;

  createdAt: Date;

  updatedAt: Date;
}

const OfficeOffSchema =
  new Schema<IOfficeOff>(
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

      scope: {
        type: String,
        enum: [
          "all",
          "team",
          "shift",
          "employee",
        ],
        default: "all",
        index: true,
      },

      teamIds: [
        {
          type: Schema.Types.ObjectId,
          ref: "Team",
        },
      ],

      shiftIds: [
        {
          type: Schema.Types.ObjectId,
          ref: "Shift",
        },
      ],

      employeeIds: [
        {
          type: Schema.Types.ObjectId,
          ref: "Auth",
        },
      ],

      isPaid: {
        type: Boolean,
        default: true,
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

/*
 * IMPORTANT
 *
 * Do NOT use a simple unique { date: 1 } index anymore.
 *
 * Multiple holidays can exist for different teams/shifts/employees
 * on the same calendar date.
 */

OfficeOffSchema.index({
  date: 1,
  isActive: 1,
});

OfficeOffSchema.index({
  groupId: 1,
});

OfficeOffSchema.index({
  scope: 1,
  date: 1,
});

OfficeOffSchema.index({
  teamIds: 1,
  date: 1,
});

OfficeOffSchema.index({
  shiftIds: 1,
  date: 1,
});

OfficeOffSchema.index({
  employeeIds: 1,
  date: 1,
});

const OfficeOff: Model<IOfficeOff> =
  mongoose.models.OfficeOff ||
  mongoose.model<IOfficeOff>(
    "OfficeOff",
    OfficeOffSchema
  );

export default OfficeOff;