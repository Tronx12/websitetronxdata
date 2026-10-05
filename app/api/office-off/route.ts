import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import OfficeOff from "@/models/OfficeOff";
import OfficeSettings from "@/models/OfficeSettings";
import WeeklyOffPolicy from "@/models/WeeklyOffPolicy";
import Shift from "@/models/Shift";
import Team from "@/models/Team";
import Auth from "@/models/Auth";
import Attendance from "@/models/Attendance";

import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";

const VALID_TYPES = ["festival", "holiday", "special"] as const;
const VALID_SCOPES = ["all", "team", "shift", "employee"] as const;
const VALID_DAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

/**
 * Resolve which employee IDs are affected by an office-off based on scope.
 */
async function resolveAffectedEmployeeIds(
  scope: string,
  teamIds: string[],
  shiftIds: string[],
  employeeIds: string[]
): Promise<mongoose.Types.ObjectId[]> {
  const activeFilter = { isActive: { $ne: false } };

  switch (scope) {
    case "all": {
      const users = await Auth.find(activeFilter).select("_id").lean();
      return users.map((u) => u._id);
    }

    case "team": {
      const teamObjectIds = teamIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      const teams = await Team.find({
        _id: { $in: teamObjectIds },
        isActive: true,
      })
        .select("members teamLead")
        .lean();

      const userIdSet = new Set<string>();
      for (const team of teams) {
        if (team.teamLead) {
          userIdSet.add(team.teamLead.toString());
        }
        if (Array.isArray(team.members)) {
          for (const memberId of team.members) {
            userIdSet.add(memberId.toString());
          }
        }
      }

      const userObjectIds = Array.from(userIdSet).map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      const activeUsers = await Auth.find({
        _id: { $in: userObjectIds },
        ...activeFilter,
      })
        .select("_id")
        .lean();
      return activeUsers.map((u) => u._id);
    }

    case "shift": {
      const shifts = await Shift.find({
        _id: { $in: shiftIds.map((id) => new mongoose.Types.ObjectId(id)) },
        isActive: true,
      })
        .select("code")
        .lean();

      const shiftCodes = shifts.map((s) => ((s as any).code || "").toLowerCase());
      if (shiftCodes.length === 0) return [];

      const users = await Auth.find({
        workingShift: { $in: shiftCodes },
        ...activeFilter,
      })
        .select("_id")
        .lean();
      return users.map((u) => u._id);
    }

    case "employee": {
      const userObjectIds = employeeIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      const activeUsers = await Auth.find({
        _id: { $in: userObjectIds },
        ...activeFilter,
      })
        .select("_id")
        .lean();
      return activeUsers.map((u) => u._id);
    }

    default:
      return [];
  }
}

/**
 * Create or update attendance records for all affected employees for office-off dates.
 */
