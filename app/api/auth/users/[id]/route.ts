// // app/api/auth/users/[id]/route.ts

// import { NextResponse } from "next/server";

// import { connectDB } from "@/config/db";
// import Auth from "@/models/Auth";
// import { getCurrentUser } from "@/lib/getuser";

// type Params = {
//   params: Promise<{ id: string }>;
// };

// const USER_MANAGEMENT_ROLES = [
//   "admin",
//   "hr",
//   "team-lead",
// ] as const;

// const ALL_USER_ROLES = [
//   "admin",
//   "hr",
//   "team-lead",
//   "survey-tester",
//   "user",
// ] as const;


// /* =========================================================
//    AUTHORIZATION HELPER
// ========================================================= */

// async function getAuthorizedUser() {
//   const user = await getCurrentUser();

//   console.log("===== USER MANAGEMENT AUTH =====");
//   console.log(user);

//   // Not logged in
//   if (!user?.userId) {
//     return {
//       user: null,
//       response: NextResponse.json(
//         {
//           success: false,
//           message: "Unauthorized",
//         },
//         { status: 401 }
//       ),
//     };
//   }

//   // Logged in but wrong role
//   if (
//     !USER_MANAGEMENT_ROLES.includes(
//       user.role as (typeof USER_MANAGEMENT_ROLES)[number]
//     )
//   ) {
//     return {
//       user: null,
//       response: NextResponse.json(
//         {
//           success: false,
//           message: "Forbidden",
//         },
//         { status: 403 }
//       ),
//     };
//   }

//   return {
//     user,
//     response: null,
//   };
// }


// /* =========================================================
//    GET SINGLE USER
// ========================================================= */

// export async function GET(
//   _req: Request,
//   { params }: Params
// ) {
//   try {
//     const auth = await getAuthorizedUser();

//     if (!auth.user) {
//       return auth.response;
//     }

//     const { id } = await params;

//     if (!id) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "User ID is required",
//         },
//         { status: 400 }
//       );
//     }

//     await connectDB();

//     const user = await Auth.findById(id)
//       .select("-password")
//       .lean();

//     if (!user) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "User not found",
//         },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       data: user,
//     });

//   } catch (error: any) {
//     console.error(
//       "GET /api/auth/users/[id] ERROR:",
//       error
//     );

//     return NextResponse.json(
//       {
//         success: false,
//         message:
//           error?.message || "Failed to fetch user",
//       },
//       { status: 500 }
//     );
//   }
// }


// /* =========================================================
//    PATCH UPDATE USER
// ========================================================= */

// export async function PATCH(
//   req: Request,
//   { params }: Params
// ) {
//   try {
//     const auth = await getAuthorizedUser();

//     if (!auth.user) {
//       return auth.response;
//     }

//     const authUser = auth.user;

//     const { id } = await params;

//     if (!id) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "User ID is required",
//         },
//         { status: 400 }
//       );
//     }

//     const body = await req.json();

//     await connectDB();

//     const allowedFields = [
//       "name",
//       "email",
//       "employeeId",
//       "phoneNumber",
//       "workingShift",
//       "role",
//       "isActive",
//     ];

//     const updateData: Record<string, any> = {};

//     for (const field of allowedFields) {
//       if (body[field] !== undefined) {
//         updateData[field] = body[field];
//       }
//     }

//     // Nothing to update
//     if (Object.keys(updateData).length === 0) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "No valid fields to update",
//         },
//         { status: 400 }
//       );
//     }

//     /* -----------------------------------------
//        ROLE VALIDATION
//     ----------------------------------------- */

//     if (updateData.role !== undefined) {

//       // Only admin can change roles
//       if (authUser.role !== "admin") {
//         return NextResponse.json(
//           {
//             success: false,
//             message: "Only admin can change user roles",
//           },
//           { status: 403 }
//         );
//       }

//       // Validate role
//       if (
//         !ALL_USER_ROLES.includes(
//           updateData.role as (typeof ALL_USER_ROLES)[number]
//         )
//       ) {
//         return NextResponse.json(
//           {
//             success: false,
//             message: "Invalid user role",
//           },
//           { status: 400 }
//         );
//       }
//     }

