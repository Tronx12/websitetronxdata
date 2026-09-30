import { NextRequest } from "next/server";
import IpWhitelist from "@/models/IpWhitelist";
import { connectDB } from "@/config/db";

function normalizeIp(ip: string): string {
  let value = ip.trim();

  // Remove IPv4-mapped IPv6 prefix
  if (value.startsWith("::ffff:")) {
    value = value.substring(7);
  }

  // Normalize localhost IPv6
  if (value === "::1") {
    return "::1";
  }

  return value;
}

export function getClientIp(request: NextRequest): string {
  // Production/proxy
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();

    if (ip) {
      return normalizeIp(ip);
    }
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) {
    return normalizeIp(realIp);
  }

  // Next.js development fallback
  const directIp =
    request.headers.get("x-client-ip") ||
    request.headers.get("x-real-ip") ||
    "";

  return normalizeIp(directIp);
}

export async function isIpWhitelisted(
  ipAddress: string
): Promise<boolean> {
  await connectDB();

  const ip = normalizeIp(ipAddress);

  if (!ip || ip === "::1" || ip === "127.0.0.1") {
    return false;
  }

  const record = await IpWhitelist.findOne({
    ipAddress: ip,
    isActive: true,
  }).lean();

  return !!record;
}

export async function checkIpWhitelist(
  request: NextRequest
) {
  const ip = getClientIp(request);

  const allowed = await isIpWhitelisted(ip);

  return {
    ip,
    allowed,
  };
}