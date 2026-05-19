import { describe, it, expect } from "vitest";
import {
  parseJobFilter,
  activePreset,
  presetHref,
  viewHref,
  jobWhereFromFilter,
} from "@/lib/job-filters";

describe("parseJobFilter", () => {
  it("returns empty filter for no params", () => {
    expect(parseJobFilter({})).toEqual({
      statuses: [],
      query: "",
      archived: false,
    });
  });

  it("parses a single status", () => {
    expect(parseJobFilter({ status: "APPLIED" })).toEqual({
      statuses: ["APPLIED"],
      query: "",
      archived: false,
    });
  });

  it("parses comma-separated statuses preserving order", () => {
    expect(parseJobFilter({ status: "APPLIED,PHONE_SCREEN" })).toEqual({
      statuses: ["APPLIED", "PHONE_SCREEN"],
      query: "",
      archived: false,
    });
  });

  it("drops invalid status values", () => {
    expect(parseJobFilter({ status: "INVALID,APPLIED" })).toEqual({
      statuses: ["APPLIED"],
      query: "",
      archived: false,
    });
  });

  it("upcases lower-case status input", () => {
    expect(parseJobFilter({ status: "applied" })).toEqual({
      statuses: ["APPLIED"],
      query: "",
      archived: false,
    });
  });

  it("trims the query string", () => {
    expect(parseJobFilter({ q: "  Acme  " })).toEqual({
      statuses: [],
      query: "Acme",
      archived: false,
    });
  });

  it("uses the first element of an array param", () => {
    expect(parseJobFilter({ status: ["APPLIED", "OFFER"] })).toEqual({
      statuses: ["APPLIED"],
      query: "",
      archived: false,
    });
  });

  it("treats archived='1' as true", () => {
    expect(parseJobFilter({ archived: "1" }).archived).toBe(true);
  });

  it("treats missing archived as false", () => {
    expect(parseJobFilter({}).archived).toBe(false);
  });

  it("treats archived='0' as false", () => {
    expect(parseJobFilter({ archived: "0" }).archived).toBe(false);
  });

  it("treats archived='true' as false (only '1' counts)", () => {
    expect(parseJobFilter({ archived: "true" }).archived).toBe(false);
  });

  it("uses the first element of an archived array param", () => {
    expect(parseJobFilter({ archived: ["1", "0"] }).archived).toBe(true);
  });
});

describe("activePreset", () => {
  it("returns 'all' for an empty filter", () => {
    expect(
      activePreset({ statuses: [], query: "", archived: false })
    ).toBe("all");
  });

  it("returns 'saved' for SAVED only", () => {
    expect(
      activePreset({ statuses: ["SAVED"], query: "", archived: false })
    ).toBe("saved");
  });

  it("returns 'active' for the four in-flight statuses", () => {
    expect(
      activePreset({
        statuses: ["APPLIED", "PHONE_SCREEN", "TECHNICAL", "ONSITE"],
        query: "",
        archived: false,
      })
    ).toBe("active");
  });

  it("returns 'offers' for OFFER only", () => {
    expect(
      activePreset({ statuses: ["OFFER"], query: "", archived: false })
    ).toBe("offers");
  });

  it("returns 'closed' for REJECTED + WITHDRAWN", () => {
    expect(
      activePreset({
        statuses: ["REJECTED", "WITHDRAWN"],
        query: "",
        archived: false,
      })
    ).toBe("closed");
  });

  it("returns null for APPLIED alone (not a preset)", () => {
    expect(
      activePreset({ statuses: ["APPLIED"], query: "", archived: false })
    ).toBeNull();
  });

  it("returns null when an extra status is added to a preset", () => {
    expect(
      activePreset({
        statuses: ["APPLIED", "PHONE_SCREEN", "TECHNICAL", "ONSITE", "OFFER"],
        query: "",
        archived: false,
      })
    ).toBeNull();
  });
});

