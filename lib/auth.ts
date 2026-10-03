// import jwt from "jsonwebtoken";

// const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
// const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

// export function createAccessToken(
//   userId: string,
//   role: string,
//   email: string
// ) {
//   return jwt.sign(
//     {
//       userId,
//       role,
//       email,
//       type: "access",
//     },
//     ACCESS_SECRET,
//     {
//       expiresIn: "1d",
//     }
//   );
// }

// export function createRefreshToken(userId: string) {
//   return jwt.sign(
//     {
//       userId,
//       type: "refresh",
//     },
//     REFRESH_SECRET,
//     {
//       expiresIn: "30d",
//     }
//   );
// }

// export function verifyAccessToken(token: string) {
//   return jwt.verify(token, ACCESS_SECRET) as {
//     userId: string;
//     role: string;
//     email: string;
//     type: "access";
//   };
// }

// export function verifyRefreshToken(token: string) {
//   return jwt.verify(token, REFRESH_SECRET) as {
//     userId: string;
//     type: "refresh";
//   };
// }

import jwt from "jsonwebtoken";

type SecretName = "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET";

/** Read secrets lazily so a missing env var gives a clear error at use time. */
function getSecret(name: SecretName): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

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
    getSecret("JWT_ACCESS_SECRET"),
    {
      algorithm: "HS256",
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
    getSecret("JWT_REFRESH_SECRET"),
    {
      algorithm: "HS256",
      expiresIn: "30d",
    }
  );
}

export function verifyAccessToken(token: string) {
  const payload = jwt.verify(token, getSecret("JWT_ACCESS_SECRET"), {
    algorithms: ["HS256"],
  }) as {
    userId: string;
    role: string;
    email: string;
    type: "access";
  };

  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }

  return payload;
}

export function verifyRefreshToken(token: string) {
  const payload = jwt.verify(token, getSecret("JWT_REFRESH_SECRET"), {
    algorithms: ["HS256"],
  }) as {
    userId: string;
    type: "refresh";
  };

  if (payload.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  return payload;
}