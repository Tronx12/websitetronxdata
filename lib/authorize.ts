import { NextRequest } from "next/server";
import { verifyAccessToken } from "./auth";

export function getAuthUser(req: NextRequest) {
  const token = req.cookies.get("accessToken")?.value;

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  return verifyAccessToken(token);
}

export function requireRole(
  req: NextRequest,
  roles: string[]
) {
  const user = getAuthUser(req);

  if (!roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
