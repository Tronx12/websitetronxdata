// import { NextRequest } from "next/server";
// import { verifyAccessToken } from "./auth";

// export function getAuthUser(req: NextRequest) {
//   const token = req.cookies.get("accessToken")?.value;

//   if (!token) {
//     throw new Error("UNAUTHORIZED");
//   }

//   return verifyAccessToken(token);
// }

// export function requireRole(
//   req: NextRequest,
//   roles: string[]
// ) {
//   const user = getAuthUser(req);

//   if (!roles.includes(user.role)) {
//     throw new Error("FORBIDDEN");
//   }

//   return user;
// }


import { NextRequest } from "next/server";
import { verifyAccessToken } from "./auth";

/**
 * Returns the authenticated user from the access_token cookie.
 * Always throws Error("UNAUTHORIZED") on any failure, so route handlers
 * can map it to a 401 (jsonwebtoken's own errors would otherwise leak as 500s).
 */
export function getAuthUser(req: NextRequest) {
  // Must match the cookie name set by the login API and used in middleware.
  const token = req.cookies.get("access_token")?.value;

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  try {
    return verifyAccessToken(token);
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}

export function requireRole(req: NextRequest, roles: string[]) {
  const user = getAuthUser(req);

  if (!roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}