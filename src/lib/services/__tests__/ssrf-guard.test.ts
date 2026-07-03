import { describe, it, expect } from "vitest";
import {
  isBlockedAddress,
  assertFetchableUrl,
  isSsrfBlockedError,
  SSRF_BLOCKED_CODE,
} from "@/lib/services/ssrf-guard";

const USER_MESSAGE = "Could not read this posting — paste the text directly.";

describe("isBlockedAddress — allowed public addresses", () => {
  it.each([
    "8.8.8.8", // Google DNS
    "1.1.1.1", // Cloudflare DNS
    "93.184.216.34", // example.com
    "140.82.112.3", // github.com range
    "99.255.255.255", // just below CGNAT 100.64/10
    "2606:4700:4700::1111", // Cloudflare IPv6
    "2001:4860:4860::8888", // Google IPv6
  ])("allows %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

describe("isBlockedAddress — blocked IPv4 ranges", () => {
  it.each([
    ["loopback", "127.0.0.1"],
    ["loopback high", "127.255.255.254"],
    ["this-network", "0.0.0.0"],
    ["private 10/8", "10.0.0.1"],
    ["private 172.16/12", "172.16.5.4"],
    ["private 172.31 edge", "172.31.255.255"],
    ["private 192.168/16", "192.168.1.1"],
    ["cloud metadata", "169.254.169.254"],
    ["link-local", "169.254.0.1"],
    ["CGNAT 100.64/10", "100.64.0.1"],
    ["CGNAT edge", "100.127.255.255"],
    ["benchmarking 198.18/15", "198.19.0.1"],
    ["multicast", "224.0.0.1"],
    ["reserved 240/4", "240.0.0.1"],
    ["broadcast", "255.255.255.255"],
  ])("blocks %s (%s)", (_label, ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it("does NOT block 172.32.0.0 (just outside 172.16/12)", () => {
    expect(isBlockedAddress("172.32.0.0")).toBe(false);
  });
  it("does NOT block 100.128.0.0 (just outside 100.64/10)", () => {
    expect(isBlockedAddress("100.128.0.0")).toBe(false);
  });
});

describe("isBlockedAddress — blocked IPv6 ranges", () => {
  it.each([
    ["loopback", "::1"],
    ["unspecified", "::"],
    ["unique-local fc00/7", "fc00::1"],
    ["unique-local fd", "fd12:3456:789a::1"],
    ["link-local fe80/10", "fe80::1"],
    ["link-local with zone", "fe80::1%eth0"],
    ["multicast", "ff02::1"],
  ])("blocks %s (%s)", (_label, ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it("blocks the IPv4-mapped loopback bypass ::ffff:127.0.0.1", () => {
    expect(isBlockedAddress("::ffff:127.0.0.1")).toBe(true);
  });
  it("blocks IPv4-mapped private ::ffff:10.0.0.1", () => {
    expect(isBlockedAddress("::ffff:10.0.0.1")).toBe(true);
  });
  it("blocks IPv4-mapped metadata ::ffff:169.254.169.254", () => {
    expect(isBlockedAddress("::ffff:169.254.169.254")).toBe(true);
  });
  it("blocks NAT64-embedded private 64:ff9b::10.0.0.1", () => {
    expect(isBlockedAddress("64:ff9b::10.0.0.1")).toBe(true);
  });
  it("allows an IPv4-mapped PUBLIC address ::ffff:8.8.8.8", () => {
    expect(isBlockedAddress("::ffff:8.8.8.8")).toBe(false);
  });
});

describe("isBlockedAddress — fail closed on non-IP input", () => {
  it.each(["", "not-an-ip", "example.com", "999.999.999.999"])(
    "blocks %s",
    (value) => {
      expect(isBlockedAddress(value)).toBe(true);
    }
  );
});

describe("assertFetchableUrl", () => {
  it("accepts a normal https job URL", () => {
    expect(() =>
      assertFetchableUrl("https://boards.greenhouse.io/acme/jobs/12345")
    ).not.toThrow();
  });
  it("accepts a normal http URL", () => {
    expect(() => assertFetchableUrl("http://example.com/careers")).not.toThrow();
  });

  it.each([
    ["file scheme", "file:///etc/passwd"],
    ["ftp scheme", "ftp://example.com/x"],
    ["gopher scheme", "gopher://example.com"],
    ["embedded credentials", "http://user:pass@example.com"],
    ["garbage", "not a url"],
    ["IP-literal loopback", "http://127.0.0.1/"],
    ["IP-literal loopback port", "http://127.0.0.1:8080/admin"],
    ["IP-literal metadata", "http://169.254.169.254/latest/meta-data/"],
    ["IP-literal private", "http://10.0.0.1/"],
    ["IP-literal 0.0.0.0", "http://0.0.0.0/"],
    ["bracketed IPv6 loopback", "http://[::1]/"],
    ["bracketed IPv6 mapped bypass", "http://[::ffff:127.0.0.1]/"],
  ])("rejects %s with the generic message", (_label, url) => {
    expect(() => assertFetchableUrl(url)).toThrow(USER_MESSAGE);
  });

  it("allows an IP-literal PUBLIC host", () => {
    expect(() => assertFetchableUrl("http://93.184.216.34/")).not.toThrow();
  });

  it("tags rejections with the SSRF code", () => {
    try {
      assertFetchableUrl("http://127.0.0.1/");
      throw new Error("should have thrown");
    } catch (err) {
      expect(isSsrfBlockedError(err)).toBe(true);
      expect((err as { code?: string }).code).toBe(SSRF_BLOCKED_CODE);
    }
  });
});

describe("isSsrfBlockedError", () => {
  it("detects a tagged error", () => {
    expect(isSsrfBlockedError(Object.assign(new Error("x"), { code: SSRF_BLOCKED_CODE }))).toBe(true);
  });
  it("detects a tagged error nested in a cause chain", () => {
    const inner = Object.assign(new Error("blocked"), { code: SSRF_BLOCKED_CODE });
    const outer = Object.assign(new TypeError("fetch failed"), { cause: inner });
    expect(isSsrfBlockedError(outer)).toBe(true);
  });
  it("ignores unrelated errors", () => {
    expect(isSsrfBlockedError(new Error("network down"))).toBe(false);
    expect(isSsrfBlockedError(null)).toBe(false);
    expect(isSsrfBlockedError(undefined)).toBe(false);
  });
});
