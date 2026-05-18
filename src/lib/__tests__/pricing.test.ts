import { describe, it, expect } from "vitest";
import { computeCostCents, formatSpend } from "@/lib/pricing";

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
