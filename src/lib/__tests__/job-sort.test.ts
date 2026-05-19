import { describe, it, expect } from "vitest";
import {
  parseJobSort,
  prismaOrderBy,
  compareByStale,
  compareByScore,
  sortHref,
  sortLabel,
} from "@/lib/job-sort";
import type { JobStatus } from "@/generated/prisma/enums";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-05-18T12:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS);
}

function job(
  status: JobStatus,
  daysSinceTouched: number,
  score: number | null = null
): { status: JobStatus; updatedAt: Date; matches: { score: number }[] } {
  return {
    status,
    updatedAt: daysAgo(daysSinceTouched),
    matches: score === null ? [] : [{ score }],
  };
}

describe("parseJobSort", () => {
  it("falls back to 'created' for undefined", () => {
    expect(parseJobSort(undefined)).toBe("created");
  });

  it("falls back to 'created' for empty string", () => {
    expect(parseJobSort("")).toBe("created");
  });

  it("falls back to 'created' for an invalid value", () => {
    expect(parseJobSort("invalid")).toBe("created");
  });

  it("accepts each valid sort value", () => {
    expect(parseJobSort("created")).toBe("created");
    expect(parseJobSort("applied")).toBe("applied");
    expect(parseJobSort("updated")).toBe("updated");
    expect(parseJobSort("stale")).toBe("stale");
    expect(parseJobSort("score")).toBe("score");
  });

  it("uses the first element of an array param", () => {
    expect(parseJobSort(["stale", "score"])).toBe("stale");
  });
});

describe("prismaOrderBy", () => {
  it("returns the createdAt clause for 'created'", () => {
    expect(prismaOrderBy("created")).toEqual({ createdAt: "desc" });
  });

  it("returns the updatedAt clause for 'updated'", () => {
    expect(prismaOrderBy("updated")).toEqual({ updatedAt: "desc" });
  });

  it("returns the appliedAt nulls-last clause for 'applied'", () => {
    expect(prismaOrderBy("applied")).toEqual({
      appliedAt: { sort: "desc", nulls: "last" },
    });
  });

  it("returns null for 'stale' (in-app sort)", () => {
    expect(prismaOrderBy("stale")).toBeNull();
  });

  it("returns null for 'score' (in-app sort)", () => {
    expect(prismaOrderBy("score")).toBeNull();
  });
});

describe("compareByStale", () => {
  it("ranks stale APPLIED before fresh APPLIED", () => {
    const stale = job("APPLIED", 20);
    const fresh = job("APPLIED", 1);
    expect(compareByStale(stale, fresh, NOW)).toBeLessThan(0);
    expect(compareByStale(fresh, stale, NOW)).toBeGreaterThan(0);
  });

  it("breaks ties within the 'stale' bucket by oldest updatedAt first", () => {
    const older = job("APPLIED", 30);
    const newer = job("APPLIED", 20);
    expect(compareByStale(older, newer, NOW)).toBeLessThan(0);
  });

  it("ranks any in-flight job before a non-in-flight job", () => {
    const inFlightStale = job("APPLIED", 30);
    const offerToday = job("OFFER", 0);
    expect(compareByStale(inFlightStale, offerToday, NOW)).toBeLessThan(0);
  });

  it("ranks aging APPLIED ahead of fresh APPLIED", () => {
    const aging = job("APPLIED", 10);
    const fresh = job("APPLIED", 2);
    expect(compareByStale(aging, fresh, NOW)).toBeLessThan(0);
  });

  it("ties two non-in-flight jobs on category then orders by oldest first", () => {
    const olderOffer = job("OFFER", 10);
    const newerOffer = job("OFFER", 1);
    expect(compareByStale(olderOffer, newerOffer, NOW)).toBeLessThan(0);
  });
});

describe("compareByScore", () => {
  it("sorts higher score first", () => {
    expect(compareByScore(job("APPLIED", 0, 90), job("APPLIED", 0, 50))).toBe(
      -40
    );
  });

  it("sinks jobs with no match to the bottom", () => {
    const scored = job("APPLIED", 0, 50);
    const unscored = job("APPLIED", 0, null);
    expect(compareByScore(scored, unscored)).toBeLessThan(0);
    expect(compareByScore(unscored, scored)).toBeGreaterThan(0);
  });

  it("ties two unscored jobs", () => {
    expect(
      compareByScore(job("APPLIED", 0, null), job("APPLIED", 0, null))
    ).toBe(0);
  });
});

describe("sortHref", () => {
  it("returns the bare path for 'created' with no filter or query", () => {
    expect(sortHref("created", [], "")).toBe("/dashboard");
  });

  it("encodes the sort param when it's not the default", () => {
    expect(sortHref("stale", [], "")).toBe("/dashboard?sort=stale");
  });

  it("combines status and sort params", () => {
    const href = sortHref("stale", ["SAVED"], "");
    expect(href).toContain("status=SAVED");
    expect(href).toContain("sort=stale");
  });

  it("combines query and sort params", () => {
    const href = sortHref("stale", [], "Acme");
    expect(href).toContain("q=Acme");
    expect(href).toContain("sort=stale");
  });

  it("combines all three params", () => {
    const href = sortHref("stale", ["APPLIED", "OFFER"], "Acme");
    expect(href).toContain("status=APPLIED%2COFFER");
    expect(href).toContain("q=Acme");
    expect(href).toContain("sort=stale");
  });

  it("emits archived=1 alone when sort is default and only archived is set", () => {
    expect(sortHref("created", [], "", true)).toBe("/dashboard?archived=1");
  });

  it("combines sort and archived params", () => {
    const href = sortHref("stale", [], "", true);
    expect(href).toContain("sort=stale");
    expect(href).toContain("archived=1");
  });

  it("omits archived when false", () => {
    expect(sortHref("stale", [], "", false)).toBe("/dashboard?sort=stale");
  });

  it("emits attention=1 when attention is true", () => {
    expect(sortHref("created", [], "", false, true)).toBe(
      "/dashboard?attention=1"
    );
  });

  it("preserves attention alongside other params", () => {
    const href = sortHref("stale", ["APPLIED"], "Acme", true, true);
    expect(href).toContain("status=APPLIED");
    expect(href).toContain("q=Acme");
    expect(href).toContain("sort=stale");
    expect(href).toContain("archived=1");
    expect(href).toContain("attention=1");
  });
});

describe("sortLabel", () => {
  it("maps each enum value to a readable label", () => {
    expect(sortLabel("created")).toBe("Newest");
    expect(sortLabel("applied")).toBe("Applied date");
    expect(sortLabel("updated")).toBe("Recently touched");
    expect(sortLabel("stale")).toBe("Stale first");
    expect(sortLabel("score")).toBe("Match score");
  });
});
