"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { scoreJobAgainstResume } from "@/lib/services/match-scoring";
import { parseFormData } from "@/lib/forms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { computeCostCents } from "@/lib/pricing";
import { sha256Hex } from "@/lib/hash";
import { AI_MODELS } from "@/lib/ai-models";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

const RescoreSchema = z.object({
  jobId: z.string().min(1),
  resumeId: z.string().optional(),
});

export async function scoreJob(
  jobId: string,
  resumeId?: string,
  opts?: { extractionRepaired?: boolean }
): Promise<void> {
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
  if (!resume)
    throw new Error("Resume not found. Add a resume to enable match scoring.");

  const contentHash = sha256Hex(job.rawText);
  const extractedJob = {
    title: job.title,
    company: job.company,
    location: job.location,
    workMode: job.workMode,
    seniority: job.seniority,
    requiredSkills: job.requiredSkills,
    niceToHaveSkills: job.niceToHaveSkills,
    responsibilities: job.responsibilities,
    salaryMin: job.salaryMin ? Number(job.salaryMin) : null,
    salaryMax: job.salaryMax ? Number(job.salaryMax) : null,
    salaryCurrency: job.salaryCurrency,
  };

  const start = Date.now();

  const scoringOutcome = await scoreJobAgainstResume(job, resume).catch(
    async (err: unknown) => {
      await prisma.scoringRun.create({
        data: {
          userId,
          jobId: job.id,
          resumeId: resume.id,
          status: "FAILED",
          sourceUrl: job.sourceUrl,
          contentHash,
          extractedJob,
          modelId: AI_MODELS.default,
          latencyMs: Date.now() - start,
          errorReason: err instanceof Error ? err.message : "Unknown scoring error",
        },
      });
      throw err;
    }
  );

  const { result, usage } = scoringOutcome;
  const latencyMs = Date.now() - start;
  const repaired = usage.repaired || (opts?.extractionRepaired ?? false);
  const status = repaired ? ("REPAIRED" as const) : ("SUCCESS" as const);
  const costCents = computeCostCents(
    AI_MODELS.default,
    usage.inputTokens,
    usage.outputTokens
  );

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.upsert({
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
        explanation: Prisma.DbNull,
      },
    });

    await tx.scoringRun.create({
      data: {
        userId,
        jobId: job.id,
        resumeId: resume.id,
        matchId: match.id,
        status,
        sourceUrl: job.sourceUrl,
        contentHash,
        extractedJob,
        score: result.score,
        modelId: AI_MODELS.default,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costCents,
        latencyMs,
      },
    });

    await tx.aiUsage.create({
      data: {
        userId,
        jobId,
        operation: "match_score",
        model: AI_MODELS.default,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costCents,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/jobs/${jobId}`);
}

export async function rescoreJobAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Please sign in and try again." };

    const rate = await enforceRateLimit("ai", `user:${session.user.id}`);
    if (!rate.ok) {
      return {
        error: "You're doing that too fast. Please wait a bit and try again.",
      };
    }

    const { jobId, resumeId } = parseFormData(formData, RescoreSchema);
    await scoreJob(jobId, resumeId);
    return {};
  } catch (err) {
    // Defensive: scoreJob() re-checks the session itself and can redirect()
    // if it's somehow gone by the time it runs, even though this action
    // already validated it above.
    unstable_rethrow(err);
    const message =
      err instanceof Error ? err.message : "Scoring failed. Please try again.";
    return { error: message };
  }
}
