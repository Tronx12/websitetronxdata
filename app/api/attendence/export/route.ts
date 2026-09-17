import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import ExcelJS from "exceljs";
import { format } from "date-fns";

import { connectDB } from "@/config/db";
import Attendance from "@/models/Attendance";
import Auth from "@/models/Auth";
import Team from "@/models/Team";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";
import { formatLateTime } from "@/lib/shiftValidation";

function normalizeRole(role: unknown) {
  return String(role || "")
    .toLowerCase()
    .replace(/[-_\s]/g, "");
}

function toObjectId(value: unknown) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(String(value))) {
    return new mongoose.Types.ObjectId(String(value));
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = normalizeRole(currentUser.role);
    const userOid = toObjectId(currentUser.userId);
    if (!userOid) {
      return NextResponse.json(
        { success: false, message: "Invalid user session" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || searchParams.get("startDate");
    const to = searchParams.get("to") || searchParams.get("endDate");
    const requestedUserId = searchParams.get("userId");
    const requestedTeamId = searchParams.get("teamId");

    const query: any = {};

    // ─────────────────────────────────────────────────────────
    // Role-based scoping
    // ─────────────────────────────────────────────────────────
    if (role === "admin" || role === "hr") {
      if (requestedUserId) {
        query.userId = requestedUserId;
      } else if (requestedTeamId && requestedTeamId !== "all") {
        const teamOid = toObjectId(requestedTeamId);
        if (teamOid) {
          const teamUsers = await Auth.find(
            { teamId: teamOid, isDeleted: { $ne: true } },
            { _id: 1 }
          ).lean();
          query.userId = { $in: teamUsers.map((u) => u._id) };
        }
      }
    } else if (role === "teamlead") {
      // Find members of Team Lead's teams
      const teams = await Team.find({
        teamLead: userOid,
        isActive: true,
      }).select("members").lean();

      const memberIds = Array.from(
        new Set(
          teams.flatMap((t: any) => (t.members || []).map((m: any) => String(m)))
        )
      );

      // Always include Team Lead themselves
      if (!memberIds.includes(String(userOid))) {
        memberIds.push(String(userOid));
      }

      if (requestedUserId) {
        if (!memberIds.includes(requestedUserId)) {
          return NextResponse.json(
            { success: false, message: "Cannot export data outside your team" },
            { status: 403 }
          );
        }
        query.userId = requestedUserId;
      } else {
        query.userId = { $in: memberIds };
      }
    } else {
      // Standard employee / survey tester - only their own
      query.userId = userOid;
    }

    // ─────────────────────────────────────────────────────────
    // Date Range Filtering
    // ─────────────────────────────────────────────────────────
    if (from || to) {
      query.date = {};
      if (from) {
        const startDate = new Date(from.includes("T") ? from : `${from}T00:00:00+05:30`);
        query.date.$gte = startDate;
      }
      if (to) {
        const endDate = new Date(to.includes("T") ? to : `${to}T23:59:59.999+05:30`);
        query.date.$lte = endDate;
      }
    }

    // ─────────────────────────────────────────────────────────
    // Fetch Attendance Records
    // ─────────────────────────────────────────────────────────
    const records = await Attendance.find(query)
      .populate("userId", "name email role workingShift")
      .populate("updatedBy", "name email")
      .sort({ date: -1 })
      .lean();

    // ─────────────────────────────────────────────────────────
    // Generate Excel Workbook
    // ─────────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TronX CRM";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Attendance Report");

    worksheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Employee Name", key: "name", width: 22 },
      { header: "Email", key: "email", width: 26 },
      { header: "Role", key: "role", width: 16 },
      { header: "Working Shift", key: "workingShift", width: 14 },
      { header: "Status", key: "status", width: 12 },
      { header: "Login Time", key: "loggingTime", width: 14 },
      { header: "Logout Time", key: "logoutTime", width: 14 },
      { header: "Late Status", key: "isLate", width: 14 },
      { header: "Late By", key: "lateBy", width: 14 },
      { header: "Lunch Start", key: "lunchStart", width: 14 },
      { header: "Lunch End", key: "lunchEnd", width: 14 },
      { header: "Lunch Duration", key: "lunchDuration", width: 16 },
      { header: "Excess Lunch", key: "excessLunch", width: 14 },
      { header: "Remarks", key: "remarks", width: 30 },
      { header: "Location Address", key: "location", width: 35 },
      { header: "Updated By", key: "updatedBy", width: 20 },
    ];

    // Format Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1E293B" }, // Slate-800
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 24;

    // Add Rows
    records.forEach((r: any) => {
      const userObj = r.userId || {};
      const updatedByObj = r.updatedBy || {};

      worksheet.addRow({
        date: r.date ? format(new Date(r.date), "dd MMM yyyy") : "—",
        name: userObj.name || "—",
        email: userObj.email || "—",
        role: userObj.role ? String(userObj.role).replace("-", " ") : "—",
        workingShift: userObj.workingShift || "day",
        status: (r.status || "present").toUpperCase(),
        loggingTime: r.loggingTime ? format(new Date(r.loggingTime), "hh:mm a") : "—",
        logoutTime: r.logoutTime ? format(new Date(r.logoutTime), "hh:mm a") : "—",
        isLate: r.isLate ? "YES" : "NO",
        lateBy: r.isLate && r.lateByMinutes ? formatLateTime(r.lateByMinutes) : "—",
        lunchStart: r.lunchStart ? format(new Date(r.lunchStart), "hh:mm a") : "—",
        lunchEnd: r.lunchEnd ? format(new Date(r.lunchEnd), "hh:mm a") : "—",
        lunchDuration: r.lunchDurationMinutes ? `${r.lunchDurationMinutes} mins` : "—",
        excessLunch: r.excessLunchMinutes ? `${r.excessLunchMinutes} mins` : "0 mins",
        remarks: r.remarks || "—",
        location: r.loginLocationAddress || "—",
        updatedBy: updatedByObj.name || "—",
      });
    });

    // Style data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: "middle" };
        row.height = 20;
      }
    });

    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `attendance-${role}-${from || "all"}_to_${to || "all"}-${Date.now()}.xlsx`;

    // ─────────────────────────────────────────────────────────
    // Audit Log
    // ─────────────────────────────────────────────────────────
    await createAuditLog({
      userId: currentUser.userId,
      action: "EXPORT",
      module: "Attendance",
      description: `Exported attendance XLSX report (${records.length} records)`,
      entityType: "Attendance",
      metadata: {
        from: from || null,
        to: to || null,
        totalRecords: records.length,
        role: currentUser.role,
        requestedUserId: requestedUserId || null,
        requestedTeamId: requestedTeamId || null,
      },
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Attendance export error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to export attendance records",
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
