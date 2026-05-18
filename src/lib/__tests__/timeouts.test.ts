import { describe, it, expect } from "vitest";
import { isAbortLike, timeoutError, TIMEOUTS } from "@/lib/timeouts";

describe("isAbortLike", () => {
  it("returns true for a DOMException with name AbortError", () => {
    expect(isAbortLike(new DOMException("aborted", "AbortError"))).toBe(true);
  });

  it("returns true for a DOMException with name TimeoutError", () => {
    expect(isAbortLike(new DOMException("timed out", "TimeoutError"))).toBe(
      true
    );
  });

  it("returns true for a plain Error renamed to AbortError", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    expect(isAbortLike(err)).toBe(true);
  });

  it("returns false for a vanilla Error", () => {
    expect(isAbortLike(new Error("oops"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isAbortLike("aborted")).toBe(false);
    expect(isAbortLike(null)).toBe(false);
    expect(isAbortLike(undefined)).toBe(false);
    expect(isAbortLike(42)).toBe(false);
  });
});

describe("timeoutError", () => {
  it("formats the operation and seconds into the message", () => {
    const err = timeoutError("Test op", 15_000);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Test op timed out after 15s. Try again.");
  });

  it("rounds milliseconds to whole seconds", () => {
    expect(timeoutError("X", 1_400).message).toContain("after 1s");
    expect(timeoutError("X", 1_600).message).toContain("after 2s");
  });
});

describe("TIMEOUTS", () => {
  it("declares budgets for every AI call site", () => {
    expect(TIMEOUTS.pageFetch).toBeGreaterThan(0);
    expect(TIMEOUTS.jobExtract).toBeGreaterThan(0);
    expect(TIMEOUTS.matchScore).toBeGreaterThan(0);
    expect(TIMEOUTS.coverLetter).toBeGreaterThan(0);
  });
});
