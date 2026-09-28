import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import { getCurrentUser } from "@/lib/getuser";

export async function GET(req: NextRequest) {
  try {
    // ==============================
    // AUTH CHECK
    // ==============================
    const currentUser = await getCurrentUser();

    if (!currentUser?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const allowedRoles = ["admin", "hr", "team-lead","survey-tester"];

    if (!allowedRoles.includes(String(currentUser.role))) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // ==============================
    // DATABASE
    // ==============================
    await connectDB();

    const users = await Auth.find({})
      .select("-password -__v")
      .lean();

    // ==============================
    // CREATE WORKBOOK
    // ==============================
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Admin Panel";
    workbook.created = new Date();

    // ==============================
    // ROLE GROUPING
    // ==============================
    const roleGroups: Record<string, any[]> = {
      Admin: [],
      HR: [],
      "Team Lead": [],
      Employee: [],
      "Survey Tester":[],
      Other: [],
    };

    for (const user of users) {
      const role = String(user.role || "")
        .toLowerCase()
        .trim();

      if (role === "admin") {
        roleGroups.Admin.push(user);
      } else if (role === "hr") {
        roleGroups.HR.push(user);
      } else if (
        role === "team-lead" ||
        role === "team_lead" ||
        role === "teamlead"
      ) {
        roleGroups["Team Lead"].push(user);
      } 

      else if (role === "survey-tester") {
        roleGroups["Survey Tester"].push(user);
      } 
      
      
      else if (role === "employee") {
        roleGroups.Employee.push(user);
      } else {
        roleGroups.Other.push(user);
      }
    }

    // ==============================
    // CREATE SHEETS
    // ==============================
    for (const [sheetName, roleUsers] of Object.entries(roleGroups)) {
      // Skip empty roles
      if (roleUsers.length === 0) {
        continue;
      }

      const worksheet = workbook.addWorksheet(sheetName);

      worksheet.columns = [
        {
          header: "S.No",
          key: "serial",
          width: 8,
        },
        {
          header: "Name",
          key: "name",
          width: 25,
        },
        {
          header: "Email",
          key: "email",
          width: 35,
        },
        {
          header: "Phone",
          key: "phone",
          width: 18,
        },
        {
          header: "Role",
          key: "role",
          width: 18,
        },
        {
          header: "Department",
          key: "department",
          width: 25,
        },
        {
          header: "Team",
          key: "team",
          width: 25,
        },
        {
          header: "Status",
          key: "status",
          width: 15,
        },
        {
          header: "Created At",
          key: "createdAt",
          width: 22,
        },
      ];

      // Header styling
      const headerRow = worksheet.getRow(1);

      headerRow.font = {
        bold: true,
      };

      headerRow.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      headerRow.height = 25;

      // Freeze header
      worksheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      // ==============================
      // ADD USERS
      // ==============================
      roleUsers.forEach((user, index) => {
        worksheet.addRow({
          serial: index + 1,

          name:
            user.name ||
            user.fullName ||
            user.username ||
            "",

          email: user.email || "",

          phone:
            user.phone ||
            user.mobile ||
            user.phoneNumber ||
            "",

          role: user.role || "",

          department:
            user.department ||
            "",

          team:
            user.team ||
            user.teamName ||
            "",

          status:
            user.status ||
            (user.isActive === false ? "Inactive" : "Active"),

          createdAt: user.createdAt
            ? new Date(user.createdAt).toLocaleString("en-IN")
            : "",
        });
      });

      // Auto filter
      worksheet.autoFilter = {
        from: "A1",
        to: `I${roleUsers.length + 1}`,
      };

      // Borders
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: {
              style: "thin",
            },
            left: {
              style: "thin",
            },
            bottom: {
              style: "thin",
            },
            right: {
              style: "thin",
            },
          };
        });
      });
    }

    // ==============================
    // SUMMARY SHEET
    // ==============================
    const summary = workbook.addWorksheet("Summary", 0);

    summary.columns = [
      {
        header: "Role",
        key: "role",
        width: 25,
      },
      {
        header: "Total Users",
        key: "count",
        width: 20,
      },
    ];

    summary.getRow(1).font = {
      bold: true,
    };

    for (const [role, roleUsers] of Object.entries(roleGroups)) {
      summary.addRow({
        role,
        count: roleUsers.length,
      });
    }

    summary.addRow({
      role: "TOTAL",
      count: users.length,
    });

    summary.getRow(summary.rowCount).font = {
      bold: true,
    };

    summary.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: {
            style: "thin",
          },
          left: {
            style: "thin",
          },
          bottom: {
            style: "thin",
          },
          right: {
            style: "thin",
          },
        };
      });
    });

    // ==============================
    // GENERATE EXCEL
    // ==============================
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          `attachment; filename="Users_Role_Wise_${new Date()
            .toISOString()
            .slice(0, 10)}.xlsx`,
      },
    });
  } catch (error) {
    console.error("USER EXPORT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to export users",
      },
      {
        status: 500,
      }
    );
  }
}