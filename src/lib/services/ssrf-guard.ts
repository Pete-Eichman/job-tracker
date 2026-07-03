import net from "node:net";
import dns from "node:dns";
import { Agent } from "undici";
import { USER_MESSAGE } from "@/lib/services/scrape-guard";

/**
 * SSRF protection for outbound fetches of user-supplied URLs (job postings).
 *
 * Two layers, because a URL's host is either an IP literal or a name:
 *
 *   1. assertFetchableUrl() — synchronous. Rejects non-http(s) schemes,
 *      embedded credentials, and IP-LITERAL hosts that resolve to a blocked
 *      range (e.g. http://127.0.0.1, http://169.254.169.254). undici connects
 *      straight to an IP literal without ever calling our DNS hook, so literals
 *      must be validated here.
 *
 *   2. safeDispatcher — validates the resolved IP AT CONNECT TIME, inside the
 *      undici connector's DNS lookup, and connects to exactly that vetted IP.
 *      This is what closes DNS rebinding: there is no window between "check" and
 *      "connect" for an attacker-controlled resolver to swap a public IP for a
 *      private one, and a name that resolves to ANY blocked address is refused
 *      outright (multi-record rebinding defense). Redirect hops open new
 *      connections through the same dispatcher, so every hop is re-validated.
 *
 * Blocked attempts surface the same generic USER_MESSAGE as every other scrape
 * failure, so this guard cannot be used as an internal port scanner (no
 * distinguishable "blocked vs. unreachable" oracle).
 */

/** Tag carried by every SSRF rejection so callers can map it to USER_MESSAGE. */
export const SSRF_BLOCKED_CODE = "SSRF_BLOCKED";

function ssrfError(message: string): Error {
  return Object.assign(new Error(message), { code: SSRF_BLOCKED_CODE });
}

/** True if `err` (or anything in its `cause` chain) is an SSRF rejection. */
export function isSsrfBlockedError(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current != null && depth < 10; depth++) {
    if (
      typeof current === "object" &&
      (current as { code?: unknown }).code === SSRF_BLOCKED_CODE
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

// ---------------------------------------------------------------------------
// IP classification
// ---------------------------------------------------------------------------

function toUint32(ipv4: string): number {
  const parts = ipv4.split(".");
  if (parts.length !== 4) return NaN;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return NaN;
    const octet = Number(part);
    if (octet > 255) return NaN;
    n = n * 256 + octet;
  }
  return n >>> 0;
}

// [network base as uint32, prefix length]. Everything an outbound scraper has
// no business reaching: this-network, RFC1918 private, CGNAT, loopback,
// link-local (incl. cloud metadata 169.254.169.254), IETF/benchmark/doc
// ranges, multicast, and reserved.
const BLOCKED_V4: ReadonlyArray<readonly [number, number]> = [
  [toUint32("0.0.0.0"), 8],
  [toUint32("10.0.0.0"), 8],
  [toUint32("100.64.0.0"), 10],
  [toUint32("127.0.0.0"), 8],
  [toUint32("169.254.0.0"), 16],
  [toUint32("172.16.0.0"), 12],
  [toUint32("192.0.0.0"), 24],
  [toUint32("192.0.2.0"), 24],
  [toUint32("192.88.99.0"), 24],
  [toUint32("192.168.0.0"), 16],
  [toUint32("198.18.0.0"), 15],
  [toUint32("198.51.100.0"), 24],
  [toUint32("203.0.113.0"), 24],
  [toUint32("224.0.0.0"), 4],
  [toUint32("240.0.0.0"), 4],
];

function isBlockedV4(ipv4: string): boolean {
  const n = toUint32(ipv4);
  if (Number.isNaN(n)) return true; // unparseable → fail closed
  return BLOCKED_V4.some(([base, prefix]) => {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (n & mask) === (base & mask);
  });
}

/** Expand any IPv6 form (incl. `::` compression and embedded IPv4) to 16 bytes. */
function ipv6ToBytes(input: string): Uint8Array | null {
  // Strip a zone id (fe80::1%eth0) if present.
  const zone = input.indexOf("%");
  const ip = zone === -1 ? input : input.slice(0, zone);

  // Detect an embedded IPv4 tail (::ffff:1.2.3.4, 64:ff9b::1.2.3.4).
  let head = ip;
  let v4: number[] | null = null;
  if (ip.includes(".")) {
    const lastColon = ip.lastIndexOf(":");
    if (lastColon === -1) return null;
    const tail = ip.slice(lastColon + 1);
    const n = toUint32(tail);
    if (Number.isNaN(n)) return null;
    v4 = [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
    head = ip.slice(0, lastColon + 1); // keep trailing ':'
  }

  const hextetsNeeded = v4 ? 6 : 8;
  const doubleColon = head.indexOf("::");
  let groups: string[];
  if (doubleColon !== -1) {
    if (head.indexOf("::", doubleColon + 1) !== -1) return null; // only one '::'
    const left = head.slice(0, doubleColon).split(":").filter((s) => s !== "");
    const right = head.slice(doubleColon + 2).split(":").filter((s) => s !== "");
    const missing = hextetsNeeded - left.length - right.length;
    if (missing < 0) return null;
    groups = [...left, ...Array(missing).fill("0"), ...right];
  } else {
    groups = head.split(":").filter((s) => s !== "");
  }
  if (groups.length !== hextetsNeeded) return null;

  const bytes = new Uint8Array(16);
  let i = 0;
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    const v = parseInt(group, 16);
    bytes[i++] = (v >> 8) & 0xff;
    bytes[i++] = v & 0xff;
  }
  if (v4) {
    bytes[12] = v4[0];
    bytes[13] = v4[1];
    bytes[14] = v4[2];
    bytes[15] = v4[3];
  }
  return bytes;
}

function isBlockedV6(ip: string): boolean {
  const b = ipv6ToBytes(ip);
  if (!b) return true; // unparseable → fail closed

  const allZeroUpTo15 = b.slice(0, 15).every((x) => x === 0);
  if (allZeroUpTo15 && b[15] === 0) return true; // :: (unspecified)
  if (allZeroUpTo15 && b[15] === 1) return true; // ::1 (loopback)

  if (b[0] === 0xff) return true; // ff00::/8 multicast
  if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique-local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local

  // IPv4-mapped ::ffff:0:0/96 — unwrap and re-check the embedded IPv4.
  const mapped =
    b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff;
  // NAT64 well-known 64:ff9b::/96 — also carries an embedded IPv4.
  const nat64 =
    b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b &&
    b.slice(4, 12).every((x) => x === 0);
  if (mapped || nat64) {
    return isBlockedV4(`${b[12]}.${b[13]}.${b[14]}.${b[15]}`);
  }

  return false;
}

/**
 * True if `ip` (a numeric IPv4 or IPv6 literal) points somewhere an outbound
 * scraper must not reach. Fails closed on anything that isn't a parseable IP.
 */
export function isBlockedAddress(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) return isBlockedV4(ip);
  if (kind === 6) return isBlockedV6(ip);
  return true; // not an IP literal → fail closed
}

