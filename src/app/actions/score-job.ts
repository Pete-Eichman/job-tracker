"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreJobAgainstResume } from "@/lib/services/match-scoring";
import { parseFormData } from "@/lib/forms";
import { computeCostCents } from "@/lib/pricing";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const RescoreSchema = z.object({
  jobId: z.string().min(1),
});

export async function scoreJob(jobId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
  });
  if (!job) throw new Error("Job not found");

  const resume = await prisma.resume.findFirst({
    where: { userId, isDefault: true },
  });
  if (!resume) throw new Error("No default resume. Add a resume to enable match scoring.");

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
      operation: "match_score",
      model: "claude-sonnet-4-6",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costCents: computeCostCents(
        "claude-sonnet-4-6",
        usage.inputTokens,
        usage.outputTokens
      ),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/jobs/${jobId}`);
}

export async function rescoreJobAction(formData: FormData): Promise<void> {
  const { jobId } = parseFormData(formData, RescoreSchema);
  await scoreJob(jobId);
}