describe("presetHref", () => {
  it("returns the bare path for 'all' with no query", () => {
    expect(presetHref("all", "")).toBe("/dashboard");
  });

  it("encodes a single-status preset", () => {
    expect(presetHref("saved", "")).toBe("/dashboard?status=SAVED");
  });

  it("encodes preset statuses and query (commas URL-encoded)", () => {
    const href = presetHref("active", "Acme");
    expect(href).toContain(
      "status=APPLIED%2CPHONE_SCREEN%2CTECHNICAL%2CONSITE"
    );
    expect(href).toContain("q=Acme");
  });

  it("emits only q when preset is 'all' but query is set", () => {
    expect(presetHref("all", "Acme")).toBe("/dashboard?q=Acme");
  });

  it("appends a non-default sort param", () => {
    expect(presetHref("all", "", "stale")).toBe("/dashboard?sort=stale");
  });

  it("preserves status, sort, and query together", () => {
    const href = presetHref("active", "", "stale");
    expect(href).toContain(
      "status=APPLIED%2CPHONE_SCREEN%2CTECHNICAL%2CONSITE"
    );
    expect(href).toContain("sort=stale");
  });

  it("omits the default 'created' sort from the URL", () => {
    expect(presetHref("all", "Acme", "created")).toBe("/dashboard?q=Acme");
  });

  it("appends archived=1 when archived is true", () => {
    expect(presetHref("all", "", "created", true)).toBe(
      "/dashboard?archived=1"
    );
  });

  it("omits archived when false", () => {
    expect(presetHref("all", "", "created", false)).toBe("/dashboard");
  });

  it("preserves status, sort, query, and archived together", () => {
    const href = presetHref("active", "Acme", "stale", true);
    expect(href).toContain(
      "status=APPLIED%2CPHONE_SCREEN%2CTECHNICAL%2CONSITE"
    );
    expect(href).toContain("q=Acme");
    expect(href).toContain("sort=stale");
    expect(href).toContain("archived=1");
  });
});

describe("viewHref", () => {
  it("returns the bare path when nothing is set", () => {
    expect(viewHref(false, [], "", "created")).toBe("/dashboard");
  });

  it("emits only archived=1 when toggling on with no other filters", () => {
    expect(viewHref(true, [], "", "created")).toBe("/dashboard?archived=1");
  });

  it("preserves status, query, and sort when archived is false", () => {
    const href = viewHref(false, ["APPLIED"], "Acme", "stale");
    expect(href).toContain("status=APPLIED");
    expect(href).toContain("q=Acme");
    expect(href).toContain("sort=stale");
    expect(href).not.toContain("archived");
  });

  it("preserves all four dimensions when archived is true", () => {
    const href = viewHref(true, ["APPLIED"], "Acme", "stale");
    expect(href).toContain("status=APPLIED");
    expect(href).toContain("q=Acme");
    expect(href).toContain("sort=stale");
    expect(href).toContain("archived=1");
  });
});

describe("jobWhereFromFilter", () => {
  it("scopes by userId and excludes archived rows by default", () => {
    expect(
      jobWhereFromFilter("u1", { statuses: [], query: "", archived: false })
    ).toEqual({
      userId: "u1",
      archivedAt: null,
    });
  });

  it("scopes to archived rows when archived is true", () => {
    expect(
      jobWhereFromFilter("u1", { statuses: [], query: "", archived: true })
    ).toEqual({
      userId: "u1",
      archivedAt: { not: null },
    });
  });

  it("adds a status `in` clause when statuses are present", () => {
    expect(
      jobWhereFromFilter("u1", {
        statuses: ["APPLIED", "OFFER"],
        query: "",
        archived: false,
      })
    ).toEqual({
      userId: "u1",
      archivedAt: null,
      status: { in: ["APPLIED", "OFFER"] },
    });
  });

  it("adds an OR clause matching title/company case-insensitively for a query", () => {
    expect(
      jobWhereFromFilter("u1", { statuses: [], query: "Acme", archived: false })
    ).toEqual({
      userId: "u1",
      archivedAt: null,
      OR: [
        { title: { contains: "Acme", mode: "insensitive" } },
        { company: { contains: "Acme", mode: "insensitive" } },
      ],
    });
  });

  it("combines status, query, and archived together", () => {
    expect(
      jobWhereFromFilter("u1", {
        statuses: ["REJECTED"],
        query: "Acme",
        archived: true,
      })
    ).toEqual({
      userId: "u1",
      archivedAt: { not: null },
      status: { in: ["REJECTED"] },
      OR: [
        { title: { contains: "Acme", mode: "insensitive" } },
        { company: { contains: "Acme", mode: "insensitive" } },
      ],
    });
  });
});
