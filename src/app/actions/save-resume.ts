"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseFormData } from "@/lib/forms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const SaveResumeSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  rawText: z
    .string()
    .trim()
    .min(1, "Resume text is required")
    .max(50_000, "Resume too long — paste plain text only."),
});

const SetDefaultSchema = z.object({
  resumeId: z.string().min(1),
});

export async function saveResume(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    const userId = session.user.id;

    const { title, rawText } = parseFormData(formData, SaveResumeSchema);

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
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Save failed. Please try again.",
    };
  }
}

export async function setDefaultResume(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    const userId = session.user.id;

    const { resumeId } = parseFormData(formData, SetDefaultSchema);

    const target = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
    });
    if (!target) throw new Error("Resume not found");

    await prisma.$transaction([
      prisma.resume.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.resume.updateMany({
        where: { id: resumeId, userId },
        data: { isDefault: true },
      }),
    ]);

    revalidatePath("/dashboard/resumes");
    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to set default. Please try again.",
    };
  }
}
