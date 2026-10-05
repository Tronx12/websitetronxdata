// // import mongoose, { Schema, Document, Model } from "mongoose";

// // interface IAttendance extends Document {
// //   userId: mongoose.Types.ObjectId;
// //   date: Date;

// //   loggingTime?: Date | null;
// //   logoutTime?: Date | null;

// //   lunchStart?: Date | null;
// //   lunchEnd?: Date | null;

// //   status?: "present" | "absent" | "half-day" | "office-off";
// //   lunchDurationMinutes?: number;
// //   excessLunchMinutes?: number;
// //   remarks?: string;

// //   isLate?: boolean;
// //   lateByMinutes?: number;
// //   isManual?: boolean;

// //   loginLocation?: {
// //     type: "Point";
// //     coordinates: [number, number];
// //   };

// //   loginLocationAddress?: string;

// //   updatedBy?: mongoose.Types.ObjectId | null;

// //   createdAt: Date;
// //   updatedAt: Date;
// // }

// // const AttendanceSchema = new Schema<IAttendance>(
// //   {
// //     userId: {
// //       type: Schema.Types.ObjectId,
// //       ref: "Auth",
// //       required: true,
// //     },

// //     date: {
// //       type: Date,
// //       required: true,
// //     },

// //     loggingTime: {
// //       type: Date,
// //       default: null,
// //     },

// //     logoutTime: {
// //       type: Date,
// //       default: null,
// //     },

// //     lunchStart: {
// //       type: Date,
// //       default: null,
// //     },

// //     lunchEnd: {
// //       type: Date,
// //       default: null,
// //     },

// //     status: {
// //       type: String,
// //       enum: ["present", "absent", "half-day", "office-off"],
// //       default: "present",
// //     },

// //     lunchDurationMinutes: {
// //       type: Number,
// //       default: 0,
// //     },

// //     excessLunchMinutes: {
// //       type: Number,
// //       default: 0,
// //     },

// //     remarks: {
// //       type: String,
// //       default: null,
// //     },

// //     isLate: {
// //       type: Boolean,
// //       default: false,
// //     },

// //     lateByMinutes: {
// //       type: Number,
// //       default: 0,
// //     },

// //     isManual: {
// //       type: Boolean,
// //       default: false,
// //     },

// //     loginLocation: {
// //       type: {
// //         type: String,
// //         enum: ["Point"],
// //       },
// //       coordinates: {
// //         type: [Number],
// //       },
// //     },

// //     loginLocationAddress: {
// //       type: String,
// //       default: null,
// //     },

// //     updatedBy: {
// //       type: Schema.Types.ObjectId,
// //       ref: "Auth",
// //       default: null,
// //     },
// //   },
// //   {
// //     timestamps: true,
// //   }
// // );

// // // Geo index
// // AttendanceSchema.index({
// //   loginLocation: "2dsphere",
// // });

// // const Attendance: Model<IAttendance> =
// //   mongoose.models.Attendance ||
// //   mongoose.model<IAttendance>("Attendance", AttendanceSchema);

// // export default Attendance;



// import mongoose, {
//   Schema,
//   Document,
//   Model,
// } from "mongoose";

// export type AttendanceStatus =
//   | "present"
//   | "absent"
//   | "half-day"
//   | "holiday"
//   | "weekly-off"
//   | "office-off"
//   | "leave"
//   | "worked-on-holiday"
//   | "worked-on-weekly-off"
//   | "comp-off";

// export interface IAttendance
//   extends Document {
//   userId: mongoose.Types.ObjectId;

//   date: Date;

//   /*
//    * For night shifts this represents
//    * the business/shift date.
//    */
//   shiftDate?: Date | null;

//   shiftId?: mongoose.Types.ObjectId | null;

//   scheduledStart?: Date | null;

//   scheduledEnd?: Date | null;

//   loggingTime?: Date | null;

//   logoutTime?: Date | null;

//   lunchStart?: Date | null;

//   lunchEnd?: Date | null;

//   status?: AttendanceStatus;

//   lunchDurationMinutes?: number;

//   excessLunchMinutes?: number;

//   remarks?: string | null;

//   isLate?: boolean;

//   lateByMinutes?: number;

//   isManual?: boolean;

//   weeklyOff?: boolean;

//   holiday?: boolean;

//   holidayId?: mongoose.Types.ObjectId | null;

//   loginLocation?: {
//     type: "Point";
//     coordinates: [number, number];
//   };

//   loginLocationAddress?: string | null;

//   updatedBy?: mongoose.Types.ObjectId | null;

//   createdAt: Date;

//   updatedAt: Date;
// }

// const AttendanceSchema =
//   new Schema<IAttendance>(
//     {
//       userId: {
//         type: Schema.Types.ObjectId,
//         ref: "Auth",
//         required: true,
//         index: true,
//       },

//       date: {
//         type: Date,
//         required: true,
//         index: true,
//       },

//       shiftDate: {
//         type: Date,
//         default: null,
//         index: true,
//       },

//       shiftId: {
//         type: Schema.Types.ObjectId,
//         ref: "Shift",
//         default: null,
//         index: true,
//       },

//       scheduledStart: {
//         type: Date,
//         default: null,
//       },

//       scheduledEnd: {
//         type: Date,
//         default: null,
//       },

//       loggingTime: {
//         type: Date,
//         default: null,
//       },

//       logoutTime: {
//         type: Date,
//         default: null,
//       },

