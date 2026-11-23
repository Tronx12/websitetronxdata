import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import ExcelJS from "exceljs";

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import Team from "@/models/Team";
import Auth from "@/models/Auth";
import { getCurrentUser } from "@/lib/getuser";

export const dynamic = "force-dynamic";

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

async function getTeamMemberIdsForLead(
  teamLeadId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
  const ids = new Set<string>();
  const leadId = String(teamLeadId);
  ids.add(leadId);

  const teams = await Team.find({
    $or: [{ teamLead: teamLeadId }, { members: teamLeadId }],
    isActive: true,
  })
    .select("members teamLead")
    .lean();

  teams.forEach((t: any) => {
    if (t.teamLead) ids.add(String(t.teamLead));
    (t.members || []).forEach((m: any) => {
      ids.add(String(m));
    });
  });

  return [...ids]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function getMonthDateRange(monthParam?: string | null) {
  let year: number;
  let monthIndex: number; // 0-11

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [yStr, mStr] = monthParam.split("-");
    year = Number(yStr);
    monthIndex = Number(mStr) - 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIndex = now.getMonth();
  }

  // 1st day of month 00:00:00.000 UTC
  const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  // Last day of month 23:59:59.999 UTC
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

  return { startDate, endDate, monthKey, year, monthIndex };
}

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

    const role = normalizeRole(user.role);
    const userOid = toObjectId(user.userId);

    if (!userOid) {
      return NextResponse.json(
        { success: false, message: "Invalid user session" },
        { status: 400 }
      );
    }

    // Role check: admin, seniorteamlead, dataqualityanalyst, teamlead, hr, survey, surveytester, tester
    const allowedRoles = [
      "admin",
      "seniorteamlead",
      "dataqualityanalyst",
      "teamlead",
      "hr",
      "survey",
      "surveytester",
      "tester",
    ];

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to download monthly submission reports",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");
    const requestedTeamId = searchParams.get("teamId");
    const requestedUserId = searchParams.get("userId") || searchParams.get("createdBy");

    const { startDate, endDate, monthKey } = getMonthDateRange(monthParam);

    // Build filter
    const filter: any = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    let targetUserName: string | null = null;

    // Role scoping
    if (role === "survey" || role === "surveytester" || role === "tester") {
      // Survey testers can strictly only download their own submissions
      filter.createdBy = userOid;
      targetUserName = user.name || "tester";
    } else if (role === "teamlead") {
      const memberIds = await getTeamMemberIdsForLead(userOid);
      if (requestedUserId) {
        const targetUserOid = toObjectId(requestedUserId);
        if (targetUserOid && memberIds.some((id) => id.toString() === targetUserOid.toString())) {
          filter.createdBy = targetUserOid;
          const u = await Auth.findById(targetUserOid).select("name email").lean();
          if (u) targetUserName = (u as any).name || (u as any).email;
        } else {
          return NextResponse.json(
            { success: false, message: "Selected user is not part of your team" },
            { status: 403 }
          );
        }
      } else {
        filter.createdBy = { $in: memberIds };
      }
    } else if (
      role === "admin" ||
      role === "hr" ||
      role === "seniorteamlead" ||
      role === "dataqualityanalyst"
    ) {
      if (requestedUserId) {
        const targetUserOid = toObjectId(requestedUserId);
        if (targetUserOid) {
          filter.createdBy = targetUserOid;
          const u = await Auth.findById(targetUserOid).select("name email").lean();
          if (u) targetUserName = (u as any).name || (u as any).email;
        }
      } else if (requestedTeamId && requestedTeamId !== "all") {
        const teamOid = toObjectId(requestedTeamId);
        if (teamOid) {
          const team = await Team.findOne({
            _id: teamOid,
            isActive: true,
          })
            .select("members teamLead")
            .lean();

          if (team) {
            const tIds: mongoose.Types.ObjectId[] = [];
            if ((team as any).teamLead) {
              tIds.push(new mongoose.Types.ObjectId(String((team as any).teamLead)));
            }
            ((team as any).members || []).forEach((m: any) => {
              tIds.push(new mongoose.Types.ObjectId(String(m)));
            });
            filter.createdBy = { $in: tIds };
          }
        }
      }
    }

    // Fetch matching survey data
    const records = await SurveyData.find(filter)
      .sort({ createdAt: 1 })
      .lean();

    if (!records || records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `No survey submissions found for month ${monthKey}.`,
        },
        { status: 404 }
      );
    }

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Tronx CRM - Monthly Submission Report";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet(`Submissions ${monthKey}`);

    // EXACT REQUIRED COLUMNS IN ORDER:
    // 1. S.no.
    // 2. TNX Project ID
    // 3. Study Type
    // 4. parents id
    // 5. child id
    // 6. respondents id
    // 7. status
    // 8. count
    // 9. note
    worksheet.columns = [
      { header: "S.no.", key: "sNo", width: 10 },
      { header: "TNX Project ID", key: "tnxProjectId", width: 22 },
      { header: "Study Type", key: "studyType", width: 18 },
      { header: "parents id", key: "parentsId", width: 20 },
      { header: "child id", key: "childId", width: 20 },
      { header: "respondents id", key: "respondentsId", width: 25 },
      { header: "status", key: "status", width: 18 },
      { header: "count", key: "count", width: 12 },
      { header: "note", key: "note", width: 30 },
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" }, // Royal navy blue
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "medium", color: { argb: "FF111827" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    });

    // Populate data rows
    records.forEach((item: any, index: number) => {
      const data = item.data || {};

      // TNX Project ID
      const tnxProjectId =
        data["TNX Project ID"] ||
        data["tnxProjectId"] ||
        data["TNX ID"] ||
        data["tnxId"] ||
        data["Project ID"] ||
        data["projectId"] ||
        item.projectNo ||
        "N/A";

      // Study Type
      const studyType =
        data["Study Type"] ||
        data["studyType"] ||
        data["Study Type:"] ||
        data["Study type"] ||
        data["study_type"] ||
        item.category ||
        "N/A";

      // parents id
      const parentsId =
        data["Parent ID"] ||
        data["parentId"] ||
        data["parents id"] ||
        data["Parents ID"] ||
        data["parent id"] ||
        data["ParentId"] ||
        "N/A";

      // child id
      const childId =
        data["Child ID"] ||
        data["childId"] ||
        data["child id"] ||
        data["ChildId"] ||
        data["Child id"] ||
        "N/A";

      // respondents id
      const respondentsId =
        data["Respondent ID"] ||
        data["respondentId"] ||
        data["respondents id"] ||
        data["Respondents ID"] ||
        data["respondent id"] ||
        data["PID"] ||
        data["pid"] ||
        item.pid ||
        "N/A";

      // status
      const status =
        item.status ||
        data["Status"] ||
        data["status"] ||
        "N/A";

      // count
      const countVal =
        data["Counts"] ||
        data["counts"] ||
        data["count"] ||
        data["Count"] ||
        1;

      // note
      const note =
        data["Note"] ||
        data["note"] ||
        data["remarks"] ||
        data["Remarks"] ||
        item.description ||
        "N/A";

      const row = worksheet.addRow({
        sNo: index + 1,
        tnxProjectId: String(tnxProjectId),
        studyType: String(studyType),
        parentsId: String(parentsId),
        childId: String(childId),
        respondentsId: String(respondentsId),
        status: String(status),
        count: typeof countVal === "number" ? countVal : Number(countVal) || 1,
        note: String(note),
      });

      row.height = 22;

      // Zebra striping and borders
      const isEven = index % 2 === 0;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Calibri", size: 10 };
        cell.alignment = {
          vertical: "middle",
          horizontal:
            colNumber === 1 || colNumber === 3 || colNumber === 8
              ? "center"
              : "left",
        };
        if (!isEven) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" },
          };
        }
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const safeUserPart = targetUserName
      ? `-${targetUserName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`
      : "";
    const filename = `monthly-submission-report${safeUserPart}-${monthKey}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[MONTHLY SUBMISSION REPORT ERROR]:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate monthly submission report",
      },
      { status: 500 }
    );
  }
}
