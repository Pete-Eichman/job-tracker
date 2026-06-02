import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { TIMEOUTS, isAbortLike, timeoutError } from "@/lib/timeouts";
import { AI_MODELS } from "@/lib/ai-models";
import { buildJobBrief, type JobForBrief } from "@/lib/services/job-brief";
import {
  RUBRIC_DIMENSIONS,
  RubricScoreSchema,
  computeComposite,
  type RubricScore,
} from "@/lib/scoring/rubric";

/**
 * EVAL-ONLY composite scorer.
 *
 * Mirrors how production calls the model (same model, same timeout, no explicit
 * temperature so the AI SDK/Anthropic default is used — matching production's
 * real nondeterminism) but asks for a per-dimension rubric instead of a single
 * overall number. The composite is computed deterministically in code.
 *
 * Production scoring still lives in `src/lib/services/match-scoring.ts` and is
 * unchanged; this scorer is used by the eval harness (`eval/run.ts`).
 */

export type ResumeForScoring = { rawText: string };

export type ScoringUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type CompositeScoreResult = {
  dimensions: RubricScore;
  composite: number;
};

function buildPrompt(job: JobForBrief, resume: ResumeForScoring): string {
  const jobBrief = buildJobBrief(job);
  const dimensionGuide = RUBRIC_DIMENSIONS.map(
    (d) => `- ${d.key} (${d.label}): ${d.description}`
  ).join("\n");

  // Job fields and resume.rawText are concatenated directly into the prompt.
  // Safe here because generateObject enforces RubricScoreSchema — injected
  // instructions cannot alter the output shape or escape into unstructured text.
  return `You are evaluating how well a candidate's resume fits a specific job posting.

Score EACH of the following dimensions independently from 0-100, with a short rationale grounded in concrete evidence. Do NOT produce an overall score — only the per-dimension scores. The overall fit is computed separately.

Dimensions:
${dimensionGuide}

Rationales must be specific (cite the skill, technology, years, or responsibility — not generic statements).

=== JOB POSTING ===
${jobBrief}

=== CANDIDATE RESUME ===
${resume.rawText}`;
}

export async function scoreResumeAgainstJob(
  job: JobForBrief,
  resume: ResumeForScoring
): Promise<{ result: CompositeScoreResult; usage: ScoringUsage }> {
  const prompt = buildPrompt(job, resume);

  try {
    const { object, usage } = await generateObject({
      model: anthropic(AI_MODELS.default),
      schema: RubricScoreSchema,
      prompt,
      abortSignal: AbortSignal.timeout(TIMEOUTS.matchScore),
    });

    const dimensions = object as RubricScore;
    return {
      result: {
        dimensions,
        composite: computeComposite(dimensions),
      },
      usage: {
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
      },
    };
  } catch (err) {
    if (isAbortLike(err)) {
      throw timeoutError("Match scoring", TIMEOUTS.matchScore);
    }
    throw err;
  }
}
