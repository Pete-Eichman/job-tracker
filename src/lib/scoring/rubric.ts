import { z } from "zod";

/**
 * Composite scoring rubric (EVAL-ONLY for now).
 *
 * The match score decomposes into weighted dimensions. The model scores each
 * dimension 0-100 with a short rationale; TypeScript computes the weighted
 * composite deterministically (see `computeComposite`). The model is never
 * asked for the final number.
 *
 * This lives under `src/lib` (not `eval/`) so the deterministic math is unit
 * tested and covered by CI, and so production scoring can adopt the same schema
 * later without moving files. Production (`src/lib/services/match-scoring.ts`)
 * does NOT use this yet — migrating it is deferred to the tuning session.
 */

export type RubricDimension = {
  key: string;
  label: string;
  /** Relative weight. Weights across all dimensions should sum to 1. */
  weight: number;
  /** Guidance shown to the model for scoring this dimension. */
  description: string;
};

export const RUBRIC_DIMENSIONS = [
  {
    key: "requiredSkills",
    label: "Required-skills match",
    weight: 0.5,
    description:
      "How completely the resume covers the job's REQUIRED skills. Missing required skills is a significant gap.",
  },
  {
    key: "seniority",
    label: "Seniority / years fit",
    weight: 0.2,
    description:
      "Alignment of the candidate's seniority and years of experience with what the job asks. Under-leveled and over-leveled both reduce fit.",
  },
  {
    key: "domain",
    label: "Domain fit",
    weight: 0.2,
    description:
      "How well the candidate's industry/problem domain and hands-on experience with the job's responsibilities match the posting.",
  },
  {
    key: "niceToHaves",
    label: "Nice-to-haves",
    weight: 0.1,
    description:
      "Coverage of the job's nice-to-have / preferred skills. Lighter weight; absence is not penalized heavily.",
  },
] as const satisfies readonly RubricDimension[];

export type DimensionKey = (typeof RUBRIC_DIMENSIONS)[number]["key"];

/** Per-dimension judgment the model returns: a score and its rationale. */
export const DimensionScoreSchema = z.object({
  score: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Fit for this dimension only, 0-100. 75+ strong, 50-74 partial, <50 weak."),
  rationale: z
    .string()
    .describe(
      "1-2 sentences citing concrete evidence (specific skills, years, responsibilities) for this dimension's score."
    ),
});

export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

/**
 * The structured output the model returns: one {score, rationale} per dimension.
 * Built dynamically from RUBRIC_DIMENSIONS so the schema and the weights cannot
 * drift apart.
 */
export const RubricScoreSchema = z.object(
  Object.fromEntries(
    RUBRIC_DIMENSIONS.map((d) => [d.key, DimensionScoreSchema])
  ) as Record<DimensionKey, typeof DimensionScoreSchema>
);

export type RubricScore = Record<DimensionKey, DimensionScore>;

/**
 * Deterministic weighted composite, 0-100 (rounded to an integer).
 * Code does the math — the model never produces this number.
 */
export function computeComposite(dimensions: RubricScore): number {
  const totalWeight = RUBRIC_DIMENSIONS.reduce((sum, d) => sum + d.weight, 0);
  const weighted = RUBRIC_DIMENSIONS.reduce(
    (sum, d) => sum + dimensions[d.key].score * d.weight,
    0
  );
  return Math.round(weighted / totalWeight);
}
