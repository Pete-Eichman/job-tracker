import { describe, it, expect } from "vitest";
import { mean, stddev, rank, pearson, spearman } from "@/lib/scoring/stats";

describe("mean", () => {
  it("averages values", () => {
    expect(mean([2, 4, 6])).toBe(4);
  });
  it("returns 0 for empty input", () => {
    expect(mean([])).toBe(0);
  });
});

describe("stddev", () => {
  it("returns 0 for fewer than 2 samples", () => {
    expect(stddev([])).toBe(0);
    expect(stddev([5])).toBe(0);
  });
  it("returns 0 when all samples are identical (perfect consistency)", () => {
    expect(stddev([70, 70, 70, 70])).toBe(0);
  });
  it("computes population standard deviation", () => {
    // mean 4; squared devs 4,1,0,1,4 -> var 2 -> sd sqrt(2)
    expect(stddev([2, 3, 4, 5, 6])).toBeCloseTo(Math.sqrt(2), 10);
  });
});

describe("rank", () => {
  it("ranks ascending, 1-based", () => {
    expect(rank([10, 30, 20])).toEqual([1, 3, 2]);
  });
  it("uses average ranks for ties", () => {
    expect(rank([10, 30, 30, 50])).toEqual([1, 2.5, 2.5, 4]);
  });
});

describe("pearson", () => {
  it("is 1 for a perfect positive linear relationship", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
  });
  it("is 0 when a series has no variance", () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBe(0);
  });
});

describe("spearman", () => {
  it("is 1 for perfectly agreeing orderings", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 10);
  });
  it("is -1 for perfectly inverted orderings", () => {
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 10);
  });
  it("handles monotonic-but-nonlinear relationships (rank-based)", () => {
    // y = x^2 is monotonic over positives -> Spearman 1 even though Pearson < 1
    expect(spearman([1, 2, 3, 4], [1, 4, 9, 16])).toBeCloseTo(1, 10);
  });
  it("tolerates tied labels (tiers) via average ranks", () => {
    // labels: weak, medium, medium, strong -> ranks [1, 2.5, 2.5, 4]; composites
    // [30,55,60,90] -> ranks [1,2,3,4]. The tie caps correlation just below 1,
    // but ordering still agrees strongly. (Pearson of those ranks ≈ 0.9487.)
    expect(spearman([0, 1, 1, 2], [30, 55, 60, 90])).toBeCloseTo(0.9487, 4);
  });
});
