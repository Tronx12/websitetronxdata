// import { NextRequest, NextResponse } from "next/server";

// import { connectDB } from "@/config/db";
// import Auth from "@/models/Auth";
// import {
//   createAccessToken,
//   createRefreshToken,
//   verifyRefreshToken,
// } from "@/lib/auth";

// export async function POST(req: NextRequest) {
//   try {
//     // Must match the cookie name set in the login route
//     const refreshToken = req.cookies.get("refresh_token")?.value;

//     if (!refreshToken) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "Refresh token missing",
//         },
//         { status: 401 }
//       );
//     }

//     const payload = verifyRefreshToken(refreshToken);

//     await connectDB();

//     const user = await Auth.findById(payload.userId);

//     if (!user) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "User not found",
//         },
//         { status: 401 }
//       );
//     }

//     // Generate new access and refresh tokens
//     const accessToken = createAccessToken(
//       user._id.toString(),
//       user.role,
//       user.email
//     );
//     const newRefreshToken = createRefreshToken(user._id.toString());

//     const response = NextResponse.json({
//       success: true,
//       message: "Token refreshed",
//       data: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//       },
//     });

//     // Set access token cookie (1 day)
//     response.cookies.set("access_token", accessToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//       maxAge: 60 * 60 * 24, // 1 day
//       path: "/",
//     });

//     // Set refresh token cookie (30 days - rolling extension)
//     response.cookies.set("refresh_token", newRefreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//       maxAge: 60 * 60 * 24 * 30, // 30 days
//       path: "/",
//     });

//     return response;
//   } catch {
//     return NextResponse.json(
//       {
//         success: false,
//         message: "Invalid refresh token",
//       },
//       { status: 401 }
//     );
//   }
// }


// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/config/db";
import Auth from "@/models/Auth";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "@/lib/auth";

const isProd = process.env.NODE_ENV === "production";

const cookieBase = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
};

function setAuthCookies(res: NextResponse, access: string, refresh: string) {
  res.cookies.set("access_token", access, {
    ...cookieBase,
    maxAge: 60 * 60 * 24, // 1 day
  });
  res.cookies.set("refresh_token", refresh, {
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 30, // 30 days (rolling)
  });
}

function clearAuthCookies(res: NextResponse) {
  res.cookies.delete("access_token");
  res.cookies.delete("refresh_token");
}

/** Shared logic: validate refresh cookie + user, issue new tokens. */
async function refreshSession(req: NextRequest) {
  const token = req.cookies.get("refresh_token")?.value;
  if (!token) return null;

  try {
    const payload = verifyRefreshToken(token);
    if (payload.type !== "refresh") return null;

    await connectDB();

    const user = await Auth.findById(payload.userId)
      .select("_id name email role isActive")
      .lean();

    // Same rule as getCurrentUser: deactivated accounts cannot refresh
    if (!user || user.isActive !== true) return null;

    const id = user._id.toString();

    return {
      user: {
        id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      access: createAccessToken(id, user.role, user.email),
      refresh: createRefreshToken(id),
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/auth/refresh?next=/team-lead/survey-data
 * Used by middleware for page navigations: repairs the session and
 * redirects back. On failure: clears cookies and goes to /login.
 */
export async function GET(req: NextRequest) {
  const rawNext = req.nextUrl.searchParams.get("next") || "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const result = await refreshSession(req);

  if (!result) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", next);
    const res = NextResponse.redirect(loginUrl);
    clearAuthCookies(res);
    return res;
  }

  const res = NextResponse.redirect(new URL(next, req.url));
  setAuthCookies(res, result.access, result.refresh);
  return res;
}

/**
 * POST /api/auth/refresh
 * Used by client code (e.g. after an API call returns 401).
 */
export async function POST(req: NextRequest) {
  const result = await refreshSession(req);

  if (!result) {
    const res = NextResponse.json(
      { success: false, message: "Invalid or expired refresh token" },
      { status: 401 }
    );
    clearAuthCookies(res);
    return res;
  }

  const res = NextResponse.json({
    success: true,
    message: "Token refreshed",
    data: result.user,
  });
  setAuthCookies(res, result.access, result.refresh);
  return res;
}