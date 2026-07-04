"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  fetchPageText,
  extractJobFromText,
} from "@/lib/services/job-extraction";
import { scoreJob } from "@/app/actions/score-job";
import { parseFormData } from "@/lib/forms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { computeCostCents } from "@/lib/pricing";
import { AI_MODELS } from "@/lib/ai-models";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

const ExtractSchema = z.object({
  url: z.string().url(),
});

export async function extractAndSaveJob(
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
        await scoreJob(job.id, undefined, {
          extractionRepaired: usage.repaired,
        });
      } catch (err) {
        console.error("Auto-score failed for job", job.id, err);
      }
    }

    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    unstable_rethrow(err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Extraction failed. Please try again.",
    };
  }
}
