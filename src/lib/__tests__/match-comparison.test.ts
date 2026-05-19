import { describe, it, expect } from "vitest";
import { buildMatchComparison } from "@/lib/match-comparison";

function m(
  resumeId: string,
  title: string,
  score: number,
  strengths: string[] = [],
  gaps: string[] = [],
  isDefault = false
) {
  return {
    score,
    strengths,
    gaps,
    resumeId,
    resume: { id: resumeId, title, isDefault },
  };
}

describe("buildMatchComparison", () => {
  it("returns an empty array for empty input", () => {
    expect(buildMatchComparison([])).toEqual([]);
  });

  it("maps a single match's fields to one row", () => {
    const row = buildMatchComparison([
      m("r1", "Resume A", 82, ["TypeScript", "React"], ["Go"], true),
    ])[0];
    expect(row).toEqual({
      resumeId: "r1",
      resumeTitle: "Resume A",
      isDefault: true,
      score: 82,
      strengthsCount: 2,
      gapsCount: 1,
    });
  });

  it("sorts rows by score descending", () => {
    const rows = buildMatchComparison([
      m("r1", "A", 50),
      m("r2", "B", 90),
      m("r3", "C", 70),
    ]);
    expect(rows.map((r) => r.resumeId)).toEqual(["r2", "r3", "r1"]);
  });

  it("preserves input order on ties (stable sort)", () => {
    const rows = buildMatchComparison([
      m("r1", "A", 75),
      m("r2", "B", 75),
      m("r3", "C", 75),
    ]);
    expect(rows.map((r) => r.resumeId)).toEqual(["r1", "r2", "r3"]);
  });

  it("threads isDefault through to each row", () => {
    const rows = buildMatchComparison([
      m("r1", "A", 60, [], [], true),
      m("r2", "B", 80, [], [], false),
    ]);
    expect(rows.find((r) => r.resumeId === "r1")?.isDefault).toBe(true);
    expect(rows.find((r) => r.resumeId === "r2")?.isDefault).toBe(false);
  });

  it("reports zero counts when strengths/gaps arrays are empty", () => {
    const [row] = buildMatchComparison([m("r1", "A", 50, [], [])]);
    expect(row.strengthsCount).toBe(0);
    expect(row.gapsCount).toBe(0);
  });

  it("does not mutate the input array", () => {
    const input = [m("r1", "A", 50), m("r2", "B", 90)];
    const before = input.map((x) => x.resumeId);
    buildMatchComparison(input);
    expect(input.map((x) => x.resumeId)).toEqual(before);
  });
});
