import { describe, it, expect } from "vitest";
import {
  jobStaleness,
  formatRelativeDays,
  stalenessTextColor,
} from "@/lib/staleness";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-05-18T12:00:00.000Z");

function daysAgo(days: number, hours = 0): Date {
  return new Date(NOW.getTime() - days * DAY_MS - hours * 60 * 60 * 1000);
}

describe("jobStaleness", () => {
  it("returns null for SAVED regardless of age", () => {
    expect(jobStaleness("SAVED", daysAgo(30), NOW)).toBeNull();
  });

  it("returns null for OFFER regardless of age", () => {
    expect(jobStaleness("OFFER", daysAgo(30), NOW)).toBeNull();
  });

  it("returns null for REJECTED regardless of age", () => {
    expect(jobStaleness("REJECTED", daysAgo(30), NOW)).toBeNull();
  });

  it("returns null for WITHDRAWN regardless of age", () => {
    expect(jobStaleness("WITHDRAWN", daysAgo(30), NOW)).toBeNull();
  });

  it("returns 'fresh' for APPLIED 0 days ago", () => {
    expect(jobStaleness("APPLIED", daysAgo(0), NOW)).toBe("fresh");
  });

  it("returns 'fresh' for APPLIED 6 days ago", () => {
    expect(jobStaleness("APPLIED", daysAgo(6), NOW)).toBe("fresh");
  });

  it("returns 'aging' for APPLIED 7 days ago (lower boundary)", () => {
    expect(jobStaleness("APPLIED", daysAgo(7), NOW)).toBe("aging");
  });

  it("returns 'aging' for APPLIED 13 days ago", () => {
    expect(jobStaleness("APPLIED", daysAgo(13), NOW)).toBe("aging");
  });

  it("returns 'stale' for APPLIED 14 days ago (upper boundary)", () => {
    expect(jobStaleness("APPLIED", daysAgo(14), NOW)).toBe("stale");
  });

  it("returns 'stale' for APPLIED 30 days ago", () => {
    expect(jobStaleness("APPLIED", daysAgo(30), NOW)).toBe("stale");
  });

  it("treats PHONE_SCREEN as in-flight", () => {
    expect(jobStaleness("PHONE_SCREEN", daysAgo(10), NOW)).toBe("aging");
  });

  it("treats TECHNICAL as in-flight", () => {
    expect(jobStaleness("TECHNICAL", daysAgo(20), NOW)).toBe("stale");
  });

  it("treats ONSITE as in-flight", () => {
    expect(jobStaleness("ONSITE", daysAgo(1), NOW)).toBe("fresh");
  });
});

describe("formatRelativeDays", () => {
  it("renders the same calendar moment as 'today'", () => {
    expect(formatRelativeDays(NOW, NOW)).toBe("today");
  });

  it("renders a few hours earlier as 'today'", () => {
    expect(formatRelativeDays(daysAgo(0, 6), NOW)).toBe("today");
  });

  it("renders 1 day ago as 'yesterday'", () => {
    expect(formatRelativeDays(daysAgo(1), NOW)).toBe("yesterday");
  });

  it("renders 2 days ago as '2d ago'", () => {
    expect(formatRelativeDays(daysAgo(2), NOW)).toBe("2d ago");
  });

  it("renders 6 days ago as '6d ago'", () => {
    expect(formatRelativeDays(daysAgo(6), NOW)).toBe("6d ago");
  });

  it("renders 7 days ago as '1w ago'", () => {
    expect(formatRelativeDays(daysAgo(7), NOW)).toBe("1w ago");
  });

  it("renders 29 days ago as '4w ago'", () => {
    expect(formatRelativeDays(daysAgo(29), NOW)).toBe("4w ago");
  });

  it("renders 30 days ago as '1mo ago'", () => {
    expect(formatRelativeDays(daysAgo(30), NOW)).toBe("1mo ago");
  });

  it("renders 90 days ago as '3mo ago'", () => {
    expect(formatRelativeDays(daysAgo(90), NOW)).toBe("3mo ago");
  });

  it("renders 400 days ago as '1y ago'", () => {
    expect(formatRelativeDays(daysAgo(400), NOW)).toBe("1y ago");
  });
});

describe("stalenessTextColor", () => {
  it("returns muted gray for null", () => {
    expect(stalenessTextColor(null)).toBe("text-gray-400");
  });

  it("returns slate gray for fresh", () => {
    expect(stalenessTextColor("fresh")).toBe("text-gray-500");
  });

  it("returns amber for aging", () => {
    expect(stalenessTextColor("aging")).toBe("text-amber-700");
  });

  it("returns red for stale", () => {
    expect(stalenessTextColor("stale")).toBe("text-red-700");
  });
});
