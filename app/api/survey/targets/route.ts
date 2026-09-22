import {
  NextRequest,
  NextResponse,
} from "next/server";

import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import SurveyTarget from "@/models/SurveyTarget";
import { getCurrentUser } from "@/lib/getuser";


// ============================================================
// NORMALIZE ROLE
// ============================================================

function normalizeRole(
  role: unknown
): string {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}


// ============================================================
// ADMIN / HR
// ============================================================

function isAdminOrHR(
  role: unknown
) {
  const normalized =
    normalizeRole(role);

  return (
    normalized === "admin" ||
    normalized === "hr"
  );
}


// ============================================================
// GET
// GET USERS + THEIR TARGET
// ============================================================

export async function GET(
  request: NextRequest
) {
  try {
    await connectDB();

    const currentUser =
      await getCurrentUser();

    if (!currentUser?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const role =
      normalizeRole(
        currentUser.role
      );

    if (!isAdminOrHR(role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only Admin or HR can manage targets",
        },
        {
          status: 403,
        }
      );
    }

    const {
      searchParams,
    } = new URL(request.url);

    const month =
      searchParams.get("month") ||
      new Date()
        .toISOString()
        .slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid month. Use YYYY-MM",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // USERS
    // ========================================================

    const users =
      await Auth.find({
        isDeleted: {
          $ne: true,
        },

        isActive: {
          $ne: false,
        },
      })
        .select(
          "_id name email role teamId"
        )
        .sort({
          name: 1,
        })
        .lean();

    // ========================================================
    // TARGETS
    // ========================================================

    const targets =
      await SurveyTarget.find({
        month,
      })
        .select(
          "_id userId month target"
        )
        .lean();

    // ========================================================
    // TARGET MAP
    // ========================================================

    const targetMap =
      new Map<
        string,
        any
      >();

    for (const item of targets) {
      targetMap.set(
        String(item.userId),
        item
      );
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    const result =
      users.map(
        (user: any) => {
          const target =
            targetMap.get(
              String(user._id)
            );

          return {
            _id:
              String(user._id),

            name:
              user.name ||
              user.email ||
              "Unknown User",

            email:
              user.email || "",

            role:
              user.role || "",

            teamId:
              user.teamId
                ? String(
                    user.teamId
                  )
                : null,

            target:
              Number(
                target?.target ||
                  0
              ),

            targetId:
              target?._id
                ? String(
                    target._id
                  )
                : null,
          };
        }
      );

    return NextResponse.json({
      success: true,

      month,

      users: result,
    });

  } catch (error: any) {

    console.error(
      "GET TARGET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to load targets",
      },
      {
        status: 500,
      }
    );
  }
}


// ============================================================
// POST
// CREATE / UPDATE TARGET
// ============================================================

export async function POST(
  request: NextRequest
) {
  try {
    await connectDB();

    const currentUser =
      await getCurrentUser();

    console.log(
      "CURRENT USER:",
      currentUser
    );

    if (!currentUser?.userId) {
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
        currentUser.role
      );

    console.log(
      "CURRENT ROLE:",
      role
    );

    // ========================================================
    // ADMIN / HR
    // ========================================================

    if (!isAdminOrHR(role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only Admin or HR can assign targets",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // BODY
    // ========================================================

    const body =
      await request.json();

    console.log(
      "TARGET BODY:",
      body
    );

    const {
      userId,
      month,
      target,
    } = body;

    // ========================================================
    // VALIDATE USER
    // ========================================================

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "userId is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid userId",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // VALIDATE MONTH
    // ========================================================

    if (
      !month ||
      !/^\d{4}-\d{2}$/.test(
        month
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Month must be YYYY-MM",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // VALIDATE TARGET
    // ========================================================

    const numericTarget =
      Number(target);

    if (
      target === "" ||
      target === null ||
      target === undefined ||
      !Number.isFinite(
        numericTarget
      ) ||
      numericTarget < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid target",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // CHECK USER
    // ========================================================

    const user =
      await Auth.findOne({
        _id: userId,

        isDeleted: {
          $ne: true,
        },

        isActive: {
          $ne: false,
        },
      })
        .select(
          "_id name email role"
        )
        .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User not found or inactive",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // FIND EXISTING TARGET
    // ========================================================

    let targetRecord =
      await SurveyTarget.findOne({
        userId:
          new mongoose.Types.ObjectId(
            userId
          ),

        month,
      });

    // ========================================================
    // UPDATE EXISTING
    // ========================================================

    if (targetRecord) {

      targetRecord.target =
        numericTarget;

      targetRecord.updatedBy =
        new mongoose.Types.ObjectId(
          currentUser.userId
        );

      await targetRecord.save();

    }

    // ========================================================
    // CREATE NEW
    // ========================================================

    else {

      targetRecord =
        await SurveyTarget.create({
          userId:
            new mongoose.Types.ObjectId(
              userId
            ),

          month,

          target:
            numericTarget,

          createdBy:
            new mongoose.Types.ObjectId(
              currentUser.userId
            ),

          updatedBy:
            new mongoose.Types.ObjectId(
              currentUser.userId
            ),
        });
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        message:
          targetRecord
            ? "Target saved successfully"
            : "Target created successfully",

        target: {
          id:
            String(
              targetRecord._id
            ),

          userId:
            String(
              targetRecord.userId
            ),

          userName:
            user.name ||
            user.email,

          month:
            targetRecord.month,

          target:
            Number(
              targetRecord.target
            ),
        },
      },
      {
        status: 200,
      }
    );

  } catch (error: any) {

    console.error(
      "POST TARGET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to save target",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error?.stack
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}