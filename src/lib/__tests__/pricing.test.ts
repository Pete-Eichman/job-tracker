import { describe, it, expect } from "vitest";
import {
  computeCostCents,
  formatSpend,
  formatTokens,
  formatOperation,
} from "@/lib/pricing";

describe("computeCostCents", () => {
  it("charges the input rate for 1M input tokens", () => {
    expect(computeCostCents("claude-sonnet-4-6", 1_000_000, 0)).toBe(300);
  });

  it("charges the output rate for 1M output tokens", () => {
    expect(computeCostCents("claude-sonnet-4-6", 0, 1_000_000)).toBe(1500);
  });

  it("sums input and output costs", () => {
    expect(computeCostCents("claude-sonnet-4-6", 500_000, 100_000)).toBe(300);
  });

  it("returns 0 for an unknown model", () => {
    expect(computeCostCents("unknown-model", 1_000_000, 1_000_000)).toBe(0);
  });

  it("returns 0 when both token counts are zero", () => {
    expect(computeCostCents("claude-sonnet-4-6", 0, 0)).toBe(0);
  });
});

describe("formatSpend", () => {
  it("renders zero cents as $0.00", () => {
    expect(formatSpend(0)).toBe("$0.00");
  });

  it("renders sub-dollar amounts with two decimals", () => {
    expect(formatSpend(187)).toBe("$1.87");
  });

  it("renders dollar amounts with two decimals", () => {
    expect(formatSpend(12_345)).toBe("$123.45");
  });
});

describe("formatTokens", () => {
  it("renders small numbers as-is", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(999)).toBe("999");
  });

  it("renders thousands with a k suffix and one decimal", () => {
    expect(formatTokens(1_500)).toBe("1.5k");
    expect(formatTokens(45_200)).toBe("45.2k");
  });

  it("renders millions with an M suffix and one decimal", () => {
    expect(formatTokens(2_500_000)).toBe("2.5M");
  });
});

describe("formatOperation", () => {
  it("maps known operation codes to readable labels", () => {
    expect(formatOperation("job_extract")).toBe("Job extracts");
    expect(formatOperation("match_score")).toBe("Match scores");
    expect(formatOperation("cover_letter")).toBe("Cover letters");
  });

  it("falls back to the raw code for unknown operations", () => {
    expect(formatOperation("something_new")).toBe("something_new");
  });
});
