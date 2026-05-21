"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseFormData } from "@/lib/forms";
import { extractPdfText } from "@/lib/services/pdf-extract";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MIN_TEXT_CHARS = 50;

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

    const title = String(formData.get("title") ?? "").trim();
    const pdf = formData.get("pdf");
    let rawText = String(formData.get("rawText") ?? "");

    if (pdf instanceof File && pdf.size > 0) {
      if (pdf.type !== "application/pdf") return { error: "File must be a PDF." };
      if (pdf.size > MAX_PDF_BYTES) return { error: "PDF must be under 5 MB." };
      let extracted: string;
      try {
        extracted = await extractPdfText(new Uint8Array(await pdf.arrayBuffer()));
      } catch {
        return { error: "Couldn't read that PDF. Try re-exporting or paste text instead." };
      }
      if (extracted.replace(/\s+/g, "").length < MIN_TEXT_CHARS) {
        return { error: "This PDF appears to be empty or scanned. Paste the text instead." };
      }
      rawText = extracted;
    }

    if (!rawText.trim()) return { error: "Upload a PDF or paste resume text." };

    const { title: parsedTitle, rawText: parsedRawText } = SaveResumeSchema.parse({ title, rawText });

    const existingCount = await prisma.resume.count({ where: { userId } });

    await prisma.resume.create({
      data: {
        userId,
        title: parsedTitle,
        rawText: parsedRawText,
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
