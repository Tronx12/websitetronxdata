// import { NextRequest, NextResponse } from "next/server";
// import { connectDB } from "@/config/db";
// import SurveyData from "@/models/SurveyData";
// import * as XLSX from "xlsx";

// export async function GET(req: NextRequest) {
//   try {
//     await connectDB();
//     const { searchParams } = new URL(req.url);
//     const category = searchParams.get("category");

//     const filter: any = {};
//     if (category && ["B2B", "B2H", "B2C"].includes(category)) {
//       filter.category = category;
//     }

//     const items = await SurveyData.find(filter).sort({ createdAt: -1 }).lean();

//     const rows = items.map((item: any) => {
//       const dataObj =
//         item.data instanceof Map
//           ? Object.fromEntries(item.data)
//           : item.data || {};

//       return {
//         Category: item.category,
//         "Account Type": item.accountType || "",
//         "Project No": item.projectNo || "",
//         "Panel Code": item.panelCode || "",
//         Description: item.description || "",
//         PID: item.pid || "",
//         "Supplier ID": item.supplierId || "",
//         Country: item.country || "",
//         IP: item.ip || "",
//         Status: item.status || "",
//         ...dataObj,
//         "Created At": new Date(item.createdAt).toLocaleString(),
//         "Updated At": new Date(item.updatedAt).toLocaleString(),
//       };
//     });

//     const worksheet = XLSX.utils.json_to_sheet(rows);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, category || "All");

//     const buffer = XLSX.write(workbook, {
//       type: "buffer",
//       bookType: "xlsx",
//     });

//     const filename = `survey-${category || "all"}-${Date.now()}.xlsx`;

//     return new NextResponse(buffer, {
//       status: 200,
//       headers: {
//         "Content-Type":
//           "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//         "Content-Disposition": `attachment; filename="${filename}"`,
//       },
//     });
//   } catch (error) {
//     console.error("Export error:", error);
//     return NextResponse.json(
//       { success: false, message: "Export failed" },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import ExcelJS from "exceljs";

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import Auth from "@/models/Auth";
import Team from "@/models/Team";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";



// =========================================================
// HELPERS
// =========================================================

function normalizeRole(role: unknown) {
  return String(role || "")
    .toLowerCase()
    .replace(/[-_\s]/g, "");
}

function toObjectId(value: unknown) {
  if (!value) return null;

  if (
    value instanceof mongoose.Types.ObjectId
  ) {
    return value;
  }

  if (
    mongoose.Types.ObjectId.isValid(
      String(value)
    )
  ) {
    return new mongoose.Types.ObjectId(
      String(value)
    );
  }

  return null;
}


// =========================================================
// DATE RANGE
// =========================================================

