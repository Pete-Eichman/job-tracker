"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseFormData } from "@/lib/forms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const DeleteSchema = z.object({
  coverLetterId: z.string().min(1),
});

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
