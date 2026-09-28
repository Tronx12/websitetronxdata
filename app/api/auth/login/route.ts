// // // import { NextRequest, NextResponse } from "next/server";
// // // import bcrypt from "bcryptjs";

// // // import { connectDB } from "@/config/db";
// // // import Auth from "@/models/Auth";
// // // import {
// // //   createAccessToken,
// // //   createRefreshToken,
// // // } from "@/lib/auth";

// // // import { createAuditLog } from "@/lib/auditLog";

// // // export async function POST(req: NextRequest) {
// // //   try {
// // //     await connectDB();

// // //     const body = await req.json();

// // //     const email = body.email?.trim().toLowerCase();
// // //     const password = body.password;

// // //     // ============================================
// // //     // VALIDATE INPUT
// // //     // ============================================
// // //     if (!email || !password) {
// // //       return NextResponse.json(
// // //         {
// // //           success: false,
// // //           message: "Email and password are required",
// // //         },
// // //         { status: 400 }
// // //       );
// // //     }

// // //     // ============================================
// // //     // FIND USER
// // //     // ============================================
// // //     const user = await Auth.findOne({
// // //       email,
// // //     }).select("+password");

// // //     // ============================================
// // //     // USER NOT FOUND
// // //     // ============================================
// // //     if (!user) {
// // //       await createAuditLog({
// // //         action: "LOGIN",
// // //         module: "Authentication",
// // //         description: `Failed login attempt for ${email}`,
// // //         metadata: {
// // //           email,
// // //           reason: "USER_NOT_FOUND",
// // //         },
// // //         ipAddress:
// // //           req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
// // //           req.headers.get("x-real-ip") ||
// // //           null,
// // //         userAgent: req.headers.get("user-agent") || null,
// // //       });

// // //       return NextResponse.json(
// // //         {
// // //           success: false,
// // //           message: "Invalid email or password",
// // //         },
// // //         { status: 401 }
// // //       );
// // //     }

// // //     // ============================================
// // //     // CHECK PASSWORD
// // //     // ============================================
// // //     const passwordMatch = await bcrypt.compare(
// // //       password,
// // //       user.password
// // //     );

// // //     if (!passwordMatch) {
// // //       await createAuditLog({
// // //         userId: user._id.toString(),
// // //         action: "LOGIN",
// // //         module: "Authentication",
// // //         description: `Failed login attempt for ${email}`,
// // //         entityType: "Auth",
// // //         entityId: user._id.toString(),
// // //         metadata: {
// // //           email,
// // //           role: user.role,
// // //           reason: "INVALID_PASSWORD",
// // //         },
// // //         ipAddress:
// // //           req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
// // //           req.headers.get("x-real-ip") ||
// // //           null,
// // //         userAgent: req.headers.get("user-agent") || null,
// // //       });

// // //       return NextResponse.json(
// // //         {
// // //           success: false,
// // //           message: "Invalid email or password",
// // //         },
// // //         { status: 401 }
// // //       );
// // //     }

// // //     // ============================================
// // //     // CHECK EMAIL VERIFICATION
// // //     // ============================================
// // //     if (!user.isEmailVerified) {
// // //       await createAuditLog({
// // //         userId: user._id.toString(),
// // //         action: "LOGIN",
// // //         module: "Authentication",
// // //         description: `Login blocked because email is not verified`,
// // //         entityType: "Auth",
// // //         entityId: user._id.toString(),
// // //         metadata: {
// // //           email: user.email,
// // //           role: user.role,
// // //           reason: "EMAIL_NOT_VERIFIED",
// // //         },
// // //         ipAddress:
// // //           req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
// // //           req.headers.get("x-real-ip") ||
// // //           null,
// // //         userAgent: req.headers.get("user-agent") || null,
// // //       });

// // //       return NextResponse.json(
// // //         {
// // //           success: false,
// // //           message: "Please verify your email first",
// // //           code: "EMAIL_NOT_VERIFIED",
// // //         },
// // //         { status: 403 }
// // //       );
// // //     }

// // //     // ============================================
// // //     // CREATE ACCESS TOKEN
// // //     // ============================================
// // //     const accessToken = createAccessToken(
// // //       user._id.toString(),
// // //       user.role,
// // //       user.email
// // //     );
// // //     console.log(accessToken);
// // //     // ============================================
// // //     // CREATE REFRESH TOKEN
// // //     // ============================================
// // //     const refreshToken = createRefreshToken(
// // //       user._id.toString()
// // //     );
// // //     console.log(refreshToken);
// // //     // ============================================
// // //     // RESPONSE
// // //     // ============================================
// // //     const response = NextResponse.json(
// // //       {
// // //         success: true,
// // //         message: "Login successful",
// // //         data: {
// // //           id: user._id,
// // //           name: user.name,
// // //           email: user.email,
// // //           phoneNumber: user.phoneNumber,
// // //           role: user.role,
// // //           isEmailVerified: user.isEmailVerified,
// // //         },
// // //       },
// // //       { status: 200 }
// // //     );