function getDateRange(
  range: string | null,
  startDate: string | null,
  endDate: string | null
) {
  const now = new Date();

  // -------------------------------------------------------
  // CUSTOM
  // -------------------------------------------------------

  if (startDate && endDate) {
    const start = new Date(
      startDate.includes("T") ? startDate : `${startDate}T00:00:00+05:30`
    );

    const end = new Date(
      endDate.includes("T") ? endDate : `${endDate}T23:59:59.999+05:30`
    );

    return {
      start,
      end,
    };
  }

  // -------------------------------------------------------
  // TODAY
  // -------------------------------------------------------

  if (range === "today") {
    const date =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "Asia/Kolkata",
        }
      ).format(now);

    return {
      start: new Date(
        `${date}T00:00:00+05:30`
      ),

      end: new Date(
        `${date}T23:59:59.999+05:30`
      ),
    };
  }

  // -------------------------------------------------------
  // WEEKLY
  // Monday -> Sunday
  // -------------------------------------------------------

  if (range === "weekly") {
    const indiaNow =
      new Date(
        now.toLocaleString(
          "en-US",
          {
            timeZone:
              "Asia/Kolkata",
          }
        )
      );

    const day =
      indiaNow.getDay();

    const diff =
      day === 0
        ? 6
        : day - 1;

    const startLocal =
      new Date(indiaNow);

    startLocal.setDate(
      indiaNow.getDate() -
      diff
    );

    startLocal.setHours(
      0,
      0,
      0,
      0
    );

    const endLocal =
      new Date(startLocal);

    endLocal.setDate(
      startLocal.getDate() +
      6
    );

    endLocal.setHours(
      23,
      59,
      59,
      999
    );

    const start =
      new Date(
        startLocal.toLocaleString(
          "en-US",
          {
            timeZone:
              "Asia/Kolkata",
          }
        )
      );

    const end =
      new Date(
        endLocal.toLocaleString(
          "en-US",
          {
            timeZone:
              "Asia/Kolkata",
          }
        )
      );

    return {
      start,
      end,
    };
  }

  // -------------------------------------------------------
  // MONTHLY
  // -------------------------------------------------------

  if (range === "monthly") {
    const indiaNow =
      new Date(
        now.toLocaleString(
          "en-US",
          {
            timeZone:
              "Asia/Kolkata",
          }
        )
      );

    const year =
      indiaNow.getFullYear();

    const month =
      indiaNow.getMonth();

    const startLocal =
      new Date(
        year,
        month,
        1,
        0,
        0,
        0,
        0
      );

    const endLocal =
      new Date(
        year,
        month + 1,
        0,
        23,
        59,
        59,
        999
      );

    const start =
      new Date(
        startLocal.toLocaleString(
          "en-US",
          {
            timeZone:
              "Asia/Kolkata",
          }
        )
      );

    const end =
      new Date(
        endLocal.toLocaleString(
          "en-US",
          {
            timeZone:
              "Asia/Kolkata",
          }
        )
      );

    return {
      start,
      end,
    };
  }

  // -------------------------------------------------------
  // ALL
  // -------------------------------------------------------

  return {
    start: null,
    end: null,
  };
}


// =========================================================
// EXCEL VALUE
// =========================================================

function excelValue(
  value: any
): any {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    value instanceof Date
  ) {
    return value;
  }

  if (
    typeof value ===
    "object"
  ) {
    // ObjectId
    if (
      value?._bsontype ===
      "ObjectId"
    ) {
      return value.toString();
    }

    // Map
    if (
      value instanceof Map
    ) {
      return JSON.stringify(
        Object.fromEntries(
          value
        )
      );
    }

    try {
      return JSON.stringify(
        value
      );
    } catch {
      return String(
        value
      );
    }
  }

  return value;
}


// =========================================================
// GET EXPORT
// =========================================================

