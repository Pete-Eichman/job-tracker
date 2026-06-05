import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { ResumeModel } from "@/generated/prisma/models";
import { TIMEOUTS, isAbortLike, timeoutError } from "@/lib/timeouts";
import { AI_MODELS } from "@/lib/ai-models";
import { buildJobBrief, type JobForBrief } from "@/lib/services/job-brief";
import { generateObjectWithRepair } from "@/lib/ai/generate-with-repair";

const MatchSchema = z.object({
  score: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Overall fit 0-100. 75+ = strong, 50-74 = partial, <50 = weak."),
  reasoning: z
    .string()
    .describe(
      "2-4 sentence explanation grounded in concrete evidence from the resume vs. the job's required skills, seniority, and responsibilities."
    ),
  gaps: z
    .array(z.string())
    .min(0)
    .max(5)
    .describe(
      "2-4 specific skills, experiences, or seniority signals the job asks for that the resume does not clearly demonstrate."
    ),
  strengths: z
    .array(z.string())
    .min(0)
    .max(5)
    .describe(
      "2-4 specific skills or experiences from the resume that strongly satisfy this job's requirements."
    ),
});

export type ScoredMatch = z.infer<typeof MatchSchema>;

export type ScoringUsage = {
  inputTokens: number;
  outputTokens: number;
  repaired: boolean;
};

type JobForMatching = JobForBrief;

type ResumeForMatching = Pick<ResumeModel, "rawText">;

export async function scoreJobAgainstResume(
  job: JobForMatching,
  resume: ResumeForMatching
): Promise<{ result: ScoredMatch; usage: ScoringUsage }> {
  const jobBrief = buildJobBrief(job);

  // Job fields and resume.rawText are concatenated directly into the prompt.
  // Safe here because generateObject enforces MatchSchema — injected instructions
  // cannot alter the output shape or escape into unstructured text.
  const prompt = `You are evaluating how well a candidate's resume fits a specific job posting.

Score the match 0-100 based on:
- Coverage of required skills (heaviest weight). Missing required skills is a significant gap.
- Coverage of nice-to-have skills (lighter weight).
- Seniority alignment (under-leveled or over-leveled both reduce fit).
- Whether the resume shows direct experience with the job's responsibilities.

Gaps and strengths must be specific (cite the skill, technology, or responsibility — not generic statements).

=== JOB POSTING ===
${jobBrief}

=== CANDIDATE RESUME ===
${resume.rawText}`;

  try {
    const { object, usage, repaired } = await generateObjectWithRepair({
      model: anthropic(AI_MODELS.default),
      schema: MatchSchema,
      prompt,
      abortSignal: AbortSignal.timeout(TIMEOUTS.matchScore),
    });

    return {
      result: object,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        repaired,
      },
    };
  } catch (err) {
    if (isAbortLike(err)) {
      throw timeoutError("Match scoring", TIMEOUTS.matchScore);
    }
    throw err;
  }
}