// // //     // ============================================
// // //     // ACCESS TOKEN COOKIE
// // //     // ============================================
// // //     response.cookies.set("access_token", accessToken, {
// // //       httpOnly: true,
// // //       secure: process.env.NODE_ENV === "production",
// // //       sameSite: "lax",
// // //       maxAge: 60 * 60 * 24, // 1 day
// // //       path: "/",
// // //     });

// // //     // ============================================
// // //     // REFRESH TOKEN COOKIE
// // //     // ============================================
// // //     response.cookies.set("refresh_token", refreshToken, {
// // //       httpOnly: true,
// // //       secure: process.env.NODE_ENV === "production",
// // //       sameSite: "lax",
// // //       maxAge: 60 * 60 * 24 * 30, // 30 days
// // //       path: "/",
// // //     });

// // //     // ============================================
// // //     // SUCCESS LOGIN AUDIT LOG
// // //     // ============================================
// // //     await createAuditLog({
// // //       userId: user._id.toString(),
// // //       action: "LOGIN",
// // //       module: "Authentication",
// // //       description: `User ${user.email} logged in successfully`,
// // //       entityType: "Auth",
// // //       entityId: user._id.toString(),
// // //       metadata: {
// // //         email: user.email,
// // //         role: user.role,
// // //       },
// // //       ipAddress:
// // //         req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
// // //         req.headers.get("x-real-ip") ||
// // //         null,
// // //       userAgent: req.headers.get("user-agent") || null,
// // //     });

// // //     // ============================================
// // //     // RETURN RESPONSE
// // //     // ============================================
// // //     return response;
// // //   } catch (error) {
// // //     console.error("LOGIN ERROR:", error);

// // //     return NextResponse.json(
// // //       {
// // //         success: false,
// // //         message: "Something went wrong",
// // //       },
// // //       { status: 500 }
// // //     );
// // //   }
// // // }


// // import { cookies } from "next/headers";

// // import { UserRole } from "@/types/role";

// // import {

// //   verifyAccessToken,
// //   verifyRefreshToken,
// // } from "@/lib/auth";

// // import { connectDB } from "@/config/db";
// // import Auth from "@/models/Auth";

// // export async function getCurrentUser(): Promise<{
// //   userId: string;
// //   role: UserRole;
// //   email: string;
// //   name?: string;
// // } | null> {
// //   const cookieStore = await cookies();

// //   const accessToken =
// //     cookieStore.get("access_token")?.value;

// //   const refreshToken =
// //     cookieStore.get("refresh_token")?.value;

// //   // =====================================================
// //   // ACCESS TOKEN
// //   // =====================================================

// //   if (accessToken) {
// //     try {
// //       const payload =
// //         verifyAccessToken(accessToken);

// //       if (payload.type === "access") {
// //         await connectDB();

// //         const user = await Auth.findById(
// //           payload.userId
// //         )
// //           .select("_id name email role")
// //           .lean();

// //         if (!user) {
// //           return null;
// //         }

// //         return {
// //           userId: user._id.toString(),
// //           role: user.role as UserRole,
// //           email: user.email,
// //           name: user.name,
// //         };
// //       }
// //     } catch {
// //       // Access token invalid/expired.
// //       // Continue to refresh token.
// //     }
// //   }

// //   // =====================================================
// //   // REFRESH TOKEN
// //   // =====================================================

// //   if (refreshToken) {
// //     try {
// //       const payload =
// //         verifyRefreshToken(refreshToken);

// //       if (payload.type !== "refresh") {
// //         return null;
// //       }

// //       await connectDB();

// //       const user = await Auth.findById(
// //         payload.userId
// //       )
// //         .select("_id name email role")
// //         .lean();

// //       if (!user) {
// //         return null;
// //       }

// //       return {
// //         userId: user._id.toString(),
// //         role: user.role as UserRole,
// //         email: user.email,
// //         name: user.name,
// //       };
// //     } catch {
// //       return null;
// //     }
// //   }

// //   return null;
// // }


// import { NextRequest, NextResponse } from "next/server";
// import bcrypt from "bcryptjs";

// import { connectDB } from "@/config/db";
// import Auth from "@/models/Auth";

// import {
//   createAccessToken,
//   createRefreshToken,
// } from "@/lib/auth";

// import { createAuditLog } from "@/lib/auditLog";

// export async function POST(req: NextRequest) {
//   try {
//     // =====================================================
//     // CONNECT DATABASE
//     // =====================================================

//     await connectDB();

//     // =====================================================
//     // GET REQUEST BODY
//     // =====================================================

