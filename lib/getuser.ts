import { cookies } from "next/headers";
import { UserRole } from "@/types/role";
import { verifyAccessToken, verifyRefreshToken } from "./auth";
import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";

export async function getCurrentUser(): Promise<{
  userId: string;
  role: UserRole;
  email: string;
} | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  // 1. Try access token first — the common, fast path
  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);
      if (payload.type === "access") {
        return {
          userId: payload.userId,
          role: payload.role as UserRole,
          email: payload.email,
        };
      }
    } catch {
      // Expired or invalid — fall through to refresh
    }
  }

  // 2. Fall back to refresh token — look up the real user, never guess the role
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      if (payload.type !== "refresh") return null;

      await connectDB();
      const user = await Auth.findById(payload.userId);
      if (!user) return null;

      // This only *reads* the user for the current render — it doesn't
      // rotate the access_token cookie, since cookies() can be read-only
      // here (e.g. called from a Server Component like a layout).
      // Actual cookie rotation happens in /api/auth/refresh, which is a
      // Route Handler and is allowed to set cookies.
      return {
        userId: user._id.toString(),
        role: user.role as UserRole,
        email: user.email,
      };
    } catch {
      return null;
    }
  }

  return null;
}