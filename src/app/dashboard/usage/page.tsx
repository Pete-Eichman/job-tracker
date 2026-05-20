import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  formatSpend,
  formatTokens,
  formatOperation,
} from "@/lib/pricing";
import { backfillUsageCostsAction } from "@/app/actions/backfill";
import { SubmitButton } from "@/components/SubmitButton";

const navButtonClass =
  "px-3 py-1.5 border border-border rounded-lg text-xs text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors duration-150";

export default async function UsagePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [groups, untrackedCount] = await Promise.all([
    prisma.aiUsage.groupBy({
      by: ["operation"],
      where: { userId },
      _count: true,
      _sum: { inputTokens: true, outputTokens: true, costCents: true },
      orderBy: { operation: "asc" },
    }),
    prisma.aiUsage.count({
      where: {
        userId,
        costCents: 0,
        OR: [
          { inputTokens: { gt: 0 } },
          { outputTokens: { gt: 0 } },
        ],
      },
    }),
  ]);

  const totals = groups.reduce(
    (acc, g) => ({
      calls: acc.calls + g._count,
      input: acc.input + (g._sum.inputTokens ?? 0),
      output: acc.output + (g._sum.outputTokens ?? 0),
      cost: acc.cost + (g._sum.costCents ?? 0),
    }),
    { calls: 0, input: 0, output: 0, cost: 0 }
  );

  return (
    <div className="min-h-screen px-4 py-6 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-fg">Usage breakdown</h1>
          <Link href="/dashboard" className={navButtonClass}>
            ← Back to dashboard
          </Link>
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-fg-subtle">
            No AI activity yet. Extract a job or score a match to see usage
            here.
          </p>
        ) : (
          <>
            <div className="border border-border rounded-xl overflow-hidden bg-surface">
              <div className="overflow-x-auto -mx-px">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-fg-muted">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">
                        Operation
                      </th>
                      <th className="text-right px-4 py-2 font-medium">Calls</th>
                      <th className="text-right px-4 py-2 font-medium">Input</th>
                      <th className="text-right px-4 py-2 font-medium">Output</th>
                      <th className="text-right px-4 py-2 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.operation} className="border-t border-border">
                        <td className="px-4 py-2 text-fg">
                          {formatOperation(g.operation)}
                        </td>
                        <td className="text-right px-4 py-2 tabular-nums text-fg-muted">
                          {g._count}
                        </td>
                        <td className="text-right px-4 py-2 tabular-nums text-fg-muted">
                          {formatTokens(g._sum.inputTokens ?? 0)}
                        </td>
                        <td className="text-right px-4 py-2 tabular-nums text-fg-muted">
                          {formatTokens(g._sum.outputTokens ?? 0)}
                        </td>
                        <td className="text-right px-4 py-2 tabular-nums text-fg-muted">
                          {formatSpend(g._sum.costCents ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-surface-2 font-medium text-fg">
                    <tr className="border-t border-border">
                      <td className="px-4 py-2">Total</td>
                      <td className="text-right px-4 py-2 tabular-nums">
                        {totals.calls}
                      </td>
                      <td className="text-right px-4 py-2 tabular-nums">
                        {formatTokens(totals.input)}
                      </td>
                      <td className="text-right px-4 py-2 tabular-nums">
                        {formatTokens(totals.output)}
                      </td>
                      <td className="text-right px-4 py-2 tabular-nums">
                        {formatSpend(totals.cost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {untrackedCount > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-fg-subtle">
                  {untrackedCount} older{" "}
                  {untrackedCount === 1 ? "row was" : "rows were"} written
                  before cost tracking landed and{" "}
                  {untrackedCount === 1 ? "shows" : "show"} $0.00. Token counts
                  are still correct.
                </p>
                <form action={backfillUsageCostsAction}>
                  <SubmitButton
                    pendingLabel="Backfilling…"
                    className={`${navButtonClass} disabled:opacity-50`}
                  >
                    Backfill costs for these rows
                  </SubmitButton>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
