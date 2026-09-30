// // // // import { NextRequest, NextResponse } from "next/server";
// // // // import bcrypt from "bcryptjs";

// // // // import { connectDB } from "@/config/db";
// // // // import Auth from "@/models/Auth";
// // // // import {
// // // //   createAccessToken,
// // // //   createRefreshToken,
// // // // } from "@/lib/auth";

// // // // import { createAuditLog } from "@/lib/auditLog";

// // // // export async function POST(req: NextRequest) {
// // // //   try {
// // // //     await connectDB();

// // // //     const body = await req.json();

// // // //     const email = body.email?.trim().toLowerCase();
// // // //     const password = body.password;

// // // //     // ============================================
// // // //     // VALIDATE INPUT
// // // //     // ============================================
// // // //     if (!email || !password) {
// // // //       return NextResponse.json(
// // // //         {
// // // //           success: false,
// // // //           message: "Email and password are required",
// // // //         },
// // // //         { status: 400 }
// // // //       );
// // // //     }

// // // //     // ============================================
// // // //     // FIND USER
// // // //     // ============================================
// // // //     const user = await Auth.findOne({
// // // //       email,
// // // //     }).select("+password");

// // // //     // ============================================
// // // //     // USER NOT FOUND
// // // //     // ============================================
// // // //     if (!user) {
// // // //       await createAuditLog({
// // // //         action: "LOGIN",
// // // //         module: "Authentication",
// // // //         description: `Failed login attempt for ${email}`,
// // // //         metadata: {
// // // //           email,
// // // //           reason: "USER_NOT_FOUND",
// // // //         },
// // // //         ipAddress:
// // // //           req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
// // // //           req.headers.get("x-real-ip") ||
// // // //           null,
// // // //         userAgent: req.headers.get("user-agent") || null,
// // // //       });

// // // //       return NextResponse.json(
// // // //         {
// // // //           success: false,
// // // //           message: "Invalid email or password",
// // // //         },
// // // //         { status: 401 }
// // // //       );
// // // //     }

// // // //     // ============================================
// // // //     // CHECK PASSWORD
// // // //     // ============================================
// // // //     const passwordMatch = await bcrypt.compare(
// // // //       password,
// // // //       user.password
// // // //     );

// // // //     if (!passwordMatch) {
// // // //       await createAuditLog({
// // // //         userId: user._id.toString(),
// // // //         action: "LOGIN",
// // // //         module: "Authentication",
// // // //         description: `Failed login attempt for ${email}`,
// // // //         entityType: "Auth",
// // // //         entityId: user._id.toString(),
// // // //         metadata: {
// // // //           email,
// // // //           role: user.role,
// // // //           reason: "INVALID_PASSWORD",
// // // //         },
// // // //         ipAddress:
// // // //           req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
// // // //           req.headers.get("x-real-ip") ||
// // // //           null,
// // // //         userAgent: req.headers.get("user-agent") || null,
// // // //       });

// // // //       return NextResponse.json(
// // // //         {
// // // //           success: false,
// // // //           message: "Invalid email or password",
// // // //         },
// // // //         { status: 401 }
// // // //       );
// // // //     }

// // // //     // ============================================
// // // //     // CHECK EMAIL VERIFICATION
// // // //     // ============================================
// // // //     if (!user.isEmailVerified) {
// // // //       await createAuditLog({
// // // //         userId: user._id.toString(),
// // // //         action: "LOGIN",
// // // //         module: "Authentication",
// // // //         description: `Login blocked because email is not verified`,
// // // //         entityType: "Auth",
// // // //         entityId: user._id.toString(),
// // // //         metadata: {
// // // //           email: user.email,
// // // //           role: user.role,
// // // //           reason: "EMAIL_NOT_VERIFIED",
// // // //         },
// // // //         ipAddress:
// // // //           req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
// // // //           req.headers.get("x-real-ip") ||
// // // //           null,
// // // //         userAgent: req.headers.get("user-agent") || null,
// // // //       });

// // // //       return NextResponse.json(
// // // //         {
// // // //           success: false,
// // // //           message: "Please verify your email first",
// // // //           code: "EMAIL_NOT_VERIFIED",
// // // //         },
// // // //         { status: 403 }
// // // //       );
// // // //     }

