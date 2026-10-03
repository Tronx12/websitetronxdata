


// // import { cookies } from "next/headers";

// // import { UserRole } from "@/types/role";

// // import {
// //   verifyAccessToken,
// //   verifyRefreshToken,
// // } from "./auth";

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

// import { cookies } from "next/headers";

// import { UserRole } from "@/types/role";

// import {
//   verifyAccessToken,
//   verifyRefreshToken,
// } from "./auth";

// import { connectDB } from "@/config/db";
// import Auth from "@/models/Auth";

// export async function getCurrentUser(): Promise<{
//   userId: string;
//   role: UserRole;
//   email: string;
//   name?: string;
// } | null> {
//   const cookieStore = await cookies();

//   // IMPORTANT:
//   // These cookie names must exactly match the cookies
//   // created by the login API.
//   const accessToken =
//     cookieStore.get("access_token")?.value;

//   const refreshToken =
//     cookieStore.get("refresh_token")?.value;

//   // =====================================================
//   // ACCESS TOKEN
//   // =====================================================

//   if (accessToken) {
//     try {
//       const payload = verifyAccessToken(accessToken);

//       if (payload.type === "access") {
//         await connectDB();

//         // IMPORTANT:
//         // Use the userId from the JWT only to identify the user.
//         // Always read the CURRENT role from MongoDB.
//         const user = await Auth.findById(payload.userId)
//           .select("_id name email role isActive")
//           .lean();

//         if (!user) {
//           return null;
//         }

//         // If admin deactivates the account, immediately
//         // treat the session as unauthorized.
//         if (user.isActive !== true) {
//           return null;
//         }

//         return {
//           userId: user._id.toString(),
//           role: user.role as UserRole,
//           email: user.email,
//           name: user.name,
//         };
//       }
//     } catch {
//       // Access token invalid/expired.
//       // Continue with refresh token.
//     }
//   }

//   // =====================================================
//   // REFRESH TOKEN
//   // =====================================================

//   if (refreshToken) {
//     try {
//       const payload = verifyRefreshToken(refreshToken);

//       if (payload.type !== "refresh") {
//         return null;
//       }

//       await connectDB();

//       // IMPORTANT:
//       // Read the CURRENT role from MongoDB here too.
//       // Never use a stale role from an old access token.
//       const user = await Auth.findById(payload.userId)
//         .select("_id name email role isActive")
//         .lean();

//       if (!user) {
//         return null;
//       }

//       // Account must still be active.
//       if (user.isActive !== true) {
//         return null;
//       }

//       return {
//         userId: user._id.toString(),
//         role: user.role as UserRole,
//         email: user.email,
//         name: user.name,
//       };
//     } catch {
//       return null;
//     }
//   }

//   return null;
// }


import { cookies } from "next/headers";

import { UserRole } from "@/types/role";

import { verifyAccessToken } from "./auth";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";

/**
 * Returns the logged-in user, or null.
 *
 * Only the ACCESS token is used here. Expired access tokens are repaired
 * by middleware (-> GET /api/auth/refresh) BEFORE a protected page renders,
 * so server code and middleware always agree on who is logged in.
 *
 * Do not add a refresh-token fallback here: it makes this function say
 * "logged in" while middleware says "logged out", which causes
 * redirect loops / blank pages with stale cookies.
 */
export async function getCurrentUser(): Promise<{
  userId: string;
  role: UserRole;
  email: string;
  name?: string;
} | null> {
  const cookieStore = await cookies();

  // Must match the cookie name set by the login API.
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const payload = verifyAccessToken(accessToken);

    await connectDB();

    // The JWT only identifies the user. Always read the CURRENT
    // role and active status from MongoDB.
    const user = await Auth.findById(payload.userId)
      .select("_id name email role isActive")
      .lean();

    if (!user || user.isActive !== true) {
      return null;
    }

    return {
      userId: user._id.toString(),
      role: user.role as UserRole,
      email: user.email,
      name: user.name,
    };
  } catch {
    // Invalid or expired access token
    return null;
  }
}