//     const body = await req.json();

//     const email =
//       typeof body.email === "string"
//         ? body.email.trim().toLowerCase()
//         : "";

//     const password =
//       typeof body.password === "string"
//         ? body.password
//         : "";

//     // =====================================================
//     // GET CLIENT INFORMATION
//     // =====================================================

//     const ipAddress =
//       req.headers
//         .get("x-forwarded-for")
//         ?.split(",")[0]
//         ?.trim() ||
//       req.headers.get("x-real-ip") ||
//       null;

//     const userAgent =
//       req.headers.get("user-agent") || null;

//     // =====================================================
//     // VALIDATE INPUT
//     // =====================================================

//     if (!email || !password) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Email and password are required",
//         },
//         {
//           status: 400,
//         }
//       );
//     }

//     // =====================================================
//     // FIND USER
//     // =====================================================

//     const user = await Auth.findOne({
//       email,
//     }).select("+password");

//     // =====================================================
//     // USER NOT FOUND
//     // =====================================================

//     if (!user) {
//       await createAuditLog({
//         action: "LOGIN",
//         module: "Authentication",
//         description: `Failed login attempt for ${email}`,
//         metadata: {
//           email,
//           reason: "USER_NOT_FOUND",
//         },
//         ipAddress,
//         userAgent,
//       });

//       return NextResponse.json(
//         {
//           success: false,
//           message: "Invalid email or password",
//         },
//         {
//           status: 401,
//         }
//       );
//     }

//     // =====================================================
//     // CHECK PASSWORD
//     // =====================================================

//     const passwordMatch = await bcrypt.compare(
//       password,
//       user.password
//     );

//     if (!passwordMatch) {
//       await createAuditLog({
//         userId: user._id.toString(),
//         action: "LOGIN",
//         module: "Authentication",
//         description: `Failed login attempt for ${email}`,
//         entityType: "Auth",
//         entityId: user._id.toString(),
//         metadata: {
//           email,
//           role: user.role,
//           reason: "INVALID_PASSWORD",
//         },
//         ipAddress,
//         userAgent,
//       });

//       return NextResponse.json(
//         {
//           success: false,
//           message: "Invalid email or password",
//         },
//         {
//           status: 401,
//         }
//       );
//     }

//     // =====================================================
//     // CHECK EMAIL VERIFICATION
//     // =====================================================

//     if (!user.isEmailVerified) {
//       await createAuditLog({
//         userId: user._id.toString(),
//         action: "LOGIN",
//         module: "Authentication",
//         description:
//           "Login blocked because email is not verified",
//         entityType: "Auth",
//         entityId: user._id.toString(),
//         metadata: {
//           email: user.email,
//           role: user.role,
//           reason: "EMAIL_NOT_VERIFIED",
//         },
//         ipAddress,
//         userAgent,
//       });

//       return NextResponse.json(
//         {
//           success: false,
//           message: "Please verify your email first",
//           code: "EMAIL_NOT_VERIFIED",
//         },
//         {
//           status: 403,
//         }
//       );
//     }

//     // =====================================================
//     // CREATE ACCESS TOKEN
//     // =====================================================

//     const accessToken = createAccessToken(
//       user._id.toString(),
//       user.role,
//       user.email
//     );

//     // =====================================================
//     // CREATE REFRESH TOKEN
//     // =====================================================

//     const refreshToken = createRefreshToken(
//       user._id.toString()
//     );

//     // =====================================================
//     // CREATE RESPONSE
//     // =====================================================

//     const response = NextResponse.json(
//       {
//         success: true,
//         message: "Login successful",

//         data: {
//           id: user._id.toString(),
//           name: user.name,
//           email: user.email,
//           phoneNumber: user.phoneNumber,
//           role: user.role,
//           isEmailVerified: user.isEmailVerified,
//         },
//       },
//       {
//         status: 200,
//       }
//     );

//     // =====================================================
//     // ACCESS TOKEN COOKIE
//     // =====================================================

//     response.cookies.set(
//       "access_token",
//       accessToken,
//       {
//         httpOnly: true,
//         secure:
//           process.env.NODE_ENV === "production",
//         sameSite: "lax",

//         // 1 day
//         maxAge: 60 * 60 * 24,

//         path: "/",
//       }
//     );

//     // =====================================================
//     // REFRESH TOKEN COOKIE
//     // =====================================================

//     response.cookies.set(
//       "refresh_token",
//       refreshToken,
//       {
//         httpOnly: true,
//         secure:
//           process.env.NODE_ENV === "production",
//         sameSite: "lax",

//         // 30 days
//         maxAge: 60 * 60 * 24 * 30,

//         path: "/",
//       }
//     );

//     // =====================================================
//     // SUCCESS LOGIN AUDIT LOG
//     // =====================================================

