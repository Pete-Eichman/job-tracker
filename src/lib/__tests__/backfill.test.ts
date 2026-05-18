import { describe, it, expect } from "vitest";
import { planBackfillUpdates } from "@/lib/backfill";

describe("planBackfillUpdates", () => {
  it("returns an empty array for empty input", () => {
    expect(planBackfillUpdates([])).toEqual([]);
  });

  it("computes the cost for a known model with non-zero tokens", () => {
    const updates = planBackfillUpdates([
      {
        id: "row1",
        model: "claude-sonnet-4-6",
        inputTokens: 1_000_000,
        outputTokens: 0,
      },
    ]);
    expect(updates).toEqual([{ id: "row1", costCents: 300 }]);
  });

  it("filters out unknown models and zero-token rows, keeps known-model rows in order", () => {
    const updates = planBackfillUpdates([
      {
        id: "a",
        model: "claude-sonnet-4-6",
        inputTokens: 1_000_000,
        outputTokens: 0,
      },
      { id: "b", model: "unknown-model", inputTokens: 500_000, outputTokens: 500_000 },
      { id: "c", model: "claude-sonnet-4-6", inputTokens: 0, outputTokens: 0 },
      {
        id: "d",
        model: "claude-sonnet-4-6",
        inputTokens: 0,
        outputTokens: 1_000_000,
      },
    ]);
    expect(updates).toEqual([
      { id: "a", costCents: 300 },
      { id: "d", costCents: 1500 },
    ]);
  });

  it("preserves input order in the output", () => {
    const updates = planBackfillUpdates([
      {
        id: "second",
        model: "claude-sonnet-4-6",
        inputTokens: 0,
        outputTokens: 1_000_000,
      },
      {
        id: "first",
        model: "claude-sonnet-4-6",
        inputTokens: 1_000_000,
        outputTokens: 0,
      },
    ]);
    expect(updates.map((u) => u.id)).toEqual(["second", "first"]);
  });
});
