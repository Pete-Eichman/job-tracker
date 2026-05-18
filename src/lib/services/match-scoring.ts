import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { JobModel, ResumeModel } from "@/generated/prisma/models";
import { TIMEOUTS, isAbortLike, timeoutError } from "@/lib/timeouts";

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
};

type JobForMatching = Pick<
  JobModel,
  | "title"
  | "company"
  | "location"
  | "workMode"
  | "seniority"
  | "requiredSkills"
  | "niceToHaveSkills"
  | "responsibilities"
  | "salaryMin"
  | "salaryMax"
  | "salaryCurrency"
>;

type ResumeForMatching = Pick<ResumeModel, "rawText">;

function formatSalary(job: JobForMatching): string {
  if (job.salaryMin == null && job.salaryMax == null) return "Not specified";
  const cur = job.salaryCurrency ?? "";
  const min = job.salaryMin?.toLocaleString() ?? "?";
  const max = job.salaryMax?.toLocaleString() ?? "?";
  return `${cur} ${min} - ${max}`.trim();
}

export async function scoreJobAgainstResume(
  job: JobForMatching,
  resume: ResumeForMatching
): Promise<{ result: ScoredMatch; usage: ScoringUsage }> {
  const jobBrief = [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    job.location ? `Location: ${job.location}` : null,
    job.workMode ? `Work mode: ${job.workMode}` : null,
    job.seniority ? `Seniority: ${job.seniority}` : null,
    `Salary: ${formatSalary(job)}`,
    job.requiredSkills.length
      ? `Required skills: ${job.requiredSkills.join(", ")}`
      : null,
    job.niceToHaveSkills.length
      ? `Nice-to-have skills: ${job.niceToHaveSkills.join(", ")}`
      : null,
    job.responsibilities.length
      ? `Responsibilities:\n- ${job.responsibilities.join("\n- ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

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
    const { object, usage } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: MatchSchema,
      prompt,
      abortSignal: AbortSignal.timeout(TIMEOUTS.matchScore),
    });

    return {
      result: object,
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