async function syncAttendanceForOfficeOff(
  officeOffDocs: any[],
  affectedEmployeeIds: mongoose.Types.ObjectId[]
) {
  if (affectedEmployeeIds.length === 0 || officeOffDocs.length === 0) return 0;

  let created = 0;

  for (const offDoc of officeOffDocs) {
    const offDate = new Date(offDoc.date);
    offDate.setUTCHours(0, 0, 0, 0);
    const nextDate = new Date(offDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const existingRecords = await Attendance.find({
      userId: { $in: affectedEmployeeIds },
      date: { $gte: offDate, $lt: nextDate },
    })
      .select("userId status loggingTime")
      .lean();

    const existingUserMap = new Map<string, any>();
    for (const r of existingRecords) {
      existingUserMap.set(r.userId.toString(), r);
    }

    // Map office-off type to attendance status
    const offType = offDoc.type || "holiday";
    const attendanceStatus = offType === "festival" ? "festival" : "holiday";
    const remarks = `${offType === "festival" ? "Festival" : "Holiday"}: ${offDoc.title}`;

    const newRecords: any[] = [];
    const updateOps: any[] = [];

    for (const empId of affectedEmployeeIds) {
      const existing = existingUserMap.get(empId.toString());
      if (!existing) {
        newRecords.push({
          userId: empId,
          date: offDate,
          shiftDate: offDate,
          status: attendanceStatus,
          holiday: true,
          holidayId: offDoc._id,
          remarks,
        });
      } else {
        // If employee already had a record without login (e.g. absent or placeholder),
        // update status to holiday/festival
        if (!existing.loggingTime) {
          updateOps.push({
            updateOne: {
              filter: { _id: existing._id },
              update: {
                $set: {
                  status: attendanceStatus,
                  holiday: true,
                  holidayId: offDoc._id,
                  remarks,
                },
              },
            },
          });
        } else {
          // If worked, update holiday flag and status to worked-on-holiday
          updateOps.push({
            updateOne: {
              filter: { _id: existing._id },
              update: {
                $set: {
                  holiday: true,
                  holidayId: offDoc._id,
                  status: "worked-on-holiday",
                },
              },
            },
          });
        }
      }
    }

    if (newRecords.length > 0) {
      try {
        const result = await Attendance.insertMany(newRecords, {
          ordered: false,
        });
        created += result.length;
      } catch (bulkError: any) {
        if (bulkError?.insertedDocs) {
          created += bulkError.insertedDocs.length;
        }
        console.error(
          "Partial failure creating attendance for office-off:",
          bulkError?.message
        );
      }
    }

    if (updateOps.length > 0) {
      try {
        await Attendance.bulkWrite(updateOps, { ordered: false });
        created += updateOps.length;
      } catch (err: any) {
        console.error("Bulk write error updating attendance for office off:", err?.message);
      }
    }
  }

  return created;
}

/*
 * =========================================================
 * GET
 * =========================================================
 */
// export async function GET(req: NextRequest) {
//   try {
//     await connectDB();

//     const user = await getCurrentUser();
//     if (!user?.userId) {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized" },
//         { status: 401 }
//       );
//     }

//     const { searchParams } = new URL(req.url);
//     const year = searchParams.get("year") || new Date().getFullYear().toString();
//     const yearNumber = Number(year);

//     if (!Number.isInteger(yearNumber) || yearNumber < 2000 || yearNumber > 2100) {
//       return NextResponse.json(
//         { success: false, message: "Invalid year" },
//         { status: 400 }
//       );
//     }

//     const startDate = new Date(`${yearNumber}-01-01T00:00:00.000Z`);
//     const endDate = new Date(`${yearNumber + 1}-01-01T00:00:00.000Z`);

//     const [officeOffs, settings, weeklyPolicies, shifts] = await Promise.all([
//       OfficeOff.find({
//         date: {
//           $gte: startDate,
//           $lt: endDate,
//         },
//         isActive: true,
//       })
//         .populate("createdBy", "name email role")
//         .populate("teamIds", "name")
//         .populate("shiftIds", "name code")
//         .populate("employeeIds", "name email")
//         .sort({ date: 1 })
//         .lean(),

//       OfficeSettings.findOne().lean(),

//       WeeklyOffPolicy.find({
//         isActive: true,
//       })
//         .populate("teamId", "name")
//         .populate("employeeId", "name email")
//         .sort({ effectiveFrom: 1 })
//         .lean(),

//       Shift.find({
//         isActive: true,
//       })
//         .sort({ name: 1 })
//         .lean(),
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: officeOffs,
//       settings: {
//         weekendOff: settings?.weekendOff ?? false,
//         saturdayOff: settings?.saturdayOff ?? false,
//         sundayOff: settings?.sundayOff ?? false,
//       },
//       weeklyPolicies,
//       shifts,
//     });
//   } catch (error) {
//     console.error("GET OFFICE OFF ERROR:", error);
//     return NextResponse.json(
//       { success: false, message: "Failed to load office off records" },
//       { status: 500 }
//     );
//   }
// }

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser();

    if (!user?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const year =
      searchParams.get("year") ||
      new Date().getFullYear().toString();

    const yearNumber = Number(year);

    if (
      !Number.isInteger(yearNumber) ||
      yearNumber < 2000 ||
      yearNumber > 2100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid year",
        },
        { status: 400 }
      );
    }

    const startDate = new Date(
      `${yearNumber}-01-01T00:00:00.000Z`
    );

    const endDate = new Date(
      `${yearNumber + 1}-01-01T00:00:00.000Z`
    );

    // ----------------------------------------
    // OFFICE OFF
    // ----------------------------------------

    const officeOffs = await OfficeOff.find({
      date: {
        $gte: startDate,
        $lt: endDate,
      },
      isActive: true,
    })
      .populate("createdBy", "name email role")
      .populate("teamIds", "name")
      .populate("shiftIds", "name code")
      .populate("employeeIds", "name email")
      .sort({ date: 1 })
      .lean();

    // ----------------------------------------
    // SETTINGS
    // ----------------------------------------

    const settings =
      await OfficeSettings.findOne().lean();

    // ----------------------------------------
    // WEEKLY POLICIES
    // ----------------------------------------

    const weeklyPolicies =
      await WeeklyOffPolicy.find({
        isActive: true,
      })
        .populate("teamId", "name")
        .populate("employeeId", "name email")
        .sort({ effectiveFrom: 1 })
        .lean();

    // ----------------------------------------
    // SHIFTS
    // ----------------------------------------

    const shifts = await Shift.find({
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: officeOffs,

      settings: {
        weekendOff:
          settings?.weekendOff ?? false,

        saturdayOff:
          settings?.saturdayOff ?? false,

        sundayOff:
          settings?.sundayOff ?? false,
      },

      weeklyPolicies,
      shifts,
    });
  } catch (error: any) {
    console.error(
      "GET OFFICE OFF ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to load office off records",

        error:
          process.env.NODE_ENV === "development"
            ? {
              name: error?.name,
              message: error?.message,
            }
            : undefined,
      },
      { status: 500 }
    );
  }
}

