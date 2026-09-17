import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export function createAccessToken(
  userId: string,
  role: string,
  email: string
) {
  return jwt.sign(
    {
      userId,
      role,
      email,
      type: "access",
    },
    ACCESS_SECRET,
    {
      expiresIn: "1d",
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
      expiresIn: "30d",
    }
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, ACCESS_SECRET) as {
    userId: string;
    role: string;
    email: string;
    type: "access";
  };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET) as {
    userId: string;
    type: "refresh";
  };
}