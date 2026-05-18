"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchPageText, extractJobFromText } from "@/lib/services/job-extraction";
import { scoreJob } from "@/app/actions/score-job";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function extractAndSaveJob(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const url = formData.get("url") as string;
  if (!url) throw new Error("URL is required");

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
      operation: "job_extract",
      model: "claude-sonnet-4-6",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costCents: 0,
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