//     /* -----------------------------------------
//        TRACK WHO UPDATED THE USER
//     ----------------------------------------- */

//     updateData.updatedBy = authUser.userId;

//     const user = await Auth.findByIdAndUpdate(
//       id,
//       {
//         $set: updateData,
//       },
//       {
//         new: true,
//         runValidators: true,
//       }
//     )
//       .select("-password")
//       .lean();

//     if (!user) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "User not found",
//         },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       message: "User updated successfully",
//       data: user,
//     });

//   } catch (error: any) {
//     console.error(
//       "PATCH /api/auth/users/[id] ERROR:",
//       error
//     );

//     return NextResponse.json(
//       {
//         success: false,
//         message:
//           error?.message || "Update failed",
//       },
//       { status: 500 }
//     );
//   }
// }


// /* =========================================================
//    DELETE USER
// ========================================================= */

// export async function DELETE(
//   _req: Request,
//   { params }: Params
// ) {
//   try {
//     const auth = await getAuthorizedUser();

//     if (!auth.user) {
//       return auth.response;
//     }

//     const authUser = auth.user;

//     // Only admin can delete users
//     if (authUser.role !== "admin") {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Only admin can delete users",
//         },
//         { status: 403 }
//       );
//     }

//     const { id } = await params;

//     if (!id) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "User ID is required",
//         },
//         { status: 400 }
//       );
//     }

//     // Optional but recommended:
//     // Prevent admin from deleting their own account.
//     if (String(authUser.userId) === String(id)) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "You cannot delete your own account",
//         },
//         { status: 400 }
//       );
//     }

//     await connectDB();

//     const user = await Auth.findByIdAndDelete(id);

//     if (!user) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "User not found",
//         },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       message: "User deleted successfully",
//     });

//   } catch (error: any) {
//     console.error(
//       "DELETE /api/auth/users/[id] ERROR:",
//       error
//     );

//     return NextResponse.json(
//       {
//         success: false,
//         message:
//           error?.message || "Delete failed",
//       },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import { getCurrentUser } from "@/lib/getuser";

/* =========================================================
   TYPES
========================================================= */

type Params = {
  params: Promise<{ id: string }>;
};

/* =========================================================
   ROLES
========================================================= */

// Roles allowed to access User Management
const USER_MANAGEMENT_ROLES = [
  "admin",
  "hr",
  "team-lead",
] as const;

// ALL roles supported by Auth schema + frontend
const ALL_USER_ROLES = [
  "admin",
  "hr",
  "team-lead",
  "survey-tester",
  "senior-teamlead",
  "data-quality-analyst",
] as const;

type UserRole = (typeof ALL_USER_ROLES)[number];

/* =========================================================
   AUTHORIZATION HELPER
========================================================= */

