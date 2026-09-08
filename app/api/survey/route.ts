import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import {
  parseBulkPaste,
} from "@/lib/parseSurveyBulk";
import { SurveyCategory } from "@/lib/survey-fields";

const VALID_CATEGORIES: SurveyCategory[] = [
  "B2B",
  "B2H",
  "B2C",
];

export async function POST(
  req: NextRequest
) {
  try {
    await connectDB();

    const body = await req.json();

    const category = body?.category;
    const paste = body?.paste;
    const createdBy = body?.createdBy;

    // --------------------------------------------------
    // Validate category
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Validate paste
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Fallback category
    // --------------------------------------------------

    const fallbackCategory: SurveyCategory =
      category &&
      VALID_CATEGORIES.includes(category)
        ? category
        : "B2C";

    // --------------------------------------------------
    // Parse
    // --------------------------------------------------

    const {
      records,
      errors,
    } = parseBulkPaste(
      paste,
      fallbackCategory
    );

    console.log(
      "========== PARSED RECORDS =========="
    );

    console.dir(records, {
      depth: null,
    });

    console.log(
      "========== PARSER ERRORS =========="
    );

    console.log(errors);

    // --------------------------------------------------
    // No records
    // --------------------------------------------------

    if (records.length === 0) {
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

    // --------------------------------------------------
    // IMPORTANT DEBUG
    // --------------------------------------------------

    console.log(
      "========== MONGOOSE DATA TYPE =========="
    );

    console.log(
      SurveyData.schema.path("data")?.instance
    );

    // Expected:
    //
    // Mixed
    //

    // --------------------------------------------------
    // Validate createdBy
    // --------------------------------------------------

    let normalizedCreatedBy:
      | mongoose.Types.ObjectId
      | null = null;

    if (
      createdBy &&
      mongoose.Types.ObjectId.isValid(
        createdBy
      )
    ) {
      normalizedCreatedBy =
        new mongoose.Types.ObjectId(
          createdBy
        );
    }

    // --------------------------------------------------
    // Batch ID
    // --------------------------------------------------

    const batchId =
      records.length > 1
        ? new mongoose.Types.ObjectId().toString()
        : null;

    // --------------------------------------------------
    // Build documents
    // --------------------------------------------------

    const documents = records.map((record) => ({
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

      data: record.data || {},

      rawPaste:
        record.rawBlock || paste,

      batchId,

      createdBy:
        normalizedCreatedBy,
    }));

    console.log(
      "========== DOCUMENTS TO INSERT =========="
    );

    console.dir(documents, {
      depth: null,
    });

    // --------------------------------------------------
    // Insert
    // --------------------------------------------------

    const docs =
      await SurveyData.insertMany(
        documents
      );

    // --------------------------------------------------
    // Response
    // --------------------------------------------------

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
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "===================================="
    );

    console.error(
      "SURVEY POST ERROR"
    );

    console.error(
      "===================================="
    );

    console.error(
      "Name:",
      error?.name
    );

    console.error(
      "Message:",
      error?.message
    );

    console.error(
      "Code:",
      error?.code
    );

    console.error(
      "Errors:",
      error?.errors
    );

    console.error(
      "Stack:",
      error?.stack
    );

    // --------------------------------------------------
    // Mongoose validation error
    // --------------------------------------------------

    if (
      error?.name ===
      "ValidationError"
    ) {
      const validationErrors =
        Object.entries(
          error.errors || {}
        ).map(
          ([
            field,
            err,
          ]: [string, any]) => ({
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

          error:
            error.message,

          validationErrors,
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // Cast error
    // --------------------------------------------------

    if (
      error?.name === "CastError"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            `Invalid value for ${error.path}`,

          error:
            error.message,

          path:
            error.path,

          value:
            error.value,
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // Duplicate key
    // --------------------------------------------------

    if (
      error?.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Duplicate survey record",

          error:
            error.message,

          keyValue:
            error.keyValue,
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------
    // Generic error
    // --------------------------------------------------

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
          error?.code ||
          null,
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// GET
// ======================================================

export async function GET(
  req: NextRequest
) {
  try {
    await connectDB();

    const {
      searchParams,
    } = new URL(req.url);

    const category =
      searchParams.get(
        "category"
      );

    const projectNo =
      searchParams.get(
        "projectNo"
      );

    const accountType =
      searchParams.get(
        "accountType"
      );

    const pid =
      searchParams.get("pid");

    const country =
      searchParams.get(
        "country"
      );

    const status =
      searchParams.get(
        "status"
      );

    const sortBy =
      searchParams.get(
        "sortBy"
      ) || "createdAt";

    const sortOrder =
      searchParams.get(
        "sortOrder"
      ) === "asc"
        ? 1
        : -1;

    const search =
      searchParams.get(
        "search"
      ) || "";

    const page = Math.max(
      1,
      parseInt(
        searchParams.get(
          "page"
        ) || "1",
        10
      )
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        parseInt(
          searchParams.get(
            "limit"
          ) || "20",
          10
        )
      )
    );

    const skip =
      (page - 1) * limit;

    const filter: any = {};

    // --------------------------------------------------
    // Filters
    // --------------------------------------------------

    if (
      category &&
      VALID_CATEGORIES.includes(
        category as SurveyCategory
      )
    ) {
      filter.category =
        category;
    }

    if (projectNo) {
      filter.projectNo =
        projectNo;
    }

    if (accountType) {
      filter.accountType =
        accountType.toUpperCase();
    }

    if (pid) {
      filter.pid = pid;
    }

    if (country) {
      filter.country = {
        $regex: country,
        $options: "i",
      };
    }

    if (status) {
      filter.status = {
        $regex: status,
        $options: "i",
      };
    }

    // --------------------------------------------------
    // Search
    // --------------------------------------------------

    if (search.trim()) {
      filter.$or = [
        {
          rawPaste: {
            $regex: search,
            $options: "i",
          },
        },
        {
          pid: {
            $regex: search,
            $options: "i",
          },
        },
        {
          projectNo: {
            $regex: search,
            $options: "i",
          },
        },
        {
          supplierId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          country: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // --------------------------------------------------
    // Query
    // --------------------------------------------------

    const [
      items,
      total,
    ] = await Promise.all([
      SurveyData.find(filter)
        .sort({
          [sortBy]:
            sortOrder,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      SurveyData.countDocuments(
        filter
      ),
    ]);

    // --------------------------------------------------
    // Normalize data
    // --------------------------------------------------

    const data =
      items.map(
        (item: any) => ({
          ...item,

          data:
            item.data || {},
        })
      );

    // --------------------------------------------------
    // Response
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      data,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit
          ),
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
      {
        status: 500,
      }
    );
  }
}