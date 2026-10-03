// // middleware.ts
// // ─────────────────────────────────────────────────────────
// // Edge-level route protection: authentication + role-based
// // access control.  Runs before every matched request.
// // ─────────────────────────────────────────────────────────

// import { NextRequest, NextResponse } from "next/server";
// import { jwtVerify } from "jose";

// // ─────────────────────────────────────────────────────────
// // Config – which routes this middleware applies to
// // ─────────────────────────────────────────────────────────
// export const config = {
//   matcher: [
//     // Dashboard page routes
//     "/admin/:path*",
//     "/hr/:path*",
//     "/team-lead/:path*",
//     "/senior-teamlead/:path*",
//     "/data-quality-analyst/:path*",
//     "/survey-tester/:path*",

//     // Protected API routes (everything except /api/auth/*)
//     "/api/attendence/:path*",
//     "/api/audit-logs/:path*",
//     "/api/cron/:path*",
//     "/api/ip-whitelist/:path*",
//     "/api/missing-attendance/:path*",
//     "/api/notifications/:path*",
//     "/api/office-off/:path*",
//     "/api/shifts/:path*",
//     "/api/survey/:path*",
//     "/api/SurveyData/:path*",
//     "/api/teamlead/:path*",
//     "/api/teams/:path*",
//     "/api/weekly-off/:path*",
//     "/api/apps-script/:path*",
//   ],
// };

// // ─────────────────────────────────────────────────────────
// // Helpers
// // ─────────────────────────────────────────────────────────

// /** Encode the JWT secret for jose (TextEncoder required at the edge). */
// function getAccessSecret() {
//   const secret = process.env.JWT_ACCESS_SECRET;
//   if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
//   return new TextEncoder().encode(secret);
// }

// /** Decode & verify the access_token cookie. Returns the payload or null. */
// async function verifyToken(token: string) {
//   try {
//     const { payload } = await jwtVerify(token, getAccessSecret());
//     return payload as { userId: string; role: string; email: string; type: string };
//   } catch {
//     return null;
//   }
// }

// // ─────────────────────────────────────────────────────────
// // Role → allowed path prefixes
// // ─────────────────────────────────────────────────────────

// type UserRole = "survey-tester" | "team-lead" | "senior-teamlead" | "data-quality-analyst" | "hr" | "admin";

// const ROLE_REDIRECT: Record<UserRole, string> = {
//   admin: "/admin/survey-data",
//   hr: "/hr/survey-data",
//   "team-lead": "/team-lead/survey-data",
//   "senior-teamlead": "/senior-teamlead/survey-data",
//   "data-quality-analyst": "/data-quality-analyst/survey-data",
//   "survey-tester": "/survey-tester/survey-data",
// };

// /**
//  * Check whether the given pathname is allowed for the role.
//  * Admin has access to everything.
//  */
// function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
//   // Admin can access any route
//   if (role === "admin") return true;

//   if (pathname.startsWith("/admin")) return false;

//   if (pathname.startsWith("/hr")) return role === "hr";

//   if (pathname.startsWith("/team-lead")) return role === "team-lead";

//   if (pathname.startsWith("/senior-teamlead")) return role === "senior-teamlead";

//   if (pathname.startsWith("/data-quality-analyst")) return role === "data-quality-analyst";

//   if (pathname.startsWith("/survey-tester")) return role === "survey-tester";

//   // API routes: map API path prefixes to roles
//   if (pathname.startsWith("/api/teamlead")) return role === "team-lead";

//   // All other API routes are accessible to any authenticated user
//   return true;
// }

// // ─────────────────────────────────────────────────────────
// // Middleware handler
// // ─────────────────────────────────────────────────────────

// export async function middleware(req: NextRequest) {
//   const { pathname } = req.nextUrl;
//   const isApiRoute = pathname.startsWith("/api/");

//   // ── 1. Read token ────────────────────────────────────
//   const token = req.cookies.get("access_token")?.value;

//   if (!token) {
//     // No token → unauthenticated
//     if (isApiRoute) {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized – please log in" },
//         { status: 401 }
//       );
//     }

//     // Page route: redirect to login, preserving the original URL
//     const loginUrl = req.nextUrl.clone();
//     loginUrl.pathname = "/login";
//     loginUrl.searchParams.set("callbackUrl", pathname);
//     return NextResponse.redirect(loginUrl);
//   }

//   // ── 2. Verify token ─────────────────────────────────
//   const payload = await verifyToken(token);

//   if (!payload || payload.type !== "access") {
//     // Invalid / expired token
//     if (isApiRoute) {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized – invalid or expired token" },
//         { status: 401 }
//       );
//     }

//     const loginUrl = req.nextUrl.clone();
//     loginUrl.pathname = "/login";
//     loginUrl.searchParams.set("callbackUrl", pathname);
//     return NextResponse.redirect(loginUrl);
//   }

//   // ── 3. Role-based access ─────────────────────────────
//   const role = payload.role as UserRole;

//   if (!isRouteAllowedForRole(pathname, role)) {
//     if (isApiRoute) {
//       return NextResponse.json(
//         { success: false, message: "Forbidden – insufficient permissions" },
//         { status: 403 }
//       );
//     }