/*
 * =========================================================
 * POST
 * =========================================================
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!["admin", "hr"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Admin or HR access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      startDate,
      endDate,
      title,
      type = "festival",
      description,
      scope = "all",
      teamIds = [],
      shiftIds = [],
      employeeIds = [],
      isPaid = true,
    } = body;

    if (!startDate || !endDate || !title?.trim()) {
      return NextResponse.json(
        { success: false, message: "Start date, end date and title are required" },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type || "holiday")) {
      return NextResponse.json(
        { success: false, message: "Invalid office off type" },
        { status: 400 }
      );
    }

    if (!VALID_SCOPES.includes(scope)) {
      return NextResponse.json(
        { success: false, message: "Invalid office off scope" },
        { status: 400 }
      );
    }

    if (scope === "team" && (!Array.isArray(teamIds) || teamIds.length === 0)) {
      return NextResponse.json(
        { success: false, message: "Select at least one team" },
        { status: 400 }
      );
    }

    if (scope === "shift" && (!Array.isArray(shiftIds) || shiftIds.length === 0)) {
      return NextResponse.json(
        { success: false, message: "Select at least one shift" },
        { status: 400 }
      );
    }

    if (scope === "employee" && (!Array.isArray(employeeIds) || employeeIds.length === 0)) {
      return NextResponse.json(
        { success: false, message: "Select at least one employee" },
        { status: 400 }
      );
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date" },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { success: false, message: "Start date cannot be after end date" },
        { status: 400 }
      );
    }

    const dates: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);

      if (dates.length > 366) {
        return NextResponse.json(
          { success: false, message: "Maximum holiday range is 366 days" },
          { status: 400 }
        );
      }
    }

    const allIds = [...teamIds, ...shiftIds, ...employeeIds];
    for (const id of allIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: `Invalid ObjectId: ${id}` },
          { status: 400 }
        );
      }
    }

    const existing = await OfficeOff.find({
      date: { $in: dates },
      scope,
      isActive: true,
      ...(scope === "team"
        ? { teamIds: { $in: teamIds.map((id: string) => new mongoose.Types.ObjectId(id)) } }
        : {}),
      ...(scope === "shift"
        ? { shiftIds: { $in: shiftIds.map((id: string) => new mongoose.Types.ObjectId(id)) } }
        : {}),
      ...(scope === "employee"
        ? { employeeIds: { $in: employeeIds.map((id: string) => new mongoose.Types.ObjectId(id)) } }
        : {}),
    }).lean();

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more selected dates already have an office off for the selected target",
          existingDates: existing.map((item) => item.date.toISOString().split("T")[0]),
        },
        { status: 409 }
      );
    }

    const groupId = new mongoose.Types.ObjectId().toString();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);

    const records = dates.map((date) => ({
      date,
      title: title.trim(),
      type: type || "holiday",
      description: description?.trim() || null,
      groupId,
      scope,
      teamIds: Array.isArray(teamIds) ? teamIds.map((id: string) => new mongoose.Types.ObjectId(id)) : [],
      shiftIds: Array.isArray(shiftIds) ? shiftIds.map((id: string) => new mongoose.Types.ObjectId(id)) : [],
      employeeIds: Array.isArray(employeeIds) ? employeeIds.map((id: string) => new mongoose.Types.ObjectId(id)) : [],
      isPaid: isPaid !== false,
      isActive: true,
      createdBy: userObjectId,
      updatedBy: userObjectId,
    }));

    const officeOffs = await OfficeOff.insertMany(records);

    // ── Sync attendance records for affected employees ──
    let attendanceCreated = 0;
    try {
      const affectedEmployeeIds = await resolveAffectedEmployeeIds(
        scope,
        teamIds,
        shiftIds,
        employeeIds
      );
      attendanceCreated = await syncAttendanceForOfficeOff(
        officeOffs,
        affectedEmployeeIds
      );
    } catch (syncError) {
      console.error("Error syncing attendance for office-off:", syncError);
    }

    await createAuditLog({
      userId: user.userId,
      action: "CREATE",
      module: "Office Off",
      description: `Created ${officeOffs.length}-day office off: ${title.trim()}. Attendance marked for ${attendanceCreated} employee-days.`,
      entityType: "OfficeOff",
      entityId: groupId,
      metadata: {
        startDate,
        endDate,
        totalDays: officeOffs.length,
        title: title.trim(),
        type: type || "holiday",
        scope,
        teamIds,
        shiftIds,
        employeeIds,
        isPaid,
        description: description?.trim() || null,
        attendanceCreated,
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent") || null,
    });

    return NextResponse.json(
      {
        success: true,
        message: `${officeOffs.length} office off days created. Attendance marked for ${attendanceCreated} employees.`,
        data: officeOffs,
        attendanceCreated,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("CREATE OFFICE OFF ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create office off" },
      { status: 500 }
    );
  }
}

/*
 * =========================================================
 * PUT
 *
 * Supports:
 * action = weekend
 * action = weekly-policy
 * action = shift
 * =========================================================
 */