// // // //     // ============================================
// // // //     // CREATE ACCESS TOKEN
// // // //     // ============================================
// // // //     const accessToken = createAccessToken(
// // // //       user._id.toString(),
// // // //       user.role,
// // // //       user.email
// // // //     );
// // // //     console.log(accessToken);
// // // //     // ============================================
// // // //     // CREATE REFRESH TOKEN
// // // //     // ============================================
// // // //     const refreshToken = createRefreshToken(
// // // //       user._id.toString()
// // // //     );
// // // //     console.log(refreshToken);
// // // //     // ============================================
// // // //     // RESPONSE
// // // //     // ============================================
// // // //     const response = NextResponse.json(
// // // //       {
// // // //         success: true,
// // // //         message: "Login successful",
// // // //         data: {
// // // //           id: user._id,
// // // //           name: user.name,
// // // //           email: user.email,
// // // //           phoneNumber: user.phoneNumber,
// // // //           role: user.role,
// // // //           isEmailVerified: user.isEmailVerified,
// // // //         },
// // // //       },
// // // //       { status: 200 }
// // // //     );

// // // //     // ============================================
// // // //     // ACCESS TOKEN COOKIE
// // // //     // ============================================
// // // //     response.cookies.set("access_token", accessToken, {
// // // //       httpOnly: true,
// // // //       secure: process.env.NODE_ENV === "production",
// // // //       sameSite: "lax",
// // // //       maxAge: 60 * 60 * 24, // 1 day
// // // //       path: "/",
// // // //     });

// // // //     // ============================================
// // // //     // REFRESH TOKEN COOKIE
// // // //     // ============================================
// // // //     response.cookies.set("refresh_token", refreshToken, {
// // // //       httpOnly: true,
// // // //       secure: process.env.NODE_ENV === "production",
// // // //       sameSite: "lax",
// // // //       maxAge: 60 * 60 * 24 * 30, // 30 days
// // // //       path: "/",
// // // //     });

// // // //     // ============================================
// // // //     // SUCCESS LOGIN AUDIT LOG
// // // //     // ============================================
// // // //     await createAuditLog({
// // // //       userId: user._id.toString(),
// // // //       action: "LOGIN",
// // // //       module: "Authentication",
// // // //       description: `User ${user.email} logged in successfully`,
// // // //       entityType: "Auth",
// // // //       entityId: user._id.toString(),
// // // //       metadata: {
// // // //         email: user.email,
// // // //         role: user.role,
// // // //       },
// // // //       ipAddress:
// // // //         req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
// // // //         req.headers.get("x-real-ip") ||
// // // //         null,
// // // //       userAgent: req.headers.get("user-agent") || null,
// // // //     });

// // // //     // ============================================
// // // //     // RETURN RESPONSE
// // // //     // ============================================
// // // //     return response;
// // // //   } catch (error) {
// // // //     console.error("LOGIN ERROR:", error);

// // // //     return NextResponse.json(
// // // //       {
// // // //         success: false,
// // // //         message: "Something went wrong",
// // // //       },
// // // //       { status: 500 }
// // // //     );
// // // //   }
// // // // }


// // // import { cookies } from "next/headers";

// // // import { UserRole } from "@/types/role";

// // // import {

// // //   verifyAccessToken,
// // //   verifyRefreshToken,
// // // } from "@/lib/auth";

// // // import { connectDB } from "@/config/db";
// // // import Auth from "@/models/Auth";

// // // export async function getCurrentUser(): Promise<{
// // //   userId: string;
// // //   role: UserRole;
// // //   email: string;
// // //   name?: string;
// // // } | null> {
// // //   const cookieStore = await cookies();

// // //   const accessToken =
// // //     cookieStore.get("access_token")?.value;

// // //   const refreshToken =
// // //     cookieStore.get("refresh_token")?.value;

// // //   // =====================================================
// // //   // ACCESS TOKEN
// // //   // =====================================================

// // //   if (accessToken) {
// // //     try {
// // //       const payload =
// // //         verifyAccessToken(accessToken);

// // //       if (payload.type === "access") {
// // //         await connectDB();

// // //         const user = await Auth.findById(
// // //           payload.userId
// // //         )
// // //           .select("_id name email role")
// // //           .lean();

// // //         if (!user) {
// // //           return null;
// // //         }

// // //         return {
// // //           userId: user._id.toString(),
// // //           role: user.role as UserRole,
// // //           email: user.email,
// // //           name: user.name,
// // //         };
// // //       }
// // //     } catch {
// // //       // Access token invalid/expired.
// // //       // Continue to refresh token.
// // //     }
// // //   }

// // //   // =====================================================
// // //   // REFRESH TOKEN
// // //   // =====================================================

