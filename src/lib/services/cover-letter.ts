import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type {
  JobModel,
  ResumeModel,
  MatchModel,
} from "@/generated/prisma/models";
import { TIMEOUTS, isAbortLike, timeoutError } from "@/lib/timeouts";

export type CoverLetterUsage = {
  inputTokens: number;
  outputTokens: number;
};

type JobForLetter = Pick<
  JobModel,
  | "title"
  | "company"
  | "location"
  | "workMode"
  | "seniority"
  | "requiredSkills"
  | "niceToHaveSkills"
  | "responsibilities"
>;

type ResumeForLetter = Pick<ResumeModel, "rawText">;

type MatchForLetter = Pick<MatchModel, "score" | "strengths" | "gaps">;

const RESUME_CHAR_LIMIT = 18000;

function buildJobBrief(job: JobForLetter): string {
  return [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    job.location ? `Location: ${job.location}` : null,
    job.workMode ? `Work mode: ${job.workMode}` : null,
    job.seniority ? `Seniority: ${job.seniority}` : null,
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
}

export async function generateCoverLetter(
  job: JobForLetter,
  resume: ResumeForLetter,
  match?: MatchForLetter
): Promise<{ draft: string; usage: CoverLetterUsage }> {
  const matchBrief = match
    ? [
        `Fit score: ${match.score}/100`,
        match.strengths.length
          ? `Strengths to highlight:\n- ${match.strengths.join("\n- ")}`
          : null,
        match.gaps.length
          ? `Gaps to address gracefully (frame as growth areas; do not overpromise or invent experience):\n- ${match.gaps.join("\n- ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "No prior match analysis available. Identify 2-3 strong overlaps between the resume and the job yourself.";

  const prompt = `You are drafting a cover letter for a job application. Write the letter body only — no subject line, no "Dear Hiring Manager", no signature, no markdown formatting. Output plain prose with paragraph breaks.

Requirements:
- 250-400 words.
- Professional, confident, specific. No generic platitudes.
- Open with the role and company by name and one sentence on why this role fits.
- Weave in 2-3 concrete strengths from the resume that map to the job's requirements. Cite specific technologies, projects, or experiences from the resume — do not invent any.
- If there are gaps, acknowledge at most one or two honestly and frame as eagerness to grow. Never claim experience the resume does not show.
- Close with a forward-looking sentence about the conversation and a brief thanks.

=== JOB POSTING ===
${buildJobBrief(job)}

=== MATCH ANALYSIS ===
${matchBrief}

=== CANDIDATE RESUME ===
${resume.rawText.slice(0, RESUME_CHAR_LIMIT)}`;

  try {
    const { text, usage } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      prompt,
      abortSignal: AbortSignal.timeout(TIMEOUTS.coverLetter),
    });

    return {
      draft: text.trim(),
      usage: {
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
      },
    };
  } catch (err) {
    if (isAbortLike(err)) {
      throw timeoutError("Cover letter generation", TIMEOUTS.coverLetter);
    }
    throw err;
  }
}