//     await createAuditLog({
//       userId: user._id.toString(),
//       action: "LOGIN",
//       module: "Authentication",
//       description:
//         `User ${user.email} logged in successfully`,
//       entityType: "Auth",
//       entityId: user._id.toString(),
//       metadata: {
//         email: user.email,
//         role: user.role,
//       },
//       ipAddress,
//       userAgent,
//     });

//     // =====================================================
//     // RETURN RESPONSE
//     // =====================================================

//     return response;
//   } catch (error) {
//     console.error("LOGIN ERROR:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         message: "Something went wrong",
//       },
//       {
//         status: 500,
//       }
//     );
//   }
// }


import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";

import {
  createAccessToken,
  createRefreshToken,
} from "@/lib/auth";

import { createAuditLog } from "@/lib/auditLog";

export async function POST(req: NextRequest) {
  try {
    // =====================================================
    // CONNECT DATABASE
    // =====================================================

    await connectDB();

    // =====================================================
    // GET REQUEST BODY
    // =====================================================

    const body = await req.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    // =====================================================
    // GET CLIENT INFORMATION
    // =====================================================

    const ipAddress =
      req.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const userAgent =
      req.headers.get("user-agent") || null;

    // =====================================================
    // VALIDATE INPUT
    // =====================================================

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // FIND USER
    // =====================================================

    const user = await Auth.findOne({
      email,
    }).select("+password");

    // =====================================================
    // USER NOT FOUND
    // =====================================================

    if (!user) {
      await createAuditLog({
        action: "LOGIN",
        module: "Authentication",
        description: `Failed login attempt for ${email}`,
        metadata: {
          email,
          reason: "USER_NOT_FOUND",
        },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        {
          status: 401,
        }
      );
    }

    // =====================================================
    // CHECK PASSWORD
    // =====================================================

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      await createAuditLog({
        userId: user._id.toString(),
        action: "LOGIN",
        module: "Authentication",
        description: `Failed login attempt for ${email}`,
        entityType: "Auth",
        entityId: user._id.toString(),
        metadata: {
          email,
          role: user.role,
          reason: "INVALID_PASSWORD",
        },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        {
          status: 401,
        }
      );
    }

    // =====================================================
    // CHECK ACCOUNT ACTIVE STATUS
    // =====================================================

    if (user.isActive !== true) {
      await createAuditLog({
        userId: user._id.toString(),
        action: "LOGIN",
        module: "Authentication",
        description:
          "Login blocked because account is inactive",
        entityType: "Auth",
        entityId: user._id.toString(),
        metadata: {
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          reason: "ACCOUNT_NOT_ACTIVE",
        },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "Your account is inactive. Please contact the administrator.",
          code: "ACCOUNT_NOT_ACTIVE",
        },
        {
          status: 403,
        }
      );
    }

    // =====================================================
    // CHECK EMAIL VERIFICATION
    // =====================================================

    if (!user.isEmailVerified) {
      await createAuditLog({
        userId: user._id.toString(),
        action: "LOGIN",
        module: "Authentication",
        description:
          "Login blocked because email is not verified",
        entityType: "Auth",
        entityId: user._id.toString(),
        metadata: {
          email: user.email,
          role: user.role,
          reason: "EMAIL_NOT_VERIFIED",
        },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Please verify your email first",
          code: "EMAIL_NOT_VERIFIED",
        },
        {
          status: 403,
        }
      );
    }

    // =====================================================
    // CREATE ACCESS TOKEN
    // =====================================================

    const accessToken = createAccessToken(
      user._id.toString(),
      user.role,
      user.email
    );

    // =====================================================
    // CREATE REFRESH TOKEN
    // =====================================================

    const refreshToken = createRefreshToken(
      user._id.toString()
    );

    // =====================================================
    // CREATE RESPONSE
    // =====================================================

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",

        data: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
        },
      },
      {
        status: 200,
      }
    );

    // =====================================================
    // ACCESS TOKEN COOKIE
    // =====================================================

    response.cookies.set(
      "access_token",
      accessToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      }
    );

    // =====================================================
    // REFRESH TOKEN COOKIE
    // =====================================================

    response.cookies.set(
      "refresh_token",
      refreshToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      }
    );

    // =====================================================
    // SUCCESS LOGIN AUDIT LOG
    // =====================================================

    await createAuditLog({
      userId: user._id.toString(),
      action: "LOGIN",
      module: "Authentication",
      description:
        `User ${user.email} logged in successfully`,
      entityType: "Auth",
      entityId: user._id.toString(),
      metadata: {
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      ipAddress,
      userAgent,
    });

    // =====================================================
    // RETURN RESPONSE
    // =====================================================

    return response;
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      {
        status: 500,
      }
    );
  }
}