//     // Page route: redirect to /unauthorized
//     const unauthorizedUrl = req.nextUrl.clone();
//     unauthorizedUrl.pathname = "/unauthorized";
//     return NextResponse.redirect(unauthorizedUrl);
//   }

//   // ── 4. Inject user info into request headers ─────────
//   // Downstream API route handlers / server components can read these
//   // without re-verifying the JWT.
//   const response = NextResponse.next();
//   response.headers.set("x-user-id", payload.userId);
//   response.headers.set("x-user-role", payload.role);
//   response.headers.set("x-user-email", payload.email);

//   return response;
// }


// middleware.ts
// ─────────────────────────────────────────────────────────
// Edge-level route protection: authentication + role-based
// access control. Runs before every matched request.
//
// Session repair: when the access token is missing/expired
// but a valid refresh token exists, page requests are sent to
// GET /api/auth/refresh, which re-issues cookies (needs the DB,
// so it cannot run here at the edge) and redirects back.
// ─────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const config = {
  matcher: [
    // Dashboard page routes
    "/admin/:path*",
    "/hr/:path*",
    "/team-lead/:path*",
    "/senior-teamlead/:path*",
    "/data-quality-analyst/:path*",
    "/survey-tester/:path*",

    // Protected API routes (everything except /api/auth/*)
    "/api/attendence/:path*", // check spelling matches your folder name
    "/api/audit-logs/:path*",
    "/api/cron/:path*",
    "/api/ip-whitelist/:path*",
    "/api/missing-attendance/:path*",
    "/api/notifications/:path*",
    "/api/office-off/:path*",
    "/api/shifts/:path*",
    "/api/survey/:path*",
    "/api/SurveyData/:path*",
    "/api/teamlead/:path*",
    "/api/teams/:path*",
    "/api/weekly-off/:path*",
    "/api/apps-script/:path*",
  ],
};

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const encode = (secret: string) => new TextEncoder().encode(secret);

async function verifyAccess(token: string) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, encode(secret));
    if (payload.type !== "access") return null;

    return payload as unknown as {
      userId: string;
      role: string;
      email: string;
      type: string;
    };
  } catch {
    return null;
  }
}

async function hasValidRefresh(req: NextRequest) {
  const token = req.cookies.get("refresh_token")?.value;
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!token || !secret) return false;

  try {
    const { payload } = await jwtVerify(token, encode(secret));
    return payload.type === "refresh";
  } catch {
    return false;
  }
}

type UserRole =
  | "survey-tester"
  | "team-lead"
  | "senior-teamlead"
  | "data-quality-analyst"
  | "hr"
  | "admin";

/** Exact section match: "/hr" matches "/hr" and "/hr/x", not "/hrx". */
const inSection = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(base + "/");

function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  if (role === "admin") return true;

  if (inSection(pathname, "/admin")) return false;
  if (inSection(pathname, "/hr")) return role === "hr";
  if (inSection(pathname, "/team-lead")) return role === "team-lead";
  if (inSection(pathname, "/senior-teamlead")) return role === "senior-teamlead";
  if (inSection(pathname, "/data-quality-analyst")) return role === "data-quality-analyst";
  if (inSection(pathname, "/survey-tester")) return role === "survey-tester";

  if (inSection(pathname, "/api/teamlead")) return role === "team-lead";

  return true;
}

/**
 * Not authenticated (no / bad access token).
 * - API: 401 JSON (client interceptor can call POST /api/auth/refresh)
 * - Page + valid refresh token: repair session via GET /api/auth/refresh
 * - Page, nothing valid: go to /login and clear dead cookies
 */
async function unauthenticated(req: NextRequest, message: string) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ success: false, message }, { status: 401 });
  }

  if (await hasValidRefresh(req)) {
    const refreshUrl = req.nextUrl.clone();
    refreshUrl.pathname = "/api/auth/refresh";
    refreshUrl.search = "";
    refreshUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(refreshUrl);
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("callbackUrl", pathname + search);

  const res = NextResponse.redirect(loginUrl);
  res.cookies.delete("access_token");
  res.cookies.delete("refresh_token");
  return res;
}

// ─────────────────────────────────────────────────────────
// Middleware handler
// ─────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  // 1. Read token
  const token = req.cookies.get("access_token")?.value;
  if (!token) {
    return unauthenticated(req, "Unauthorized – please log in");
  }

  // 2. Verify token
  const payload = await verifyAccess(token);
  if (!payload) {
    return unauthenticated(req, "Unauthorized – invalid or expired token");
  }

  // 3. Role-based access
  const role = payload.role as UserRole;

  if (!isRouteAllowedForRole(pathname, role)) {
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, message: "Forbidden – insufficient permissions" },
        { status: 403 }
      );
    }

    const unauthorizedUrl = req.nextUrl.clone();
    unauthorizedUrl.pathname = "/unauthorized";
    unauthorizedUrl.search = "";
    return NextResponse.redirect(unauthorizedUrl);
  }

  // 4. Forward user info to route handlers / server components.
  // These must go on the REQUEST headers (not the response), and any
  // client-supplied x-user-* headers are overwritten so they can't be spoofed.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-email", payload.email);

  return NextResponse.next({ request: { headers: requestHeaders } });
}