// // //   if (refreshToken) {
// // //     try {
// // //       const payload =
// // //         verifyRefreshToken(refreshToken);

// // //       if (payload.type !== "refresh") {
// // //         return null;
// // //       }

// // //       await connectDB();

// // //       const user = await Auth.findById(
// // //         payload.userId
// // //       )
// // //         .select("_id name email role")
// // //         .lean();

// // //       if (!user) {
// // //         return null;
// // //       }

// // //       return {
// // //         userId: user._id.toString(),
// // //         role: user.role as UserRole,
// // //         email: user.email,
// // //         name: user.name,
// // //       };
// // //     } catch {
// // //       return null;
// // //     }
// // //   }

// // //   return null;
// // // }


// // import { NextRequest, NextResponse } from "next/server";
// // import bcrypt from "bcryptjs";

// // import { connectDB } from "@/config/db";
// // import Auth from "@/models/Auth";

// // import {
// //   createAccessToken,
// //   createRefreshToken,
// // } from "@/lib/auth";

// // import { createAuditLog } from "@/lib/auditLog";

// // export async function POST(req: NextRequest) {
// //   try {
// //     // =====================================================
// //     // CONNECT DATABASE
// //     // =====================================================

// //     await connectDB();

// //     // =====================================================
// //     // GET REQUEST BODY
// //     // =====================================================

// //     const body = await req.json();

// //     const email =
// //       typeof body.email === "string"
// //         ? body.email.trim().toLowerCase()
// //         : "";

// //     const password =
// //       typeof body.password === "string"
// //         ? body.password
// //         : "";

// //     // =====================================================
// //     // GET CLIENT INFORMATION
// //     // =====================================================

// //     const ipAddress =
// //       req.headers
// //         .get("x-forwarded-for")
// //         ?.split(",")[0]
// //         ?.trim() ||
// //       req.headers.get("x-real-ip") ||
// //       null;

// //     const userAgent =
// //       req.headers.get("user-agent") || null;

// //     // =====================================================
// //     // VALIDATE INPUT
// //     // =====================================================

// //     if (!email || !password) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           message: "Email and password are required",
// //         },
// //         {
// //           status: 400,
// //         }
// //       );
// //     }

// //     // =====================================================
// //     // FIND USER
// //     // =====================================================

// //     const user = await Auth.findOne({
// //       email,
// //     }).select("+password");

// //     // =====================================================
// //     // USER NOT FOUND
// //     // =====================================================

// //     if (!user) {
// //       await createAuditLog({
// //         action: "LOGIN",
// //         module: "Authentication",
// //         description: `Failed login attempt for ${email}`,
// //         metadata: {
// //           email,
// //           reason: "USER_NOT_FOUND",
// //         },
// //         ipAddress,
// //         userAgent,
// //       });

// //       return NextResponse.json(
// //         {
// //           success: false,
// //           message: "Invalid email or password",
// //         },
// //         {
// //           status: 401,
// //         }
// //       );
// //     }

// //     // =====================================================
// //     // CHECK PASSWORD
// //     // =====================================================

// //     const passwordMatch = await bcrypt.compare(
// //       password,
// //       user.password
// //     );

// //     if (!passwordMatch) {
// //       await createAuditLog({
// //         userId: user._id.toString(),
// //         action: "LOGIN",
// //         module: "Authentication",
// //         description: `Failed login attempt for ${email}`,
// //         entityType: "Auth",
// //         entityId: user._id.toString(),
// //         metadata: {
// //           email,
// //           role: user.role,
// //           reason: "INVALID_PASSWORD",
// //         },
// //         ipAddress,
// //         userAgent,
// //       });

// //       return NextResponse.json(
// //         {
// //           success: false,
// //           message: "Invalid email or password",
// //         },
// //         {
// //           status: 401,
// //         }
// //       );
// //     }

// //     // =====================================================
// //     // CHECK EMAIL VERIFICATION
// //     // =====================================================

// //     if (!user.isEmailVerified) {
// //       await createAuditLog({
// //         userId: user._id.toString(),
// //         action: "LOGIN",
// //         module: "Authentication",
// //         description:
// //           "Login blocked because email is not verified",
// //         entityType: "Auth",
// //         entityId: user._id.toString(),
// //         metadata: {
// //           email: user.email,
// //           role: user.role,
// //           reason: "EMAIL_NOT_VERIFIED",
// //         },
// //         ipAddress,
// //         userAgent,
// //       });

