"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseFormData } from "@/lib/forms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { JOB_STATUS_VALUES } from "@/lib/job-status";
import type { JobStatus } from "@/generated/prisma/enums";

const UpdateStatusSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(JOB_STATUS_VALUES as [JobStatus, ...JobStatus[]]),
});

export async function updateStatusAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const parsed = parseFormData(formData, UpdateStatusSchema);

  const existing = await prisma.job.findFirst({
    where: { id: parsed.jobId, userId },
    select: { id: true, status: true, appliedAt: true },
  });
  if (!existing) throw new Error("Job not found");

  const data: { status: typeof parsed.status; appliedAt?: Date } = {
    status: parsed.status,
  };
  if (
    existing.appliedAt === null &&
    existing.status === "SAVED" &&
    parsed.status !== "SAVED"
  ) {
    data.appliedAt = new Date();
  }

  const result = await prisma.job.updateMany({
    where: { id: parsed.jobId, userId },
    data,
  });
  if (result.count !== 1) throw new Error("Job not found");
  revalidatePath(`/dashboard/jobs/${parsed.jobId}`);
  revalidatePath("/dashboard");
}

const UpdateJobSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(JOB_STATUS_VALUES as [JobStatus, ...JobStatus[]]),
  notes: z.string().max(10_000).optional().default(""),
  appliedAt: z.string().optional().default(""),
});

export async function updateJobAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const parsed = parseFormData(formData, UpdateJobSchema);

  const existing = await prisma.job.findFirst({
    where: { id: parsed.jobId, userId },
    select: { id: true, status: true, appliedAt: true },
  });
  if (!existing) throw new Error("Job not found");

  const trimmedNotes = parsed.notes.trim();
  let appliedAt: Date | null = parsed.appliedAt
    ? new Date(parsed.appliedAt)
    : null;

  if (
    appliedAt === null &&
    existing.appliedAt === null &&
    existing.status === "SAVED" &&
    parsed.status !== "SAVED"
  ) {
    appliedAt = new Date();
  }

  const result = await prisma.job.updateMany({
    where: { id: parsed.jobId, userId },
    data: {
      status: parsed.status,
      notes: trimmedNotes === "" ? null : trimmedNotes,
      appliedAt,
    },
  });
  if (result.count !== 1) throw new Error("Job not found");

  revalidatePath(`/dashboard/jobs/${parsed.jobId}`);
  revalidatePath("/dashboard");
}
