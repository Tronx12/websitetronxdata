import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import OfficeOff from "@/models/OfficeOff";
import OfficeSettings from "@/models/OfficeSettings";
import WeeklyOffPolicy from "@/models/WeeklyOffPolicy";
import Shift from "@/models/Shift";

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

/*
 * =========================================================
 * GET
 * =========================================================
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const yearNumber = Number(year);

    if (!Number.isInteger(yearNumber) || yearNumber < 2000 || yearNumber > 2100) {
      return NextResponse.json(
        { success: false, message: "Invalid year" },
        { status: 400 }
      );
    }

    const startDate = new Date(`${yearNumber}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${yearNumber + 1}-01-01T00:00:00.000Z`);

    const [officeOffs, settings, weeklyPolicies, shifts] = await Promise.all([
      OfficeOff.find({
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
        .lean(),

      OfficeSettings.findOne().lean(),

      WeeklyOffPolicy.find({
        isActive: true,
      })
        .populate("teamId", "name")
        .populate("employeeId", "name email")
        .sort({ effectiveFrom: 1 })
        .lean(),

      Shift.find({
        isActive: true,
      })
        .sort({ name: 1 })
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: officeOffs,
      settings: {
        weekendOff: settings?.weekendOff ?? false,
        saturdayOff: settings?.saturdayOff ?? false,
        sundayOff: settings?.sundayOff ?? false,
      },
      weeklyPolicies,
      shifts,
    });
  } catch (error) {
    console.error("GET OFFICE OFF ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load office off records" },
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

    await createAuditLog({
      userId: user.userId,
      action: "CREATE",
      module: "Office Off",
      description: `Created ${officeOffs.length}-day office off: ${title.trim()}`,
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
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent") || null,
    });

    return NextResponse.json(
      {
        success: true,
        message: `${officeOffs.length} office off days created successfully`,
        data: officeOffs,
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