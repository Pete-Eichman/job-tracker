import { describe, it, expect } from "vitest";
import { needsAttention } from "@/lib/follow-up";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-05-19T12:00:00Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * DAY_MS);
}

describe("needsAttention", () => {
  it("returns false for SAVED at 13 days", () => {
    expect(needsAttention("SAVED", daysAgo(13), NOW)).toBe(false);
  });

  it("returns true for SAVED at exactly 14 days (boundary)", () => {
    expect(needsAttention("SAVED", daysAgo(14), NOW)).toBe(true);
  });

  it("returns true for SAVED at 15 days", () => {
    expect(needsAttention("SAVED", daysAgo(15), NOW)).toBe(true);
  });

  it("returns false for APPLIED at 9 days", () => {
    expect(needsAttention("APPLIED", daysAgo(9), NOW)).toBe(false);
  });

  it("returns true for APPLIED at exactly 10 days (boundary)", () => {
    expect(needsAttention("APPLIED", daysAgo(10), NOW)).toBe(true);
  });

  it("returns true for APPLIED at 11 days", () => {
    expect(needsAttention("APPLIED", daysAgo(11), NOW)).toBe(true);
  });

  it("returns false for PHONE_SCREEN at 6 days", () => {
    expect(needsAttention("PHONE_SCREEN", daysAgo(6), NOW)).toBe(false);
  });

  it("returns true for PHONE_SCREEN at exactly 7 days (boundary)", () => {
    expect(needsAttention("PHONE_SCREEN", daysAgo(7), NOW)).toBe(true);
  });

  it("returns true for TECHNICAL at 7 days (parity)", () => {
    expect(needsAttention("TECHNICAL", daysAgo(7), NOW)).toBe(true);
  });

  it("returns true for ONSITE at 7 days (parity)", () => {
    expect(needsAttention("ONSITE", daysAgo(7), NOW)).toBe(true);
  });

  it("returns false for OFFER at 30 days (terminal)", () => {
    expect(needsAttention("OFFER", daysAgo(30), NOW)).toBe(false);
  });

  it("returns false for REJECTED at 30 days (terminal)", () => {
    expect(needsAttention("REJECTED", daysAgo(30), NOW)).toBe(false);
  });

  it("returns false for WITHDRAWN at 30 days (terminal)", () => {
    expect(needsAttention("WITHDRAWN", daysAgo(30), NOW)).toBe(false);
  });

  it("accepts default now parameter", () => {
    expect(typeof needsAttention("SAVED", daysAgo(1))).toBe("boolean");
  });
});
