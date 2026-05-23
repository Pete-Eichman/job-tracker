import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { ResumeModel } from "@/generated/prisma/models";
import { TIMEOUTS, isAbortLike, timeoutError } from "@/lib/timeouts";
import { AI_MODELS } from "@/lib/ai-models";
import { buildJobBrief, type JobForBrief } from "@/lib/services/job-brief";

export const GapSchema = z.object({
  type: z
    .enum(["vocabulary", "closable", "hard"])
    .describe(
      "vocabulary = resume has the substance but uses different wording; " +
        "closable = genuinely missing but acquirable (cert, course, project); " +
        "hard = real barrier now (legally-required credential, active licensure, clearance, or experience gap too large to flex)."
    ),
  requirement: z
    .string()
    .min(1)
    .describe("Exactly what the posting asks for, quoted or paraphrased closely."),
  finding: z
    .string()
    .min(1)
    .describe(
      "Honest, specific assessment of where the candidate stands on this requirement. " +
        "Never fabricate or imply experience the resume does not support. " +
        "If the requirement's hardness is genuinely ambiguous, express calibrated uncertainty here."
    ),
  hedge: z
    .boolean()
    .describe(
      "true if this requirement is routinely flexed by employers and should not be treated as a wall " +
        "(e.g. degree-or-equivalent when the candidate has equivalent experience, " +
        "a 'preferred'/'nice-to-have' signal, or a modest experience gap like 5 years vs. 7 requested). " +
        "false for requirements that are genuinely hard: active licensure, legally-mandated credentials, security clearance."
    ),
  action: z
    .string()
    .min(1)
    .describe(
      "Concrete next step paired with this gap. REQUIRED — never empty. " +
        "For vocabulary: show the specific rephrase. " +
        "For closable: name the path (cert, course, project) and rough effort. " +
        "For hard: respectful pivot — name the adjacent role the candidate IS competitive for, " +
        "or the longer path if they want this role anyway. Never 'you'll never make it'; never false hope."
    ),
});

export const ExplanationSchema = z.object({
  gaps: z
    .array(GapSchema)
    .max(5)
    .describe(
      "The TOP gaps by impact, ranked highest-impact first. Cap at 5. " +
        "Surface only gaps that matter most — do not dump every gap. " +
        "0 gaps is valid for a strong match."
    ),
  overall_note: z
    .string()
    .describe(
      "Brief, honest framing of the candidate's overall standing. " +
        "Direct and respectful — not bubbly, not falsely reassuring, not harsh. " +
        "CRITICAL: must NOT contain cliffhanger or teaser language. " +
        "Never say 'I found more...', 'want me to go deeper?', 'there are other issues', " +
        "'shall I...', or any phrase that implies withheld findings or baits another prompt. " +
        "The iterate loop is driven by the user fixing gaps and re-scoring — not by curiosity bait."
    ),
});

export type GapExplanation = z.infer<typeof GapSchema>;
export type MatchExplanation = z.infer<typeof ExplanationSchema>;
export type ExplanationUsage = { inputTokens: number; outputTokens: number };

type JobForExplaining = JobForBrief;
type ResumeForExplaining = Pick<ResumeModel, "rawText">;