// //       return NextResponse.json(
// //         {
// //           success: false,
// //           message: "Please verify your email first",
// //           code: "EMAIL_NOT_VERIFIED",
// //         },
// //         {
// //           status: 403,
// //         }
// //       );
// //     }

// //     // =====================================================
// //     // CREATE ACCESS TOKEN
// //     // =====================================================

// //     const accessToken = createAccessToken(
// //       user._id.toString(),
// //       user.role,
// //       user.email
// //     );

// //     // =====================================================
// //     // CREATE REFRESH TOKEN
// //     // =====================================================

// //     const refreshToken = createRefreshToken(
// //       user._id.toString()
// //     );

// //     // =====================================================
// //     // CREATE RESPONSE
// //     // =====================================================

// //     const response = NextResponse.json(
// //       {
// //         success: true,
// //         message: "Login successful",

// //         data: {
// //           id: user._id.toString(),
// //           name: user.name,
// //           email: user.email,
// //           phoneNumber: user.phoneNumber,
// //           role: user.role,
// //           isEmailVerified: user.isEmailVerified,
// //         },
// //       },
// //       {
// //         status: 200,
// //       }
// //     );

// //     // =====================================================
// //     // ACCESS TOKEN COOKIE
// //     // =====================================================

// //     response.cookies.set(
// //       "access_token",
// //       accessToken,
// //       {
// //         httpOnly: true,
// //         secure:
// //           process.env.NODE_ENV === "production",
// //         sameSite: "lax",

// //         // 1 day
// //         maxAge: 60 * 60 * 24,

// //         path: "/",
// //       }
// //     );

// //     // =====================================================
// //     // REFRESH TOKEN COOKIE
// //     // =====================================================

// //     response.cookies.set(
// //       "refresh_token",
// //       refreshToken,
// //       {
// //         httpOnly: true,
// //         secure:
// //           process.env.NODE_ENV === "production",
// //         sameSite: "lax",

// //         // 30 days
// //         maxAge: 60 * 60 * 24 * 30,

// //         path: "/",
// //       }
// //     );

// //     // =====================================================
// //     // SUCCESS LOGIN AUDIT LOG
// //     // =====================================================

// //     await createAuditLog({
// //       userId: user._id.toString(),
// //       action: "LOGIN",
// //       module: "Authentication",
// //       description:
// //         `User ${user.email} logged in successfully`,
// //       entityType: "Auth",
// //       entityId: user._id.toString(),
// //       metadata: {
// //         email: user.email,
// //         role: user.role,
// //       },
// //       ipAddress,
// //       userAgent,
// //     });

// //     // =====================================================
// //     // RETURN RESPONSE
// //     // =====================================================

// //     return response;
// //   } catch (error) {
// //     console.error("LOGIN ERROR:", error);

// //     return NextResponse.json(
// //       {
// //         success: false,
// //         message: "Something went wrong",
// //       },
// //       {
// //         status: 500,
// //       }
// //     );
// //   }
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
//     // CHECK ACCOUNT ACTIVE STATUS
//     // =====================================================

//     if (user.isActive !== true) {
//       await createAuditLog({
//         userId: user._id.toString(),
//         action: "LOGIN",
//         module: "Authentication",
//         description:
//           "Login blocked because account is inactive",
//         entityType: "Auth",
//         entityId: user._id.toString(),
//         metadata: {
//           email: user.email,
//           role: user.role,
//           isActive: user.isActive,
//           reason: "ACCOUNT_NOT_ACTIVE",
//         },
//         ipAddress,
//         userAgent,
//       });

//       return NextResponse.json(
//         {
//           success: false,
//           message:
//             "Your account is inactive. Please contact the administrator.",
//           code: "ACCOUNT_NOT_ACTIVE",
//         },
//         {
//           status: 403,
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
//           isActive: user.isActive,
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
//         isActive: user.isActive,
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
import IpWhitelist from "@/models/IpWhitelist";

import {
  createAccessToken,
  createRefreshToken,
} from "@/lib/auth";

import { createAuditLog } from "@/lib/auditLog";

/**
 * Get the IP address that should be used for whitelist checking.
 *
 * Production:
 * - Uses x-forwarded-for / x-real-ip from the reverse proxy.
 *
 * Local development:
 * - localhost normally arrives as ::1 / 127.0.0.1.
 * - In that case, resolve the public IP so it matches the IP
 *   displayed by the IP whitelist page.
 */
