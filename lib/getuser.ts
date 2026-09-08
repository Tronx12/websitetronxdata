// lib/auth.ts
import { cookies } from "next/headers";
import { UserRole } from "@/types/role";
import {
  verifyAccessToken,
  verifyRefreshToken,
  createAccessToken,
} from "./auth"; // adjust path if needed

export async function getCurrentUser(): Promise<{
  userId: string;
  role: UserRole;
} | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  // 1. Try access token first
  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);
      if (payload.type === "access") {
        return {
          userId: payload.userId,
          role: payload.role as UserRole,
        };
      }
    } catch {
      // Access token expired or invalid → fall through to refresh
    }
  }

  // 2. Try refresh token
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      if (payload.type !== "refresh") return null;

      // Optional: look up the latest role from DB here
      // const user = await db.user.findUnique({ where: { id: payload.userId } });
      // if (!user) return null;
      // const role = user.role as UserRole;

      // For now we re-issue with the role that was originally in the access token
      // (or fetch from DB in production)
      const newAccessToken = createAccessToken(payload.userId, "admin"); // ← replace with real role

      // Set the new access token cookie
      cookieStore.set("access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60, // 15 minutes
        path: "/",
      });

      return {
        userId: payload.userId,
        role: "admin" as UserRole, // ← replace with real role from DB
      };
    } catch {
      return null;
    }
  }

  return null;
}