export async function explainMatch(
  job: JobForExplaining,
  resume: ResumeForExplaining,
  score?: number
): Promise<{ result: MatchExplanation; usage: ExplanationUsage }> {
  const jobBrief = buildJobBrief(job);
  const scoreContext =
    score != null ? `\nCurrent match score: ${score}/100\n` : "";

  // Job fields, resume.rawText, and score are concatenated into the prompt.
  // Safe because generateObject enforces ExplanationSchema — injected instructions
  // cannot alter the output shape or escape into unstructured text.
  const prompt = `You are an honest, direct career mentor helping a candidate understand exactly where they stand against a job posting — and what to do about it.

Your role: tell the truth respectfully. Not bubbly, not falsely reassuring, not harsh. Talk to this person like a competent mentor who respects them enough to be straight.

${scoreContext}
=== YOUR TASK ===

Identify the TOP gaps between the resume and the job posting. Rank by impact. Cap at 5. Do NOT surface every gap — surface only the ones that matter most. A strong match may have 0 gaps.

For each gap, classify it as exactly one of three types:

TYPE: vocabulary
The resume HAS the relevant experience or skill, but expresses it with different wording than the posting uses.
→ Action: Show the specific rephrase that surfaces the existing experience in the posting's language.
  Nothing false is added. Only framing changes.
  Example: resume says "REST APIs"; posting says "RESTful services" → action is the exact rephrase.

TYPE: closable
The candidate genuinely lacks something the posting asks for, but it is ACQUIRABLE: a certification,
a course, a tool, a portfolio project. This is not a wording fix — it requires real effort.
→ Action: Name it plainly. Point at the specific path (cert name, course type, project idea).
  Give a rough sense of effort. Be honest that this takes time.
  Example: "This role wants AWS Solutions Architect certification. Your cloud experience is relevant
  but the cert is missing — that's a 2-3 month study commitment at roughly 10h/week."

TYPE: hard
A genuine barrier right now: a legally-required degree, active licensure, security clearance,
or an experience gap too large to reasonably flex. Hard truths deserve clear delivery.
→ Action: Respectful hard truth + a PIVOT. Name the adjacent role the candidate IS competitive
  for today, OR describe the longer path if they genuinely want this specific role.
  Never "you'll never make it." Never false hope either. Both are disrespectful.
  Example: "This role requires a PE license you don't hold. The directly adjacent path is EIT
  roles, which your background fits well. The PE path is 4+ years from where you are."

=== HEDGING RULES (read carefully — targeted, not blanket) ===

Some requirements are routinely flexed by employers. For these, set hedge=true and do NOT
present them as walls:
- "Degree OR equivalent experience" when the resume shows equivalent experience → not a barrier
- A requirement labeled "preferred", "nice to have", or "a plus" → reduced weight
- A modest experience gap (e.g. posting wants 7 years, resume shows 5) → commonly accommodated;
  reasonable to apply anyway

Requirements that are genuinely hard get hedge=false and NO softening:
- Active licensure (PE, CPA, bar admission, medical license, etc.)
- Legally-mandated credentials
- Security clearance

When a requirement's hardness is genuinely ambiguous — not clearly hard, not clearly soft —
express CALIBRATED UNCERTAINTY in the finding field. Say something like "postings often overstate
this requirement — weigh it against what you know about this employer and role." Do not express
false confidence in either direction.

=== NO-FABRICATION RULE (ethical spine — non-negotiable) ===

NEVER suggest adding, implying, or claiming experience or credentials the resume does not
actually support. Not even subtly. Even if doing so would raise the match score.
Your job is to surface and reframe what IS there, name what is genuinely missing, and
guide toward honest next steps. Anything else is dishonest and harmful.

=== COMPLETENESS AND ANTI-BREADCRUMB RULES ===

Every gap you surface MUST be FULLY resolved in this response — full finding, full action.
Nothing withheld.

CRITICAL — NO BREADCRUMBING OR CLIFFHANGERS. The overall_note and every action and finding
MUST NOT contain:
- "I found more gaps..."
- "Want me to go deeper?"
- "There are other issues I could share"
- "Shall I..."
- "Happy to dig further"
- "Would you like me to..."
- ANY phrase that implies withheld findings or baits another prompt

The iterate loop is driven by the user fixing gaps and re-scoring to reveal the next tier.
It is NOT driven by curiosity bait. Any cliffhanger phrasing is a failure mode.

=== JOB POSTING ===
${jobBrief}

=== CANDIDATE RESUME ===
${resume.rawText}`;

  try {
    const { object, usage } = await generateObject({
      model: anthropic(AI_MODELS.default),
      schema: ExplanationSchema,
      prompt,
      abortSignal: AbortSignal.timeout(TIMEOUTS.matchExplain),
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
      throw timeoutError("Match explanation", TIMEOUTS.matchExplain);
    }
    throw err;
  }
}