async function getClientIp(
  req: NextRequest
): Promise<string | null> {
  const forwarded = req.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  const realIp = req.headers
    .get("x-real-ip")
    ?.trim();

  const headerIp = forwarded || realIp || null;

  // Localhost in development.
  const isLocalhost =
    !headerIp ||
    headerIp === "::1" ||
    headerIp === "127.0.0.1" ||
    headerIp === "::ffff:127.0.0.1";

  if (!isLocalhost) {
    return normalizeIp(headerIp);
  }

  // Resolve public IP in development so localhost does not
  // incorrectly get compared with "::1" in MongoDB.
  try {
    const response = await fetch(
      "https://api.ipify.org?format=json",
      {
        cache: "no-store",
      }
    );

    if (response.ok) {
      const data = await response.json();

      if (
        typeof data?.ip === "string" &&
        data.ip.trim()
      ) {
        const publicIp = normalizeIp(data.ip);

        console.log(
          "DEVELOPMENT PUBLIC IP:",
          publicIp
        );

        return publicIp;
      }
    }
  } catch (error) {
    console.error(
      "PUBLIC IP LOOKUP ERROR:",
      error
    );
  }

  return headerIp
    ? normalizeIp(headerIp)
    : null;
}

function normalizeIp(ip: string): string {
  let value = ip.trim();

  // Convert IPv4-mapped IPv6 to normal IPv4.
  if (value.startsWith("::ffff:")) {
    value = value.substring(7);
  }

  return value;
}

async function isIpWhitelisted(
  ipAddress: string
): Promise<boolean> {
  const normalizedIp = normalizeIp(ipAddress);

  const record = await IpWhitelist.findOne({
    ipAddress: normalizedIp,
    isActive: true,
  })
    .select("_id ipAddress name isActive")
    .lean();

  return Boolean(record);
}

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

    const ipAddress = await getClientIp(req);

    const userAgent =
      req.headers.get("user-agent") || null;

    console.log("========================================");
    console.log("       TRONX LOGIN IP CHECK");
    console.log("========================================");
    console.log("Client IP:", ipAddress || "UNKNOWN");
    console.log("========================================");

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
    // IP WHITELIST CHECK
    //
    // ADMIN BYPASS:
    // Admin can log in from any IP.
    //
    // ALL OTHER ROLES:
    // The current IP must exist in IpWhitelist with
    // isActive: true.
    // =====================================================

    const normalizedRole = String(
      user.role || ""
    )
      .trim()
      .toLowerCase();

    const isAdmin =
      normalizedRole === "admin";

    if (!isAdmin) {
      if (!ipAddress) {
        await createAuditLog({
          userId: user._id.toString(),
          action: "LOGIN",
          module: "Authentication",
          description:
            "Login blocked because client IP could not be determined",
          entityType: "Auth",
          entityId: user._id.toString(),
          metadata: {
            email: user.email,
            role: user.role,
            reason: "IP_NOT_DETERMINED",
          },
          ipAddress: null,
          userAgent,
        });

        return NextResponse.json(
          {
            success: false,
            code: "IP_NOT_WHITELISTED",
            message:
              "Unable to verify your network. Please connect to an authorized network and try again.",
          },
          {
            status: 403,
          }
        );
      }

      const ipAllowed =
        await isIpWhitelisted(ipAddress);

      console.log(
        "TRONX LOGIN WHITELIST:",
        {
          email: user.email,
          role: user.role,
          ip: ipAddress,
          allowed: ipAllowed,
        }
      );

      if (!ipAllowed) {
        await createAuditLog({
          userId: user._id.toString(),
          action: "LOGIN",
          module: "Authentication",
          description:
            "Login blocked because IP address is not whitelisted",
          entityType: "Auth",
          entityId: user._id.toString(),
          metadata: {
            email: user.email,
            role: user.role,
            reason: "IP_NOT_WHITELISTED",
            ipAddress,
          },
          ipAddress,
          userAgent,
        });

        return NextResponse.json(
          {
            success: false,
            code: "IP_NOT_WHITELISTED",
            message:
              "Your current network is not authorized to access the Tronx application.",
          },
          {
            status: 403,
          }
        );
      }
    } else {
      console.log(
        "TRONX LOGIN WHITELIST: ADMIN BYPASS",
        {
          email: user.email,
          role: user.role,
          ip: ipAddress,
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
          isEmailVerified:
            user.isEmailVerified,
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
        ipAddress,
        ipWhitelistBypass: isAdmin,
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
