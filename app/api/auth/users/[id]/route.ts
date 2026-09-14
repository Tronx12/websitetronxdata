// app/api/auth/users/[id]/route.ts

import { NextResponse } from "next/server";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import { getCurrentUser } from "@/lib/getuser";

type Params = {
  params: Promise<{ id: string }>;
};

const USER_MANAGEMENT_ROLES = [
  "admin",
  "hr",
  "team-lead",
] as const;

const ALL_USER_ROLES = [
  "admin",
  "hr",
  "team-lead",
  "survey-tester",
  "user",
] as const;


/* =========================================================
   AUTHORIZATION HELPER
========================================================= */

async function getAuthorizedUser() {
  const user = await getCurrentUser();

  console.log("===== USER MANAGEMENT AUTH =====");
  console.log(user);

  // Not logged in
  if (!user?.userId) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      ),
    };
  }

  // Logged in but wrong role
  if (
    !USER_MANAGEMENT_ROLES.includes(
      user.role as (typeof USER_MANAGEMENT_ROLES)[number]
    )
  ) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    response: null,
  };
}


/* =========================================================
   GET SINGLE USER
========================================================= */

export async function GET(
  _req: Request,
  { params }: Params
) {
  try {
    const auth = await getAuthorizedUser();

    if (!auth.user) {
      return auth.response;
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await Auth.findById(id)
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });

  } catch (error: any) {
    console.error(
      "GET /api/auth/users/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Failed to fetch user",
      },
      { status: 500 }
    );
  }
}


/* =========================================================
   PATCH UPDATE USER
========================================================= */

export async function PATCH(
  req: Request,
  { params }: Params
) {
  try {
    const auth = await getAuthorizedUser();

    if (!auth.user) {
      return auth.response;
    }

    const authUser = auth.user;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    await connectDB();

    const allowedFields = [
      "name",
      "email",
      "phoneNumber",
      "role",
    ];

    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Nothing to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid fields to update",
        },
        { status: 400 }
      );
    }

    /* -----------------------------------------
       ROLE VALIDATION
    ----------------------------------------- */

    if (updateData.role !== undefined) {

      // Only admin can change roles
      if (authUser.role !== "admin") {
        return NextResponse.json(
          {
            success: false,
            message: "Only admin can change user roles",
          },
          { status: 403 }
        );
      }

      // Validate role
      if (
        !ALL_USER_ROLES.includes(
          updateData.role as (typeof ALL_USER_ROLES)[number]
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid user role",
          },
          { status: 400 }
        );
      }
    }

    /* -----------------------------------------
       TRACK WHO UPDATED THE USER
    ----------------------------------------- */

    updateData.updatedBy = authUser.userId;

    const user = await Auth.findByIdAndUpdate(
      id,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });

  } catch (error: any) {
    console.error(
      "PATCH /api/auth/users/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Update failed",
      },
      { status: 500 }
    );
  }
}


/* =========================================================
   DELETE USER
========================================================= */

export async function DELETE(
  _req: Request,
  { params }: Params
) {
  try {
    const auth = await getAuthorizedUser();

    if (!auth.user) {
      return auth.response;
    }

    const authUser = auth.user;

    // Only admin can delete users
    if (authUser.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Only admin can delete users",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 }
      );
    }

    // Optional but recommended:
    // Prevent admin from deleting their own account.
    if (String(authUser.userId) === String(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot delete your own account",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await Auth.findByIdAndDelete(id);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });

  } catch (error: any) {
    console.error(
      "DELETE /api/auth/users/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Delete failed",
      },
      { status: 500 }
    );
  }
}