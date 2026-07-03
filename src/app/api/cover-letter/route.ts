import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { streamCoverLetter } from "@/lib/services/cover-letter";
import { scoreJob } from "@/app/actions/score-job";
import { enforceRateLimit } from "@/lib/rate-limit";
import { computeCostCents } from "@/lib/pricing";
import { AI_MODELS } from "@/lib/ai-models";

const BodySchema = z.object({
  jobId: z.string().min(1),
  resumeId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const rate = await enforceRateLimit("ai", `user:${userId}`);
  if (!rate.ok) {
    return new Response("Too many requests. Please wait a moment.", {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return new Response("jobId is required", { status: 400 });
  }
  const { jobId, resumeId } = parsed.data;

  const job = await prisma.job.findFirst({ where: { id: jobId, userId } });
  if (!job) return new Response("Job not found", { status: 404 });

  const resume = resumeId
    ? await prisma.resume.findFirst({ where: { id: resumeId, userId } })
    : await prisma.resume.findFirst({ where: { userId, isDefault: true } });
  if (!resume) {
    return new Response(
      "Resume not found. Add a resume to draft a cover letter.",
      { status: 400 }
    );
  }

  let match = await prisma.match.findUnique({
    where: { jobId_resumeId: { jobId: job.id, resumeId: resume.id } },
  });
  if (!match) {
    await scoreJob(job.id, resume.id);
    match = await prisma.match.findUnique({
      where: { jobId_resumeId: { jobId: job.id, resumeId: resume.id } },
    });
  }

  const stream = streamCoverLetter(job, resume, match ?? undefined, {
    onFinish: async ({ text, usage, finishReason }) => {
      if (finishReason !== "stop") return;
      await prisma.coverLetter.create({
        data: { jobId: job.id, resumeId: resume.id, draft: text.trim() },
      });
      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;
      await prisma.aiUsage.create({
        data: {
          userId,
          jobId: job.id,
          operation: "cover_letter",
          model: AI_MODELS.default,
          inputTokens,
          outputTokens,
          costCents: computeCostCents(
            AI_MODELS.default,
            inputTokens,
            outputTokens
          ),
        },
      });
    },
    onError: ({ error }) => {
      console.error("Cover letter stream error", error);
    },
  });

  return stream.toTextStreamResponse();
}
