
import { NextRequest } from "next/server";
import { connectDB } from "@/config/db";
import IpWhitelist from "@/models/IpWhitelist";

/**
 * Get the client IP address from a Next.js request.
 *
 * Important:
 * If your app is behind a trusted reverse proxy,
 * x-forwarded-for may contain multiple addresses.
 *
 * The first address is normally the original client IP.
 */
export function getClientIp(
  request: NextRequest
): string {
  const forwardedFor =
    request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")[0]
      .trim();

    if (firstIp) {
      return firstIp;
    }
  }

  const realIp =
    request.headers.get("x-real-ip");

  if (realIp) {
    return realIp.trim();
  }

  return "";
}

/**
 * Check whether the request comes from
 * an active whitelisted IP address.
 */
export async function isIpWhitelisted(
  request: NextRequest
): Promise<boolean> {
  try {
    const clientIp = getClientIp(request);

    if (!clientIp) {
      console.warn(
        "IP WHITELIST: Unable to determine client IP"
      );

      return false;
    }

    await connectDB();

    const whitelistedIp =
      await IpWhitelist.findOne({
        ipAddress: clientIp,
        isActive: true,
      }).lean();

    const allowed = Boolean(
      whitelistedIp
    );

    console.log(
      "IP WHITELIST CHECK:",
      {
        clientIp,
        allowed,
        network:
          whitelistedIp?.name || null,
      }
    );

    return allowed;
  } catch (error) {
    console.error(
      "IP WHITELIST CHECK ERROR:",
      error
    );

    /*
     * Fail closed.
     *
     * If the database or IP verification
     * fails, attendance should NOT be allowed.
     */
    return false;
  }
}

/**
 * Get complete whitelist information
 * for logging/debugging.
 */
export async function getIpWhitelistStatus(
  request: NextRequest
) {
  try {
    const clientIp = getClientIp(request);

    if (!clientIp) {
      return {
        allowed: false,
        clientIp: "",
        network: null,
      };
    }

    await connectDB();

    const record =
      await IpWhitelist.findOne({
        ipAddress: clientIp,
        isActive: true,
      }).lean();

    return {
      allowed: Boolean(record),
      clientIp,
      network: record
        ? {
            id: String(record._id),
            name: record.name,
            ipAddress:
              record.ipAddress,
            isActive:
              record.isActive,
          }
        : null,
    };
  } catch (error) {
    console.error(
      "GET IP WHITELIST STATUS ERROR:",
      error
    );

    return {
      allowed: false,
      clientIp: "",
      network: null,
    };
  }
}