// ---------------------------------------------------------------------------
// URL validation (synchronous, no DNS)
// ---------------------------------------------------------------------------

/**
 * Reject a URL before any network access: bad shape, non-http(s) scheme,
 * embedded credentials, or an IP-literal host in a blocked range. Returns the
 * parsed URL on success. Throws an SSRF-tagged error carrying USER_MESSAGE.
 */
export function assertFetchableUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw ssrfError(USER_MESSAGE);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw ssrfError(USER_MESSAGE);
  }
  if (url.username !== "" || url.password !== "") {
    throw ssrfError(USER_MESSAGE);
  }

  // Bracketed IPv6 hosts arrive as "[::1]"; strip brackets before classifying.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) !== 0 && isBlockedAddress(host)) {
    throw ssrfError(USER_MESSAGE);
  }

  return url;
}

// ---------------------------------------------------------------------------
// Connect-time validating dispatcher
// ---------------------------------------------------------------------------

/**
 * A dns.lookup-shaped function (node's net.LookupFunction) for undici's
 * connector. Resolves every address for the host, refuses the whole connection
 * if ANY of them is blocked, and hands undici a single vetted address — so
 * undici connects to exactly what we validated. This is the connect-time check
 * that closes DNS rebinding.
 */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);

    for (const entry of addresses) {
      if (isBlockedAddress(entry.address)) {
        const blocked = ssrfError(`Blocked address for ${hostname}`);
        return callback(blocked as NodeJS.ErrnoException, "", 0);
      }
    }

    let chosen = addresses;
    if (options.family === 4 || options.family === 6) {
      chosen = addresses.filter((a) => a.family === options.family);
      if (chosen.length === 0) {
        const missing = Object.assign(
          new Error(`No IPv${options.family} address for ${hostname}`),
          { code: "ENOTFOUND" }
        );
        return callback(missing as NodeJS.ErrnoException, "", 0);
      }
    }

    callback(null, chosen[0].address, chosen[0].family);
  });
};

let dispatcher: Agent | undefined;

/** Lazily-created singleton undici dispatcher with the validating lookup. */
export function safeDispatcher(): Agent {
  if (!dispatcher) {
    dispatcher = new Agent({
      connect: { lookup: safeLookup, timeout: 10_000 },
    });
  }
  return dispatcher;
}