//       lunchStart: {
//         type: Date,
//         default: null,
//       },

//       lunchEnd: {
//         type: Date,
//         default: null,
//       },

//       status: {
//         type: String,
//         enum: [
//           "present",
//           "absent",
//           "half-day",
//           "holiday",
//           "weekly-off",
//           "office-off",
//           "leave",
//           "worked-on-holiday",
//           "worked-on-weekly-off",
//           "comp-off",
//         ],
//         default: "present",
//         index: true,
//       },

//       lunchDurationMinutes: {
//         type: Number,
//         default: 0,
//       },

//       excessLunchMinutes: {
//         type: Number,
//         default: 0,
//       },

//       remarks: {
//         type: String,
//         default: null,
//       },

//       isLate: {
//         type: Boolean,
//         default: false,
//       },

//       lateByMinutes: {
//         type: Number,
//         default: 0,
//       },

//       isManual: {
//         type: Boolean,
//         default: false,
//       },

//       weeklyOff: {
//         type: Boolean,
//         default: false,
//       },

//       holiday: {
//         type: Boolean,
//         default: false,
//       },

//       holidayId: {
//         type: Schema.Types.ObjectId,
//         ref: "OfficeOff",
//         default: null,
//       },

//       loginLocation: {
//         type: {
//           type: String,
//           enum: ["Point"],
//         },

//         coordinates: {
//           type: [Number],
//         },
//       },

//       loginLocationAddress: {
//         type: String,
//         default: null,
//       },

//       updatedBy: {
//         type: Schema.Types.ObjectId,
//         ref: "Auth",
//         default: null,
//       },
//     },
//     {
//       timestamps: true,
//     }
//   );

// AttendanceSchema.index({
//   userId: 1,
//   status: 1,
//   date: 1,
// });

// AttendanceSchema.index({
//   userId: 1,
//   date: -1,
// });

// AttendanceSchema.index({
//   status: 1,
//   date: -1,
// });

// /*
//  * Prevent duplicate attendance for the
//  * same employee and business/shift date.
//  */
// AttendanceSchema.index(
//   {
//     userId: 1,
//     shiftDate: 1,
//   },
//   {
//     unique: true,
//     sparse: true,
//   }
// );

// const Attendance: Model<IAttendance> =
//   mongoose.models.Attendance ||
//   mongoose.model<IAttendance>(
//     "Attendance",
//     AttendanceSchema
//   );

// export default Attendance;


import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "half-day"
  | "holiday"
  | "festival"
  | "weekly-off"
  | "office-off"
  | "leave"
  | "worked-on-holiday"
  | "worked-on-weekly-off"
  | "comp-off";

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;

  date: Date;

  shiftDate?: Date | null;

  shiftId?: mongoose.Types.ObjectId | null;

  scheduledStart?: Date | null;

  scheduledEnd?: Date | null;

  loggingTime?: Date | null;

  logoutTime?: Date | null;

  lunchStart?: Date | null;

  lunchEnd?: Date | null;

  status?: AttendanceStatus;

  lunchDurationMinutes?: number;

  excessLunchMinutes?: number;

  remarks?: string | null;

  isLate?: boolean;

  lateByMinutes?: number;

  isManual?: boolean;

  weeklyOff?: boolean;

  holiday?: boolean;

  holidayId?: mongoose.Types.ObjectId | null;

  updatedBy?: mongoose.Types.ObjectId | null;

  createdAt: Date;

  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    shiftDate: {
      type: Date,
      default: null,
      index: true,
    },

    shiftId: {
      type: Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
      index: true,
    },

    scheduledStart: {
      type: Date,
      default: null,
    },

    scheduledEnd: {
      type: Date,
      default: null,
    },

    loggingTime: {
      type: Date,
      default: null,
    },

    logoutTime: {
      type: Date,
      default: null,
    },

    lunchStart: {
      type: Date,
      default: null,
    },

    lunchEnd: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "present",
        "absent",
        "half-day",
        "holiday",
        "festival",
        "weekly-off",
        "office-off",
        "leave",
        "worked-on-holiday",
        "worked-on-weekly-off",
        "comp-off",
      ],
      default: "present",
      index: true,
    },

    lunchDurationMinutes: {
      type: Number,
      default: 0,
    },

    excessLunchMinutes: {
      type: Number,
      default: 0,
    },

    remarks: {
      type: String,
      default: null,
    },

    isLate: {
      type: Boolean,
      default: false,
    },

    lateByMinutes: {
      type: Number,
      default: 0,
    },

    isManual: {
      type: Boolean,
      default: false,
    },

    weeklyOff: {
      type: Boolean,
      default: false,
    },

    holiday: {
      type: Boolean,
      default: false,
    },

    holidayId: {
      type: Schema.Types.ObjectId,
      ref: "OfficeOff",
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

// =====================================================
// INDEXES
// =====================================================

AttendanceSchema.index({
  userId: 1,
  status: 1,
  date: 1,
});

AttendanceSchema.index({
  userId: 1,
  date: -1,
});

AttendanceSchema.index({
  status: 1,
  date: -1,
});

// =====================================================
// PREVENT DUPLICATE ATTENDANCE
// =====================================================

AttendanceSchema.index(
  {
    userId: 1,
    shiftDate: 1,
  },
  {
    unique: true,
    sparse: true,
  }
);

// =====================================================
// MODEL
// =====================================================

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>(
    "Attendance",
    AttendanceSchema
  );

export default Attendance;