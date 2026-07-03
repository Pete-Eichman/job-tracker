"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { explainMatch } from "@/lib/services/match-explanation";
import { parseFormData } from "@/lib/forms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { computeCostCents } from "@/lib/pricing";
import { AI_MODELS } from "@/lib/ai-models";
import { assertActionsPresent, assertNoTeaserLanguage } from "@/lib/explanation-guards";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ExplainSchema = z.object({
  jobId: z.string().min(1),
  resumeId: z.string().min(1),
});

export async function explainMatchAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    const userId = session.user.id;

    const rate = await enforceRateLimit("ai", `user:${userId}`);
    if (!rate.ok) {
      return {
        error: "You're doing that too fast. Please wait a bit and try again.",
      };
    }

    const { jobId, resumeId } = parseFormData(formData, ExplainSchema);

    const job = await prisma.job.findFirst({
      where: { id: jobId, userId },
    });
    if (!job) throw new Error("Job not found");

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
    });
    if (!resume) throw new Error("Resume not found");

    const match = await prisma.match.findUnique({
      where: { jobId_resumeId: { jobId, resumeId } },
    });
    if (!match) throw new Error("Score this job first before requesting an explanation.");

    const { result, usage } = await explainMatch(job, resume, match.score);

    assertActionsPresent(result);
    assertNoTeaserLanguage(result);

    await prisma.match.update({
      where: { jobId_resumeId: { jobId, resumeId } },
      data: { explanation: result },
    });

    await prisma.aiUsage.create({
      data: {
        userId,
        jobId,
        operation: "match_explanation",
        model: AI_MODELS.default,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costCents: computeCostCents(
          AI_MODELS.default,
          usage.inputTokens,
          usage.outputTokens
        ),
      },
    });

    revalidatePath(`/dashboard/jobs/${jobId}`);
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Explanation failed. Please try again.";
    return { error: message };
  }
}
