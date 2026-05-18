import { describe, it, expect } from "vitest";
import {
  parseJobFilter,
  activePreset,
  presetHref,
  jobWhereFromFilter,
} from "@/lib/job-filters";

describe("parseJobFilter", () => {
  it("returns empty filter for no params", () => {
    expect(parseJobFilter({})).toEqual({ statuses: [], query: "" });
  });

  it("parses a single status", () => {
    expect(parseJobFilter({ status: "APPLIED" })).toEqual({
      statuses: ["APPLIED"],
      query: "",
    });
  });

  it("parses comma-separated statuses preserving order", () => {
    expect(parseJobFilter({ status: "APPLIED,PHONE_SCREEN" })).toEqual({
      statuses: ["APPLIED", "PHONE_SCREEN"],
      query: "",
    });
  });

  it("drops invalid status values", () => {
    expect(parseJobFilter({ status: "INVALID,APPLIED" })).toEqual({
      statuses: ["APPLIED"],
      query: "",
    });
  });

  it("upcases lower-case status input", () => {
    expect(parseJobFilter({ status: "applied" })).toEqual({
      statuses: ["APPLIED"],
      query: "",
    });
  });

  it("trims the query string", () => {
    expect(parseJobFilter({ q: "  Acme  " })).toEqual({
      statuses: [],
      query: "Acme",
    });
  });

  it("uses the first element of an array param", () => {
    expect(
      parseJobFilter({ status: ["APPLIED", "OFFER"] })
    ).toEqual({ statuses: ["APPLIED"], query: "" });
  });
});

describe("activePreset", () => {
  it("returns 'all' for an empty filter", () => {
    expect(activePreset({ statuses: [], query: "" })).toBe("all");
  });

  it("returns 'saved' for SAVED only", () => {
    expect(activePreset({ statuses: ["SAVED"], query: "" })).toBe("saved");
  });

  it("returns 'active' for the four in-flight statuses", () => {
    expect(
      activePreset({
        statuses: ["APPLIED", "PHONE_SCREEN", "TECHNICAL", "ONSITE"],
        query: "",
      })
    ).toBe("active");
  });

  it("returns 'offers' for OFFER only", () => {
    expect(activePreset({ statuses: ["OFFER"], query: "" })).toBe("offers");
  });

  it("returns 'closed' for REJECTED + WITHDRAWN", () => {
    expect(
      activePreset({ statuses: ["REJECTED", "WITHDRAWN"], query: "" })
    ).toBe("closed");
  });

  it("returns null for APPLIED alone (not a preset)", () => {
    expect(activePreset({ statuses: ["APPLIED"], query: "" })).toBeNull();
  });

  it("returns null when an extra status is added to a preset", () => {
    expect(
      activePreset({
        statuses: ["APPLIED", "PHONE_SCREEN", "TECHNICAL", "ONSITE", "OFFER"],
        query: "",
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
});

describe("jobWhereFromFilter", () => {
  it("returns just the userId scope for an empty filter", () => {
    expect(jobWhereFromFilter("u1", { statuses: [], query: "" })).toEqual({
      userId: "u1",
    });
  });

  it("adds a status `in` clause when statuses are present", () => {
    expect(
      jobWhereFromFilter("u1", { statuses: ["APPLIED", "OFFER"], query: "" })
    ).toEqual({
      userId: "u1",
      status: { in: ["APPLIED", "OFFER"] },
    });
  });

  it("adds an OR clause matching title/company case-insensitively for a query", () => {
    expect(
      jobWhereFromFilter("u1", { statuses: [], query: "Acme" })
    ).toEqual({
      userId: "u1",
      OR: [
        { title: { contains: "Acme", mode: "insensitive" } },
        { company: { contains: "Acme", mode: "insensitive" } },
      ],
    });
  });

  it("combines status and query when both are present", () => {
    expect(
      jobWhereFromFilter("u1", { statuses: ["APPLIED"], query: "Acme" })
    ).toEqual({
      userId: "u1",
      status: { in: ["APPLIED"] },
      OR: [
        { title: { contains: "Acme", mode: "insensitive" } },
        { company: { contains: "Acme", mode: "insensitive" } },
      ],
    });
  });
});
