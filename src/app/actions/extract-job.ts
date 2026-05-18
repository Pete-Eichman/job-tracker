"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchPageText, extractJobFromText } from "@/lib/services/job-extraction";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function extractAndSaveJob(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const url = formData.get("url") as string;
  if (!url) throw new Error("URL is required");

  const rawText = await fetchPageText(url);
  const extracted = await extractJobFromText(rawText);

  await prisma.job.create({
    data: {
      userId: session.user.id,
      sourceUrl: url,
      rawText,
      ...extracted,
    },
  });

  revalidatePath("/dashboard");
}
