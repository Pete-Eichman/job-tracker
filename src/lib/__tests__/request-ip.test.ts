import { describe, it, expect } from "vitest";
import { parseClientIp } from "@/lib/request-ip";

describe("parseClientIp", () => {
  it("takes the left-most IP from x-forwarded-for", () => {
    expect(parseClientIp("1.2.3.4, 5.6.7.8, 9.10.11.12", null)).toBe("1.2.3.4");
  });

  it("trims whitespace around the forwarded IP", () => {
    expect(parseClientIp("  1.2.3.4  ,  5.6.7.8", null)).toBe("1.2.3.4");
  });

  it("handles a single forwarded IP", () => {
    expect(parseClientIp("203.0.113.5", null)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    expect(parseClientIp(null, "9.9.9.9")).toBe("9.9.9.9");
  });

  it("prefers x-forwarded-for over x-real-ip when both are present", () => {
    expect(parseClientIp("1.2.3.4", "9.9.9.9")).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is empty/whitespace", () => {
    expect(parseClientIp("   ", "9.9.9.9")).toBe("9.9.9.9");
  });

  it("returns 'unknown' when no headers are present", () => {
    expect(parseClientIp(null, null)).toBe("unknown");
  });

  it("returns 'unknown' when both headers are empty", () => {
    expect(parseClientIp("", "")).toBe("unknown");
  });
});
