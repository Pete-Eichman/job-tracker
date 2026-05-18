"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateCoverLetter } from "@/lib/services/cover-letter";
import { scoreJob } from "@/app/actions/score-job";
import { parseFormData } from "@/lib/forms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const GenerateSchema = z.object({
  jobId: z.string().min(1),
});

const DeleteSchema = z.object({
  coverLetterId: z.string().min(1),
});

export async function generateCoverLetterAction(
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { jobId } = parseFormData(formData, GenerateSchema);

  const job = await prisma.job.findFirst({ where: { id: jobId, userId } });
  if (!job) throw new Error("Job not found");

  const resume = await prisma.resume.findFirst({
    where: { userId, isDefault: true },
  });
  if (!resume) {
    throw new Error("No default resume. Add a resume to draft a cover letter.");
  }

  let match = await prisma.match.findUnique({
    where: { jobId_resumeId: { jobId: job.id, resumeId: resume.id } },
  });
  if (!match) {
    await scoreJob(job.id);
    match = await prisma.match.findUnique({
      where: { jobId_resumeId: { jobId: job.id, resumeId: resume.id } },
    });
  }

  const { draft, usage } = await generateCoverLetter(
    job,
    resume,
    match ?? undefined
  );

  await prisma.coverLetter.create({
    data: { jobId: job.id, draft },
  });

  await prisma.aiUsage.create({
    data: {
      userId,
      operation: "cover_letter",
      model: "claude-sonnet-4-6",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costCents: 0,
    },
  });

  revalidatePath(`/dashboard/jobs/${jobId}`);
}

export async function deleteCoverLetterAction(
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { coverLetterId } = parseFormData(formData, DeleteSchema);

  const letter = await prisma.coverLetter.findUnique({
    where: { id: coverLetterId },
    select: { id: true, jobId: true, job: { select: { userId: true } } },
  });
  if (!letter || letter.job.userId !== userId) {
    throw new Error("Cover letter not found");
  }

  await prisma.coverLetter.delete({ where: { id: coverLetterId } });

  revalidatePath(`/dashboard/jobs/${letter.jobId}`);
}
