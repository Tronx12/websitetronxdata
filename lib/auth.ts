import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export function createAccessToken(userId: string, role: string) {
  return jwt.sign(
    {
      userId,
      role,
      type: "access",
    },
    ACCESS_SECRET,
    {
      expiresIn: "15m",
    }
  );
}

export function createRefreshToken(userId: string) {
  return jwt.sign(
    {
      userId,
      type: "refresh",
    },
    REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, ACCESS_SECRET) as {
    userId: string;
    role: string;
    type: string;
  };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET) as {
    userId: string;
    type: string;
  };
}