async function getAuthorizedUser() {
  const user = await getCurrentUser();

  console.log("===== USER MANAGEMENT AUTH =====");
  console.log(user);

  // -------------------------------------------------------
  // Authentication
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // Authorization
  // -------------------------------------------------------

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
   VALIDATE USER ID
========================================================= */

function validateUserId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
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

    if (!validateUserId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await Auth.findById(id)
      .select("-password -emailVerificationOtp -resetPasswordOTP")
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

    // -------------------------------------------------------
    // Validate ID
    // -------------------------------------------------------

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 }
      );
    }

    if (!validateUserId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // Parse body
    // -------------------------------------------------------

    let body: Record<string, any>;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // -------------------------------------------------------
    // Allowed fields
    // -------------------------------------------------------

    const allowedFields = [
      "name",
      "email",
      "employeeId",
      "phoneNumber",
      "workingShift",
      "role",
      "isActive",
    ] as const;

    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // -------------------------------------------------------
    // Nothing to update
    // -------------------------------------------------------

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid fields to update",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       FIELD VALIDATION
    ===================================================== */

    // -------------------------------------------------------
    // Name
    // -------------------------------------------------------

    if (updateData.name !== undefined) {
      if (
        typeof updateData.name !== "string" ||
        !updateData.name.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Name is required",
          },
          { status: 400 }
        );
      }

      updateData.name = updateData.name.trim();
    }

    // -------------------------------------------------------
    // Email
    // -------------------------------------------------------

    if (updateData.email !== undefined) {
      if (
        typeof updateData.email !== "string" ||
        !updateData.email.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Email is required",
          },
          { status: 400 }
        );
      }

      updateData.email = updateData.email
        .trim()
        .toLowerCase();
    }

    // -------------------------------------------------------
    // Working Shift
    // -------------------------------------------------------

    if (updateData.workingShift !== undefined) {
      if (
        updateData.workingShift !== "day" &&
        updateData.workingShift !== "night"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid working shift",
          },
          { status: 400 }
        );
      }
    }

    // -------------------------------------------------------
    // Active Status
    // -------------------------------------------------------

    if (updateData.isActive !== undefined) {
      if (typeof updateData.isActive !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            message: "isActive must be a boolean",
          },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       ROLE VALIDATION
    ===================================================== */

    if (updateData.role !== undefined) {

      // Only ADMIN can change roles
      if (authUser.role !== "admin") {
        return NextResponse.json(
          {
            success: false,
            message: "Only admin can change user roles",
          },
          { status: 403 }
        );
      }

      // Validate against ALL schema roles
      if (
        !ALL_USER_ROLES.includes(
          updateData.role as UserRole
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid user role",
            allowedRoles: ALL_USER_ROLES,
          },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       EMAIL DUPLICATE CHECK
    ===================================================== */

    if (updateData.email !== undefined) {
      const existingEmail = await Auth.findOne({
        email: updateData.email,
        _id: { $ne: id },
      })
        .select("_id")
        .lean();

      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "Email is already registered",
          },
          { status: 409 }
        );
      }
    }

    /* =====================================================
       EMPLOYEE ID DUPLICATE CHECK
    ===================================================== */

    if (updateData.employeeId !== undefined) {
      const employeeId =
        typeof updateData.employeeId === "string"
          ? updateData.employeeId.trim()
          : updateData.employeeId;

      updateData.employeeId = employeeId || undefined;

      if (employeeId) {
        const existingEmployee = await Auth.findOne({
          employeeId,
          _id: { $ne: id },
        })
          .select("_id")
          .lean();

        if (existingEmployee) {
          return NextResponse.json(
            {
              success: false,
              message: "Employee ID is already registered",
            },
            { status: 409 }
          );
        }
      }
    }

    /* =====================================================
       PHONE DUPLICATE CHECK
    ===================================================== */

    if (updateData.phoneNumber !== undefined) {
      const phoneNumber =
        typeof updateData.phoneNumber === "string"
          ? updateData.phoneNumber.trim()
          : updateData.phoneNumber;

      updateData.phoneNumber = phoneNumber || undefined;

      if (phoneNumber) {
        const existingPhone = await Auth.findOne({
          phoneNumber,
          _id: { $ne: id },
        })
          .select("_id")
          .lean();

        if (existingPhone) {
          return NextResponse.json(
            {
              success: false,
              message: "Phone number is already registered",
            },
            { status: 409 }
          );
        }
      }
    }

    /* =====================================================
       TRACK WHO UPDATED THE USER
    ===================================================== */

    updateData.updatedBy = authUser.userId;

    /* =====================================================
       UPDATE USER
    ===================================================== */

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
      .select(
        "-password -emailVerificationOtp -resetPasswordOTP"
      )
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

    // Mongo duplicate key
    if (error?.code === 11000) {
      const duplicateField =
        Object.keys(error?.keyPattern || {})[0];

      return NextResponse.json(
        {
          success: false,
          message: duplicateField
            ? `${duplicateField} is already registered`
            : "Duplicate value already exists",
        },
        { status: 409 }
      );
    }

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

    // -------------------------------------------------------
    // Only admin can delete
    // -------------------------------------------------------

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

    if (!validateUserId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // Prevent self deletion
    // -------------------------------------------------------

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