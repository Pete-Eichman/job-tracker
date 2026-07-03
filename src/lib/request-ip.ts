import { headers } from "next/headers";

const UNKNOWN_IP = "unknown";

/**
 * Derive the client IP from proxy headers. Pure and unit-testable.
 *
 * `x-forwarded-for` is a comma-separated list (client, proxy1, proxy2, …); the
 * left-most entry is the original client. Falls back to `x-real-ip`, then to a
 * constant so callers always get a usable rate-limit key.
 */
export function parseClientIp(
  forwardedFor: string | null,
  realIp: string | null
): string {
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = realIp?.trim();
  if (real) return real;
  return UNKNOWN_IP;
}

/** Client IP for the current request, from Next's request headers. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return parseClientIp(h.get("x-forwarded-for"), h.get("x-real-ip"));
}
