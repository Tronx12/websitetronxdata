// middleware.ts
// ─────────────────────────────────────────────────────────
// Edge-level route protection: authentication + role-based
// access control.  Runs before every matched request.
// ─────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// ─────────────────────────────────────────────────────────
// Config – which routes this middleware applies to
// ─────────────────────────────────────────────────────────
export const config = {
  matcher: [
    // Dashboard page routes
    "/admin/:path*",
    "/hr/:path*",
    "/team-lead/:path*",
    "/survey-tester/:path*",

    // Protected API routes (everything except /api/auth/*)
    "/api/attendence/:path*",
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

/** Encode the JWT secret for jose (TextEncoder required at the edge). */
function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/** Decode & verify the access_token cookie. Returns the payload or null. */
async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret());
    return payload as { userId: string; role: string; email: string; type: string };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Role → allowed path prefixes
// ─────────────────────────────────────────────────────────

type UserRole = "survey-tester" | "team-lead" | "hr" | "admin";

const ROLE_REDIRECT: Record<UserRole, string> = {
  admin: "/admin/survey-data",
  hr: "/hr/survey-data",
  "team-lead": "/team-lead/survey-data",
  "survey-tester": "/survey-tester/survey-data",
};

/**
 * Check whether the given pathname is allowed for the role.
 * Admin has access to everything.
 */
function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  // Admin can access any route
  if (role === "admin") return true;

  if (pathname.startsWith("/admin")) return false;

  if (pathname.startsWith("/hr")) return role === "hr";

  if (pathname.startsWith("/team-lead")) return role === "team-lead";

  if (pathname.startsWith("/survey-tester")) return role === "survey-tester";

  // API routes: map API path prefixes to roles
  if (pathname.startsWith("/api/teamlead")) return role === "team-lead";

  // All other API routes are accessible to any authenticated user
  return true;
}

// ─────────────────────────────────────────────────────────
// Middleware handler
// ─────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  // ── 1. Read token ────────────────────────────────────
  const token = req.cookies.get("access_token")?.value;

  if (!token) {
    // No token → unauthenticated
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, message: "Unauthorized – please log in" },
        { status: 401 }
      );
    }

    // Page route: redirect to login, preserving the original URL
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 2. Verify token ─────────────────────────────────
  const payload = await verifyToken(token);

  if (!payload || payload.type !== "access") {
    // Invalid / expired token
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, message: "Unauthorized – invalid or expired token" },
        { status: 401 }
      );
    }

    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 3. Role-based access ─────────────────────────────
  const role = payload.role as UserRole;

  if (!isRouteAllowedForRole(pathname, role)) {
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, message: "Forbidden – insufficient permissions" },
        { status: 403 }
      );
    }

    // Page route: redirect to /unauthorized
    const unauthorizedUrl = req.nextUrl.clone();
    unauthorizedUrl.pathname = "/unauthorized";
    return NextResponse.redirect(unauthorizedUrl);
  }

  // ── 4. Inject user info into request headers ─────────
  // Downstream API route handlers / server components can read these
  // without re-verifying the JWT.
  const response = NextResponse.next();
  response.headers.set("x-user-id", payload.userId);
  response.headers.set("x-user-role", payload.role);
  response.headers.set("x-user-email", payload.email);

  return response;
}
