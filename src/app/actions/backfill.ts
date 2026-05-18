"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { backfillUsageCosts } from "@/lib/backfill";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function backfillUsageCostsAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  await backfillUsageCosts(prisma, { userId });

  revalidatePath("/dashboard/usage");
  revalidatePath("/dashboard");
}
