"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseFormData } from "@/lib/forms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const Schema = z.object({ jobId: z.string().min(1) });

async function setArchivedAt(
  formData: FormData,
  archivedAt: Date | null
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { jobId } = parseFormData(formData, Schema);
  const existing = await prisma.job.findFirst({
    where: { id: jobId, userId },
    select: { id: true },
  });
  if (!existing) throw new Error("Job not found");

  await prisma.job.update({
    where: { id: jobId },
    data: { archivedAt },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/jobs/${jobId}`);
}

export async function archiveJobAction(formData: FormData): Promise<void> {
  await setArchivedAt(formData, new Date());
}

export async function unarchiveJobAction(formData: FormData): Promise<void> {
  await setArchivedAt(formData, null);
}
