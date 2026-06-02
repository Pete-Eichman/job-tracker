import { describe, it, expect } from "vitest";
import {
  RUBRIC_DIMENSIONS,
  RubricScoreSchema,
  computeComposite,
  type RubricScore,
} from "@/lib/scoring/rubric";

function dims(scores: Partial<Record<string, number>>): RubricScore {
  return Object.fromEntries(
    RUBRIC_DIMENSIONS.map((d) => [
      d.key,
      { score: scores[d.key] ?? 0, rationale: "test" },
    ])
  ) as RubricScore;
}

describe("rubric", () => {
  it("weights sum to 1", () => {
    const total = RUBRIC_DIMENSIONS.reduce((sum, d) => sum + d.weight, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("schema has exactly one entry per dimension", () => {
    const shape = RubricScoreSchema.shape;
    expect(Object.keys(shape).sort()).toEqual(
      RUBRIC_DIMENSIONS.map((d) => d.key).sort()
    );
  });
});

describe("computeComposite", () => {
  it("returns 100 when every dimension is 100", () => {
    expect(computeComposite(dims({ requiredSkills: 100, seniority: 100, domain: 100, niceToHaves: 100 }))).toBe(100);
  });

  it("returns 0 when every dimension is 0", () => {
    expect(computeComposite(dims({}))).toBe(0);
  });

  it("computes a hand-checked weighted average (default weights .5/.2/.2/.1)", () => {
    // 80*.5 + 60*.2 + 40*.2 + 100*.1 = 40 + 12 + 8 + 10 = 70
    const score = computeComposite(
      dims({ requiredSkills: 80, seniority: 60, domain: 40, niceToHaves: 100 })
    );
    expect(score).toBe(70);
  });

  it("rounds to the nearest integer", () => {
    // 90*.5 + 70*.2 + 55*.2 + 33*.1 = 45 + 14 + 11 + 3.3 = 73.3 -> 73
    const score = computeComposite(
      dims({ requiredSkills: 90, seniority: 70, domain: 55, niceToHaves: 33 })
    );
    expect(score).toBe(73);
  });

  it("required-skills dominates given its 0.5 weight", () => {
    // 100*.5 + 0 + 0 + 0 = 50
    expect(
      computeComposite(dims({ requiredSkills: 100 }))
    ).toBe(50);
  });
});
