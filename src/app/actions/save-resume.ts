"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveResume(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const title = (formData.get("title") as string | null)?.trim();
  const rawText = (formData.get("rawText") as string | null)?.trim();
  if (!title) throw new Error("Title is required");
  if (!rawText) throw new Error("Resume text is required");

  const existingCount = await prisma.resume.count({ where: { userId } });

  await prisma.resume.create({
    data: {
      userId,
      title,
      rawText,
      isDefault: existingCount === 0,
    },
  });

  revalidatePath("/dashboard/resumes");
  revalidatePath("/dashboard");
}

export async function setDefaultResume(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const resumeId = formData.get("resumeId") as string | null;
  if (!resumeId) throw new Error("resumeId is required");

  const target = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
  });
  if (!target) throw new Error("Resume not found");

  await prisma.$transaction([
    prisma.resume.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.resume.update({
      where: { id: resumeId },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/dashboard/resumes");
  revalidatePath("/dashboard");
}
