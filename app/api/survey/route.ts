import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import { parseBulkPaste } from "@/lib/parseSurveyBulk";
import { SurveyCategory } from "@/lib/survey-fields";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";

const VALID_CATEGORIES: SurveyCategory[] = [
  "B2B",
  "B2H",
  "B2C",
];

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    /* ============================================
       AUTHENTICATED USER
    ============================================ */

    const currentUser = await getCurrentUser();

    if (!currentUser?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        currentUser.userId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid authenticated user ID",
        },
        { status: 401 }
      );
    }

    const authenticatedUserId =
      new mongoose.Types.ObjectId(
        currentUser.userId
      );

    /* ============================================
       REQUEST
    ============================================ */

    const body = await req.json();

    const category =
      body?.category as
        | SurveyCategory
        | undefined;

    const paste = body?.paste;

    /* ============================================
       CATEGORY
    ============================================ */

    if (
      category &&
      !VALID_CATEGORIES.includes(category)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category must be one of B2B | B2H | B2C",
        },
        { status: 400 }
      );
    }

    /* ============================================
       PASTE
    ============================================ */

    if (
      typeof paste !== "string" ||
      !paste.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Paste data is required",
        },
        { status: 400 }
      );
    }

    const fallbackCategory: SurveyCategory =
      category &&
      VALID_CATEGORIES.includes(category)
        ? category
        : "B2C";

    /* ============================================
       PARSE
    ============================================ */

    const { records, errors } =
      parseBulkPaste(
        paste,
        fallbackCategory
      );

    if (!records.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No valid records found. Use Key: Value lines or separate records with =====.",
          errors,
        },
        { status: 400 }
      );
    }

    /* ============================================
       BATCH ID
    ============================================ */

    const batchId =
      records.length > 1
        ? new mongoose.Types.ObjectId().toString()
        : null;

    /* ============================================
       DOCUMENTS
    ============================================ */

    const documents = records.map(
      (record) => ({
        category: record.category,

        accountType:
          record.accountType || undefined,

        projectNo:
          record.projectNo || undefined,

        panelCode:
          record.panelCode || undefined,

        description:
          record.description || undefined,

        pid:
          record.pid || undefined,

        supplierId:
          record.supplierId || undefined,

        country:
          record.country || undefined,

        ip:
          record.ip || undefined,

        status:
          record.status || undefined,

        data:
          record.data || {},

        rawPaste:
          record.rawBlock || paste,

        batchId,

        // IMPORTANT:
        // Always use authenticated user.
        createdBy:
          authenticatedUserId,
      })
    );

    /* ============================================
       SAVE
    ============================================ */

    const docs =
      await SurveyData.insertMany(
        documents
      );

    /* ============================================
       AUDIT LOG
    ============================================ */

    await createAuditLog({
      userId:
        currentUser.userId,

      action: "UPLOAD",

      module: "Survey",

      description:
        `Uploaded ${docs.length} survey record${
          docs.length === 1
            ? ""
            : "s"
        }`,

      entityType: "SurveyData",

      entityId:
        docs.length === 1
          ? docs[0]._id.toString()
          : batchId || undefined,

      metadata: {
        count: docs.length,

        categories: [
          ...new Set(
            docs.map(
              (doc) => doc.category
            )
          ),
        ],

        batchId,
      },
    });

    /* ============================================
       RESPONSE
    ============================================ */

    return NextResponse.json(
      {
        success: true,

        message:
          docs.length === 1
            ? "1 record saved"
            : `${docs.length} records saved`,

        count: docs.length,

        errors,

        data: docs.map((doc) => {
          const object =
            doc.toObject();

          return {
            ...object,
            data:
              object.data || {},
          };
        }),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "SURVEY POST ERROR:",
      error
    );

    /* ============================================
       VALIDATION
    ============================================ */

    if (
      error?.name ===
      "ValidationError"
    ) {
      const validationErrors =
        Object.entries(
          error.errors || {}
        ).map(
          ([field, err]: [
            string,
            any
          ]) => ({
            field,
            message:
              err?.message ||
              "Validation failed",
            value: err?.value,
            kind: err?.kind,
          })
        );

      return NextResponse.json(
        {
          success: false,
          message:
            "Survey validation failed",
          error: error.message,
          validationErrors,
        },
        { status: 400 }
      );
    }

    /* ============================================
       CAST
    ============================================ */

    if (
      error?.name === "CastError"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Invalid value for ${error.path}`,
          error: error.message,
          path: error.path,
          value: error.value,
        },
        { status: 400 }
      );
    }

    /* ============================================
       DUPLICATE
    ============================================ */

    if (error?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Duplicate survey record",
          error: error.message,
          keyValue:
            error.keyValue,
        },
        { status: 409 }
      );
    }

    /* ============================================
       UNKNOWN
    ============================================ */

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to save survey data",
        error:
          error?.message ||
          String(error),
        name:
          error?.name ||
          "UnknownError",
        code:
          error?.code || null,
      },
      { status: 500 }
    );
  }
}
/* ======================================================
   GET - FETCH SURVEY RECORDS
====================================================== */

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } =
      new URL(req.url);

    const category =
      searchParams.get("category");

    const projectNo =
      searchParams.get("projectNo");

    const accountType =
      searchParams.get("accountType");

    const pid =
      searchParams.get("pid");

    const country =
      searchParams.get("country");

    const status =
      searchParams.get("status");

    const createdBy =
      searchParams.get("createdBy");

    const excludeCreatedBy =
      searchParams.get("excludeCreatedBy");

    const includeUnassigned =
      searchParams.get("includeUnassigned");

    const sortBy =
      searchParams.get("sortBy") ||
      "createdAt";

    const sortOrder =
      searchParams.get("sortOrder") === "asc"
        ? 1
        : -1;

    const search =
      searchParams.get("search") || "";

    const page = Math.max(
      1,
      Number(
        searchParams.get("page") || "1"
      )
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(
          searchParams.get("limit") || "20"
        )
      )
    );

    const skip =
      (page - 1) * limit;

    /* ==================================================
       FILTER
    ================================================== */

    const filter: any = {};

    /* -----------------------------------------------
       Category
    ------------------------------------------------ */

    if (
      category &&
      VALID_CATEGORIES.includes(
        category as SurveyCategory
      )
    ) {
      filter.category = category;
    }

    /* -----------------------------------------------
       Project
    ------------------------------------------------ */

    if (projectNo) {
      filter.projectNo = projectNo;
    }

    /* -----------------------------------------------
       Account type
    ------------------------------------------------ */

    if (accountType) {
      filter.accountType =
        accountType.toUpperCase();
    }

    /* -----------------------------------------------
       PID
    ------------------------------------------------ */

    if (pid) {
      filter.pid = pid;
    }

    /* -----------------------------------------------
       Country
    ------------------------------------------------ */

    if (country) {
      filter.country = {
        $regex: country,
        $options: "i",
      };
    }

    /* -----------------------------------------------
       Status
    ------------------------------------------------ */

    if (status) {
      filter.status = {
        $regex: status,
        $options: "i",
      };
    }

    /* ==================================================
       CREATOR FILTER
    ================================================== */

    if (createdBy) {
      if (
        !mongoose.Types.ObjectId.isValid(
          createdBy
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid createdBy ObjectId",
            createdBy,
          },
          { status: 400 }
        );
      }

      filter.createdBy =
        new mongoose.Types.ObjectId(
          createdBy
        );
    }

    /* -----------------------------------------------
       Exclude creator
    ------------------------------------------------ */

    else if (excludeCreatedBy) {
      if (
        !mongoose.Types.ObjectId.isValid(
          excludeCreatedBy
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid excludeCreatedBy ObjectId",
            excludeCreatedBy,
          },
          { status: 400 }
        );
      }

      const excludedId =
        new mongoose.Types.ObjectId(
          excludeCreatedBy
        );

      if (
        includeUnassigned === "true"
      ) {
        filter.$or = [
          {
            createdBy: null,
          },
          {
            createdBy: {
              $ne: excludedId,
            },
          },
        ];
      } else {
        filter.createdBy = {
          $ne: excludedId,
        };
      }
    }

    /* ==================================================
       SEARCH
    ================================================== */

    if (search.trim()) {
      const searchRegex = {
        $regex: search.trim(),
        $options: "i",
      };

      const searchOr = [
        {
          rawPaste: searchRegex,
        },
        {
          pid: searchRegex,
        },
        {
          projectNo: searchRegex,
        },
        {
          supplierId: searchRegex,
        },
        {
          country: searchRegex,
        },
        {
          accountType: searchRegex,
        },
        {
          status: searchRegex,
        },
      ];

      if (filter.$or) {
        filter.$and = [
          {
            $or: filter.$or,
          },
          {
            $or: searchOr,
          },
        ];

        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    /* ==================================================
       DATABASE QUERY
    ================================================== */

    const [items, total] =
      await Promise.all([
        SurveyData.find(filter)
          .sort({
            [sortBy]: sortOrder,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        SurveyData.countDocuments(
          filter
        ),
      ]);

    /* ==================================================
       RESPONSE
    ================================================== */

    const data = items.map(
      (item: any) => ({
        ...item,
        data: item.data || {},
      })
    );

    return NextResponse.json({
      success: true,

      data,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error(
      "Survey GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch survey data",
        error:
          error?.message ||
          String(error),
      },
      { status: 500 }
    );
  }
}