import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/config/db";
import WeeklyOffPolicy, { WeekDay } from "@/models/WeeklyOffPolicy";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";

const VALID_SCOPES = ["company", "team", "employee"] as const;
const VALID_DAYS: WeekDay[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");
    const teamId = searchParams.get("teamId");
    const employeeId = searchParams.get("employeeId");

    const query: any = { isActive: true };
    if (scope && VALID_SCOPES.includes(scope as any)) {
      query.scope = scope;
    }
    if (teamId && mongoose.Types.ObjectId.isValid(teamId)) {
      query.teamId = teamId;
    }
    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      query.employeeId = employeeId;
    }

    const policies = await WeeklyOffPolicy.find(query)
      .populate("teamId", "name")
      .populate("employeeId", "name email")
      .sort({ effectiveFrom: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: policies,
    });
  } catch (error: any) {
    console.error("GET WEEKLY OFF ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load weekly off policies" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!["admin", "hr"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Admin or HR access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      policyId,
      name,
      scope = "team",
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

    if (!VALID_SCOPES.includes(scope)) {
      return NextResponse.json(
        { success: false, message: "Invalid weekly policy scope" },
        { status: 400 }
      );
    }

    if (!Array.isArray(days)) {
      return NextResponse.json(
        { success: false, message: "Days must be an array" },
        { status: 400 }
      );
    }

    for (const d of days) {
      if (!VALID_DAYS.includes(d)) {
        return NextResponse.json(
          { success: false, message: `Invalid weekday: ${d}` },
          { status: 400 }
        );
      }
    }

    if (scope === "team" && !teamId) {
      return NextResponse.json(
        { success: false, message: "teamId is required for team scope" },
        { status: 400 }
      );
    }

    if (scope === "employee" && !employeeId) {
      return NextResponse.json(
        { success: false, message: "employeeId is required for employee scope" },
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
      updatedBy: new mongoose.Types.ObjectId(user.userId),
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
        createdBy: new mongoose.Types.ObjectId(user.userId),
      });
    }

    await createAuditLog({
      userId: user.userId,
      action: policyId ? "UPDATE" : "CREATE",
      module: "Weekly Off",
      description: `${policyId ? "Updated" : "Created"} weekly off policy: ${name}`,
      entityType: "WeeklyOffPolicy",
      entityId: policy!._id.toString(),
      metadata: { scope, teamId, employeeId, days, rotational },
    });

    return NextResponse.json({
      success: true,
      message: policyId ? "Weekly off policy updated" : "Weekly off policy created",
      data: policy,
    });
  } catch (error: any) {
    console.error("POST WEEKLY OFF ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to save weekly off policy" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!["admin", "hr"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Admin or HR access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid policy ID is required" },
        { status: 400 }
      );
    }

    const policy = await WeeklyOffPolicy.findById(id);
    if (!policy) {
      return NextResponse.json(
        { success: false, message: "Policy not found" },
        { status: 404 }
      );
    }

    policy.isActive = false;
    policy.updatedBy = new mongoose.Types.ObjectId(user.userId);
    await policy.save();

    await createAuditLog({
      userId: user.userId,
      action: "DELETE",
      module: "Weekly Off",
      description: `Deactivated weekly off policy: ${policy.name}`,
      entityType: "WeeklyOffPolicy",
      entityId: id,
    });

    return NextResponse.json({
      success: true,
      message: "Weekly off policy deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE WEEKLY OFF ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete weekly off policy" },
      { status: 500 }
    );
  }
}
