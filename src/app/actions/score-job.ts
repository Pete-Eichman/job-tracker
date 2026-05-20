"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreJobAgainstResume } from "@/lib/services/match-scoring";
import { parseFormData } from "@/lib/forms";
import { computeCostCents } from "@/lib/pricing";
import { AI_MODELS } from "@/lib/ai-models";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const RescoreSchema = z.object({
  jobId: z.string().min(1),
  resumeId: z.string().optional(),
});

export async function scoreJob(jobId: string, resumeId?: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
  });
  if (!job) throw new Error("Job not found");

  const resume = resumeId
    ? await prisma.resume.findFirst({ where: { id: resumeId, userId } })
    : await prisma.resume.findFirst({ where: { userId, isDefault: true } });
  if (!resume) throw new Error("Resume not found. Add a resume to enable match scoring.");

  const { result, usage } = await scoreJobAgainstResume(job, resume);

  await prisma.match.upsert({
    where: { jobId_resumeId: { jobId: job.id, resumeId: resume.id } },
    create: {
      jobId: job.id,
      resumeId: resume.id,
      score: result.score,
      reasoning: result.reasoning,
      gaps: result.gaps,
      strengths: result.strengths,
    },
    update: {
      score: result.score,
      reasoning: result.reasoning,
      gaps: result.gaps,
      strengths: result.strengths,
    },
  });

  await prisma.aiUsage.create({
    data: {
      userId,
      jobId,
      operation: "match_score",
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

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/jobs/${jobId}`);
}

export async function rescoreJobAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const { jobId, resumeId } = parseFormData(formData, RescoreSchema);
    await scoreJob(jobId, resumeId);
    return {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Scoring failed. Please try again.";
    return { error: message };
  }
}