export async function GET(
  req: NextRequest
) {
  try {
    await connectDB();

    // =======================================================
    // AUTHENTICATED USER
    // =======================================================

    const user =
      await getCurrentUser();

    if (!user?.userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const role =
      normalizeRole(
        user.role
      );

    const userOid =
      toObjectId(
        user.userId
      );

    if (!userOid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid logged-in user",
        },
        {
          status: 400,
        }
      );
    }


    // =======================================================
    // QUERY
    // =======================================================

    const {
      searchParams,
    } = new URL(
      req.url
    );

    const category =
      searchParams.get(
        "category"
      );

    const range =
      searchParams.get(
        "range"
      );

    const startDate =
      searchParams.get(
        "startDate"
      ) ||
      searchParams.get(
        "from"
      );

    const endDate =
      searchParams.get(
        "endDate"
      ) ||
      searchParams.get(
        "to"
      );

    /*
     * ONLY ADMIN / HR CAN SEND teamId.
     *
     * Survey users and Team Leads must NEVER
     * be allowed to choose another team.
     */
    const requestedTeamId =
      searchParams.get(
        "teamId"
      );


    // =======================================================
    // BASE FILTER
    // =======================================================

    const filter: any = {};


    // =======================================================
    // ROLE-BASED ACCESS
    // =======================================================

    // -------------------------------------------------------
    // SURVEY
    //
    // ONLY records created by this logged-in user
    // -------------------------------------------------------

    if (
      role === "survey" ||
      role === "surveytester"
    ) {
      // Survey Tester can export ONLY their own uploaded data
      filter.createdBy = userOid;
    }


    // -------------------------------------------------------
    // TEAM LEAD
    //
    // TEAM LEAD + ALL TEAM MEMBERS
    // -------------------------------------------------------

    else if (
      role === "teamlead"
    ) {
      const teamOid =
        toObjectId(
          (user as any).teamId
        );

      if (!teamOid) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Team Lead does not have a valid team",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * Get every active user belonging to
       * this Team Lead's team.
       *
       * This avoids depending on SurveyData.teamId
       * for old records.
       */
      const teamUsers =
        await Auth.find(
          {
            teamId:
              teamOid,

            isDeleted: {
              $ne: true,
            },

            isActive: {
              $ne: false,
            },
          },
          {
            _id: 1,
          }
        ).lean();

      const memberIds =
        teamUsers.map(
          (member) =>
            member._id
        );

      /*
       * Always include the Team Lead himself,
       * even if his User document has an unexpected
       * team configuration.
       */
      if (
        !memberIds.some(
          (id) =>
            id.toString() ===
            userOid.toString()
        )
      ) {
        memberIds.push(
          userOid
        );
      }

      filter.createdBy = {
        $in: memberIds,
      };

      /*
       * Also keep team restriction when
       * SurveyData has teamId.
       *
       * We DON'T require it because older records
       * may not have teamId.
       */
    }


    // -------------------------------------------------------
    // ADMIN
    // HR
    //
    // Selected team only
    // -------------------------------------------------------

    else if (
      role === "admin" ||
      role === "hr"
    ) {
      if (
        requestedTeamId &&
        requestedTeamId !== "all"
      ) {
        const teamOid =
          toObjectId(
            requestedTeamId
          );

        if (!teamOid) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Invalid teamId",
            },
            {
              status: 400,
            }
          );
        }

        /*
         * Get all users belonging to
         * selected team.
         */
        const teamUsers =
          await Auth.find(
            {
              teamId:
                teamOid,

              isDeleted: {
                $ne: true,
              },

              isActive: {
                $ne: false,
              },
            },
            {
              _id: 1,
            }
          ).lean();

        const memberIds =
          teamUsers.map(
            (member) =>
              member._id
          );

        if (
          memberIds.length === 0
        ) {
          filter.createdBy = {
            $in: [],
          };
        } else {
          filter.createdBy = {
            $in: memberIds,
          };
        }
      }
    }



    // -------------------------------------------------------
    // OTHER ROLES
    // -------------------------------------------------------

    else {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to export survey data",
        },
        {
          status: 403,
        }
      );
    }


    // =======================================================
    // CATEGORY
    // =======================================================

    if (
      category &&
      [
        "B2B",
        "B2H",
        "B2C",
      ].includes(
        category
      )
    ) {
      filter.category =
        category;
    }


    // =======================================================
    // DATE
    // =======================================================

    const {
      start,
      end,
    } =
      getDateRange(
        range,
        startDate,
        endDate
      );

    if (
      start &&
      end
    ) {
      filter.createdAt = {
        $gte: start,
        $lte: end,
      };
    }


    // =======================================================
    // DEBUG
    // =======================================================

    console.log(
      "=========================================="
    );

    console.log(
      "SURVEY EXPORT"
    );

    console.log(
      "USER:",
      user.userId
    );

    console.log(
      "ROLE:",
      user.role
    );

    console.log(
      "TEAM:",
      (user as any).teamId
    );

    console.log(
      "REQUESTED TEAM:",
      requestedTeamId
    );

    console.log(
      "FILTER:",
      JSON.stringify(
        filter,
        null,
        2
      )
    );

    console.log(
      "=========================================="
    );


    // =======================================================
    // GET SURVEY DATA
    // =======================================================

    const items =
      await SurveyData.find(
        filter
      )
        .sort({
          createdAt: -1,
        })
        .lean();


    // =======================================================
    // WORKBOOK
    // =======================================================

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      "Survey Data Module";

    workbook.created =
      new Date();

    workbook.modified =
      new Date();


    // =======================================================
    // SUMMARY SHEET
    // =======================================================

    // const summary =
    //   workbook.addWorksheet(
    //     "Summary"
    //   );

    const worksheet =
      workbook.addWorksheet(
        "Data"
      );

    const summary =
      workbook.addWorksheet(
        "Summary"
      );

    summary.columns = [
      {
        header: "Field",
        key: "field",
        width: 30,
      },
      {
        header: "Value",
        key: "value",
        width: 50,
      },
    ];

    summary.mergeCells(
      "A1:B1"
    );

    const titleCell =
      summary.getCell(
        "A1"
      );

    titleCell.value =
      "SURVEY DATA EXPORT";

    titleCell.font = {
      bold: true,
      size: 20,
    };

    titleCell.alignment = {
      horizontal:
        "center",
      vertical:
        "middle",
    };

    summary.getRow(
      1
    ).height = 35;


    const periodText =
      range === "custom"
        ? `${startDate} → ${endDate}`
        : range === "weekly"
          ? "Current Week"
          : range === "monthly"
            ? "Current Month"
            : range === "today"
              ? "Today"
              : "All Data";


    summary.addRow([]);

    summary.addRow({
      field:
        "Report Period",
      value:
        periodText,
    });

    summary.addRow({
      field:
        "Category",
      value:
        category || "ALL",
    });

    summary.addRow({
      field:
        "Role",
      value:
        user.role || role,
    });

    summary.addRow({
      field:
        "Total Records",
      value:
        items.length,
    });

    summary.addRow({
      field:
        "Generated At",
      value:
        new Date(),
    });


    summary.getColumn(
      1
    ).font = {
      bold: true,
    };


    // =======================================================
    // DATA SHEET
    // =======================================================

    // const worksheet =
    //   workbook.addWorksheet(
    //     "Data"
    //   );

    const allFields =
      new Set<string>();


    // -------------------------------------------------------
    // COLLECT TOP LEVEL + data.* FIELDS
    // -------------------------------------------------------

    items.forEach(
      (item: any) => {
        Object.keys(
          item
        ).forEach(
          (key) => {
            if (
              key !== "_id"
            ) {
              allFields.add(
                key
              );
            }
          }
        );


        const dataObj =
          item.data instanceof Map
            ? Object.fromEntries(
              item.data
            )
            : item.data ||
            {};


        if (
          dataObj &&
          typeof dataObj ===
          "object"
        ) {
          Object.keys(
            dataObj
          ).forEach(
            (key) => {
              allFields.add(
                `data.${key}`
              );
            }
          );
        }
      }
    );


    const fields =
      Array.from(
        allFields
      );


    // -------------------------------------------------------
    // COLUMNS
    // -------------------------------------------------------

    worksheet.columns =
      fields.map(
        (field) => ({
          header:
            field,
          key:
            field,
          width: 20,
        })
      );


    // -------------------------------------------------------
    // ROWS
    // -------------------------------------------------------

    items.forEach(
      (item: any) => {
        const row: Record<
          string,
          any
        > = {};


        fields.forEach(
          (field) => {
            if (
              !field.startsWith(
                "data."
              )
            ) {
              row[field] =
                excelValue(
                  item[field]
                );
            }
          }
        );


        const dataObj =
          item.data instanceof Map
            ? Object.fromEntries(
              item.data
            )
            : item.data ||
            {};


        Object.entries(
          dataObj
        ).forEach(
          ([
            key,
            value,
          ]) => {
            row[
              `data.${key}`
            ] =
              excelValue(
                value
              );
          }
        );


        worksheet.addRow(
          row
        );
      }
    );


    // =======================================================
    // HEADER
    // =======================================================

    const headerRow =
      worksheet.getRow(
        1
      );

    headerRow.height =
      32;

    headerRow.eachCell(
      (cell) => {
        cell.font = {
          bold: true,
          size: 11,
        };

        cell.alignment = {
          vertical:
            "middle",
          horizontal:
            "center",
          wrapText: true,
        };

        cell.border = {
          top: {
            style: "thin",
          },
          bottom: {
            style: "thin",
          },
          left: {
            style: "thin",
          },
          right: {
            style: "thin",
          },
        };
      }
    );


    // =======================================================
    // DATA STYLE
    // =======================================================

    worksheet.eachRow(
      (
        row,
        rowNumber
      ) => {
        if (
          rowNumber === 1
        ) {
          return;
        }

        row.height =
          22;

        row.eachCell(
          (cell) => {
            cell.alignment = {
              vertical:
                "middle",
              wrapText: true,
            };

            cell.border = {
              bottom: {
                style: "hair",
              },
            };

            if (
              cell.value instanceof
              Date
            ) {
              cell.numFmt =
                "dd-mmm-yyyy hh:mm:ss";
            }
          }
        );
      }
    );


    // =======================================================
    // FILTER
    // =======================================================

    if (
      fields.length > 0 &&
      items.length > 0
    ) {
      worksheet.autoFilter = {
        from: "A1",
        to: {
          row:
            items.length + 1,
          column:
            fields.length,
        },
      };
    }


    // =======================================================
    // FREEZE HEADER
    // =======================================================

    worksheet.views = [
      {
        state:
          "frozen",
        ySplit: 1,
      },
    ];


    // =======================================================
    // COLUMN WIDTH
    // =======================================================

    fields.forEach(
      (
        field,
        index
      ) => {
        const column =
          worksheet.getColumn(
            index + 1
          );

        let maxLength =
          field.length;


        items.forEach(
          (item: any) => {
            let value =
              "";

            if (
              field.startsWith(
                "data."
              )
            ) {
              const key =
                field.replace(
                  "data.",
                  ""
                );

              const dataObj =
                item.data instanceof Map
                  ? Object.fromEntries(
                    item.data
                  )
                  : item.data ||
                  {};

              value =
                dataObj[
                key
                ] ??
                "";
            } else {
              value =
                item[field] ??
                "";
            }

            maxLength =
              Math.max(
                maxLength,
                String(
                  value
                ).length
              );
          }
        );


        column.width =
          Math.min(
            Math.max(
              maxLength + 2,
              12
            ),
            40
          );
      }
    );


    // =======================================================
    // PRINT
    // =======================================================

    worksheet.pageSetup = {
      orientation:
        "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    worksheet.pageSetup.printTitlesRow =
      "1:1";


    // =======================================================
    // CREATE XLSX
    // =======================================================

    const buffer =
      await workbook.xlsx.writeBuffer();


    const filename =
      `survey-${role}-${category || "all"}-${range || "all"}-${Date.now()}.xlsx`;

    // AUDIT LOG
    await createAuditLog({
      userId: user.userId,
      action: "EXPORT",
      module: "Survey",
      description: `Exported survey data XLSX report (${category || "All categories"}, ${range || "custom/all"})`,
      entityType: "SurveyData",
      metadata: {
        category: category || "all",
        range: range || "all",
        startDate: startDate || null,
        endDate: endDate || null,
        teamId: requestedTeamId || null,
        totalRecords: items.length,
      },
    });


    return new NextResponse(
      buffer,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename="${filename}"`,

          "Content-Length":
            buffer.byteLength.toString(),

          "Cache-Control":
            "no-store",
        },
      }
    );

  } catch (error) {
    console.error(
      "Survey export error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Export failed",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}