export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!["admin", "hr"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Admin or HR access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = body.action || "weekend";
    const userObjectId = new mongoose.Types.ObjectId(user.userId);

    /*
     * -----------------------------------------------------
     * WEEKEND SETTING
     * -----------------------------------------------------
     */
    if (action === "weekend") {
      const weekendOff = body.weekendOff === true;

      const settings = await OfficeSettings.findOneAndUpdate(
        {},
        {
          $set: {
            weekendOff,
            saturdayOff: weekendOff,
            sundayOff: weekendOff,
            updatedBy: userObjectId,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      await WeeklyOffPolicy.findOneAndUpdate(
        {
          scope: "company",
          name: "Company Default",
        },
        {
          $set: {
            days: weekendOff ? ["SATURDAY", "SUNDAY"] : [],
            rotational: false,
            effectiveFrom: new Date(`${new Date().getFullYear()}-01-01T00:00:00.000Z`),
            isActive: true,
            updatedBy: userObjectId,
          },
          $setOnInsert: {
            createdBy: userObjectId,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      return NextResponse.json({
        success: true,
        message: weekendOff ? "Saturday and Sunday are now weekly off" : "Weekend weekly off disabled",
        data: settings,
      });
    }

    /*
     * -----------------------------------------------------
     * WEEKLY OFF POLICY
     * -----------------------------------------------------
     */
    if (action === "weekly-policy") {
      const {
        policyId,
        name,
        scope = "company",
        teamId,
        employeeId,
        days = [],
        rotational = false,
        rotationWeeks = [],
        effectiveFrom,
        effectiveTo,
      } = body;

      if (!name?.trim()) {
        return NextResponse.json(
          { success: false, message: "Policy name is required" },
          { status: 400 }
        );
      }

      if (!["company", "team", "employee"].includes(scope)) {
        return NextResponse.json(
          { success: false, message: "Invalid weekly policy scope" },
          { status: 400 }
        );
      }

      if (!Array.isArray(days)) {
        return NextResponse.json(
          { success: false, message: "days must be an array" },
          { status: 400 }
        );
      }

      const payload = {
        name: name.trim(),
        scope,
        teamId: scope === "team" && teamId ? new mongoose.Types.ObjectId(teamId) : null,
        employeeId: scope === "employee" && employeeId ? new mongoose.Types.ObjectId(employeeId) : null,
        days,
        rotational: rotational === true,
        rotationWeeks: Array.isArray(rotationWeeks) ? rotationWeeks : [],
        effectiveFrom: new Date(effectiveFrom || new Date()),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isActive: true,
        updatedBy: userObjectId,
      };

      let policy;
      if (policyId && mongoose.Types.ObjectId.isValid(policyId)) {
        policy = await WeeklyOffPolicy.findByIdAndUpdate(
          policyId,
          { $set: payload },
          { new: true }
        );
      } else {
        policy = await WeeklyOffPolicy.create({
          ...payload,
          createdBy: userObjectId,
        });
      }

      return NextResponse.json({
        success: true,
        message: policyId ? "Weekly off policy updated" : "Weekly off policy created",
        data: policy,
      });
    }

    /*
     * -----------------------------------------------------
     * SHIFT
     * -----------------------------------------------------
     */
    if (action === "shift") {
      const {
        shiftId,
        name,
        code,
        startTime,
        endTime,
        crossesMidnight = false,
        graceMinutes = 0,
      } = body;

      if (!name?.trim() || !code?.trim() || !startTime || !endTime) {
        return NextResponse.json(
          { success: false, message: "Name, code, start time and end time are required" },
          { status: 400 }
        );
      }

      let shift;
      if (shiftId && mongoose.Types.ObjectId.isValid(shiftId)) {
        shift = await Shift.findByIdAndUpdate(
          shiftId,
          {
            $set: {
              name: name.trim(),
              code: code.trim().toUpperCase(),
              startTime,
              endTime,
              crossesMidnight: crossesMidnight === true,
              graceMinutes: Number(graceMinutes) || 0,
              updatedBy: userObjectId,
            },
          },
          { new: true }
        );
      } else {
        shift = await Shift.create({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          startTime,
          endTime,
          crossesMidnight: crossesMidnight === true,
          graceMinutes: Number(graceMinutes) || 0,
          isActive: true,
          createdBy: userObjectId,
          updatedBy: userObjectId,
        });
      }

      return NextResponse.json({
        success: true,
        message: shiftId ? "Shift updated" : "Shift created",
        data: shift,
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("OFFICE OFF PUT ERROR:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Duplicate record already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update office settings" },
      { status: 500 }
    );
  }
}