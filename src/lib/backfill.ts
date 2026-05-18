import type { PrismaClient } from "@/generated/prisma/client";
import { computeCostCents } from "@/lib/pricing";

export type BackfillCandidate = {
  id: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export function planBackfillUpdates(
  rows: BackfillCandidate[]
): { id: string; costCents: number }[] {
  return rows
    .map((r) => ({
      id: r.id,
      costCents: computeCostCents(r.model, r.inputTokens, r.outputTokens),
    }))
    .filter((u) => u.costCents > 0);
}

export async function backfillUsageCosts(
  prisma: PrismaClient,
  where: { userId?: string } = {}
): Promise<number> {
  const rows = await prisma.aiUsage.findMany({
    where: {
      ...where,
      costCents: 0,
      OR: [{ inputTokens: { gt: 0 } }, { outputTokens: { gt: 0 } }],
    },
    select: { id: true, model: true, inputTokens: true, outputTokens: true },
  });
  const updates = planBackfillUpdates(rows);
  for (const u of updates) {
    await prisma.aiUsage.update({
      where: { id: u.id },
      data: { costCents: u.costCents },
    });
  }
  return updates.length;
}
