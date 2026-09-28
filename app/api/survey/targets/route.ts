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

function normalizeRole(role: unknown): string {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

// ============================================================
// ADMIN / HR
// ============================================================

function isAdminOrHR(role: unknown) {
  const normalized = normalizeRole(role);

  return (
    normalized === "admin" ||
    normalized === "hr"
  );
}

// ============================================================
// GET
// GET USERS + FIRST/SECOND TARGET
//
// Month is no longer a UI filter. The API simply uses the
// current month when month is not supplied.
// ============================================================

export async function GET(
  request: NextRequest
) {
  try {
    await connectDB();

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

    const role = normalizeRole(
      currentUser.role
    );

    if (!isAdminOrHR(role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only Admin or HR can manage targets",
        },
        { status: 403 }
      );
    }

    const { searchParams } =
      new URL(request.url);

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
        { status: 400 }
      );
    }

    // ========================================================
    // USERS
    // ========================================================

    const users = await Auth.find({
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
          "_id userId month firstTarget secondTarget"
        )
        .lean();

    // ========================================================
    // TARGET MAP
    // ========================================================

    const targetMap =
      new Map<string, any>();

    for (const item of targets) {
      targetMap.set(
        String(item.userId),
        item
      );
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    const result = users.map(
      (user: any) => {
        const target =
          targetMap.get(
            String(user._id)
          );

        return {
          _id: String(user._id),

          name:
            user.name ||
            user.email ||
            "Unknown User",

          email: user.email || "",

          role: user.role || "",

          teamId: user.teamId
            ? String(user.teamId)
            : null,

          firstTarget: Number(
            target?.firstTarget ?? 0
          ),

          secondTarget: Number(
            target?.secondTarget ?? 0
          ),

          targetId: target?._id
            ? String(target._id)
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
      { status: 500 }
    );
  }
}

// ============================================================
// POST
// CREATE / UPDATE TARGET
//
// Supports BOTH:
//
// 1. Single user:
//    { userId, month, firstTarget, secondTarget }
//
// 2. Multiple users:
//    {
//      userIds: [...],
//      month,
//      firstTarget,
//      secondTarget
//    }
//
// The same first/second target is assigned to every user.
// ============================================================

export async function POST(
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
        { status: 401 }
      );
    }

    const role = normalizeRole(
      currentUser.role
    );

    if (!isAdminOrHR(role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only Admin or HR can assign targets",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // BODY
    // ========================================================

    const body = await request.json();

    const {
      userId,
      userIds,
      month,
      firstTarget,
      secondTarget,
    } = body;

    // ========================================================
    // NORMALIZE USER IDS
    // ========================================================

    const normalizedUserIds: string[] =
      Array.isArray(userIds)
        ? userIds
            .map((id: unknown) =>
              String(id)
            )
            .filter(Boolean)
        : userId
          ? [String(userId)]
          : [];

    // Remove duplicate user IDs
    const uniqueUserIds = [
      ...new Set(normalizedUserIds),
    ];

    if (uniqueUserIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "At least one user is required",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // VALIDATE USER IDS
    // ========================================================

    const invalidUserId =
      uniqueUserIds.find(
        (id) =>
          !mongoose.Types.ObjectId.isValid(
            id
          )
      );

    if (invalidUserId) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid userId: ${invalidUserId}`,
        },
        { status: 400 }
      );
    }

    // ========================================================
    // MONTH
    //
    // No month selector is required by the UI.
    // If omitted, current month is used.
    // ========================================================

    const targetMonth =
      month ||
      new Date()
        .toISOString()
        .slice(0, 7);

    if (
      !/^\d{4}-\d{2}$/.test(
        targetMonth
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Month must be YYYY-MM",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // VALIDATE FIRST TARGET
    // ========================================================

    const numericFirstTarget =
      Number(firstTarget);

    if (
      firstTarget === "" ||
      firstTarget === null ||
      firstTarget === undefined ||
      !Number.isFinite(
        numericFirstTarget
      ) ||
      numericFirstTarget < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid first target",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // VALIDATE SECOND TARGET
    // ========================================================

    const numericSecondTarget =
      Number(secondTarget);

    if (
      secondTarget === "" ||
      secondTarget === null ||
      secondTarget === undefined ||
      !Number.isFinite(
        numericSecondTarget
      ) ||
      numericSecondTarget < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid second target",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // CHECK USERS
    // ========================================================

    const users =
      await Auth.find({
        _id: {
          $in: uniqueUserIds,
        },

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

    if (
      users.length !==
      uniqueUserIds.length
    ) {
      const foundIds = new Set(
        users.map((user: any) =>
          String(user._id)
        )
      );

      const missingIds =
        uniqueUserIds.filter(
          (id) =>
            !foundIds.has(id)
        );

      return NextResponse.json(
        {
          success: false,
          message:
            "One or more users were not found or are inactive",
          missingUserIds:
            missingIds,
        },
        { status: 404 }
      );
    }

    // ========================================================
    // CREATE / UPDATE TARGETS
    // ========================================================

    const savedTargets: any[] = [];

    for (const id of uniqueUserIds) {
      const objectId =
        new mongoose.Types.ObjectId(id);

      let targetRecord =
        await SurveyTarget.findOne({
          userId: objectId,
          month: targetMonth,
        });

      if (targetRecord) {
        targetRecord.firstTarget =
          numericFirstTarget;

        targetRecord.secondTarget =
          numericSecondTarget;

        targetRecord.updatedBy =
          new mongoose.Types.ObjectId(
            currentUser.userId
          );

        await targetRecord.save();
      } else {
        targetRecord =
          await SurveyTarget.create({
            userId: objectId,

            month: targetMonth,

            firstTarget:
              numericFirstTarget,

            secondTarget:
              numericSecondTarget,

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

      const user = users.find(
        (item: any) =>
          String(item._id) === id
      );

      savedTargets.push({
        id: String(
          targetRecord._id
        ),

        userId: id,

        userName:
          user?.name ||
          user?.email ||
          "Unknown User",

        month:
          targetRecord.month,

        firstTarget: Number(
          targetRecord.firstTarget
        ),

        secondTarget: Number(
          targetRecord.secondTarget
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
          uniqueUserIds.length === 1
            ? "Target saved successfully"
            : `Targets assigned successfully to ${uniqueUserIds.length} users`,

        count:
          savedTargets.length,

        targets:
          savedTargets,

        // Keep single target response
        // for compatibility with existing UI.
        target:
          savedTargets[0] || null,
      },
      { status: 200 }
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
      { status: 500 }
    );
  }
}
