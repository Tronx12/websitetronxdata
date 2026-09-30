


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

//   const accessToken =
//     cookieStore.get("access_token")?.value;

//   const refreshToken =
//     cookieStore.get("refresh_token")?.value;

//   // =====================================================
//   // ACCESS TOKEN
//   // =====================================================

//   if (accessToken) {
//     try {
//       const payload =
//         verifyAccessToken(accessToken);

//       if (payload.type === "access") {
//         await connectDB();

//         const user = await Auth.findById(
//           payload.userId
//         )
//           .select("_id name email role")
//           .lean();

//         if (!user) {
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
//       // Continue to refresh token.
//     }
//   }

//   // =====================================================
//   // REFRESH TOKEN
//   // =====================================================

//   if (refreshToken) {
//     try {
//       const payload =
//         verifyRefreshToken(refreshToken);

//       if (payload.type !== "refresh") {
//         return null;
//       }

//       await connectDB();

//       const user = await Auth.findById(
//         payload.userId
//       )
//         .select("_id name email role")
//         .lean();

//       if (!user) {
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

import {
  verifyAccessToken,
  verifyRefreshToken,
} from "./auth";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";

export async function getCurrentUser(): Promise<{
  userId: string;
  role: UserRole;
  email: string;
  name?: string;
} | null> {
  const cookieStore = await cookies();

  // IMPORTANT:
  // These cookie names must exactly match the cookies
  // created by the login API.
  const accessToken =
    cookieStore.get("access_token")?.value;

  const refreshToken =
    cookieStore.get("refresh_token")?.value;

  // =====================================================
  // ACCESS TOKEN
  // =====================================================

  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);

      if (payload.type === "access") {
        await connectDB();

        // IMPORTANT:
        // Use the userId from the JWT only to identify the user.
        // Always read the CURRENT role from MongoDB.
        const user = await Auth.findById(payload.userId)
          .select("_id name email role isActive")
          .lean();

        if (!user) {
          return null;
        }

        // If admin deactivates the account, immediately
        // treat the session as unauthorized.
        if (user.isActive !== true) {
          return null;
        }

        return {
          userId: user._id.toString(),
          role: user.role as UserRole,
          email: user.email,
          name: user.name,
        };
      }
    } catch {
      // Access token invalid/expired.
      // Continue with refresh token.
    }
  }

  // =====================================================
  // REFRESH TOKEN
  // =====================================================

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);

      if (payload.type !== "refresh") {
        return null;
      }

      await connectDB();

      // IMPORTANT:
      // Read the CURRENT role from MongoDB here too.
      // Never use a stale role from an old access token.
      const user = await Auth.findById(payload.userId)
        .select("_id name email role isActive")
        .lean();

      if (!user) {
        return null;
      }

      // Account must still be active.
      if (user.isActive !== true) {
        return null;
      }

      return {
        userId: user._id.toString(),
        role: user.role as UserRole,
        email: user.email,
        name: user.name,
      };
    } catch {
      return null;
    }
  }

  return null;
}
