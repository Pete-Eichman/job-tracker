"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchPageText, extractJobFromText } from "@/lib/services/job-extraction";
import { scoreJob } from "@/app/actions/score-job";
import { parseFormData } from "@/lib/forms";
import { computeCostCents } from "@/lib/pricing";
import { AI_MODELS } from "@/lib/ai-models";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ExtractSchema = z.object({
  url: z.string().url(),
});

export async function extractAndSaveJob(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { url } = parseFormData(formData, ExtractSchema);

  const rawText = await fetchPageText(url);
  const { result: extracted, usage } = await extractJobFromText(rawText);

  const job = await prisma.job.create({
    data: {
      userId,
      sourceUrl: url,
      rawText,
      ...extracted,
    },
  });

  await prisma.aiUsage.create({
    data: {
      userId,
      jobId: job.id,
      operation: "job_extract",
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

  const defaultResume = await prisma.resume.findFirst({
    where: { userId, isDefault: true },
    select: { id: true },
  });
  if (defaultResume) {
    try {
      await scoreJob(job.id);
    } catch (err) {
      console.error("Auto-score failed for job", job.id, err);
    }
  }

  revalidatePath("/dashboard");
}
