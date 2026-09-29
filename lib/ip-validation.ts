
import net from "net";

/**
 * Validate an IPv4 or IPv6 address.
 */
export function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== "string") {
    return false;
  }

  return net.isIP(ip.trim()) !== 0;
}

