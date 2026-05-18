import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  formatSpend,
  formatTokens,
  formatOperation,
} from "@/lib/pricing";

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
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Usage breakdown</h1>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-gray-500">
            No AI activity yet. Extract a job or score a match to see usage
            here.
          </p>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
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
                    <tr key={g.operation} className="border-t">
                      <td className="px-4 py-2">
                        {formatOperation(g.operation)}
                      </td>
                      <td className="text-right px-4 py-2 tabular-nums">
                        {g._count}
                      </td>
                      <td className="text-right px-4 py-2 tabular-nums">
                        {formatTokens(g._sum.inputTokens ?? 0)}
                      </td>
                      <td className="text-right px-4 py-2 tabular-nums">
                        {formatTokens(g._sum.outputTokens ?? 0)}
                      </td>
                      <td className="text-right px-4 py-2 tabular-nums">
                        {formatSpend(g._sum.costCents ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr className="border-t">
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

            {untrackedCount > 0 && (
              <p className="text-xs text-gray-500">
                {untrackedCount} older{" "}
                {untrackedCount === 1 ? "row was" : "rows were"} written before
                cost tracking landed and{" "}
                {untrackedCount === 1 ? "shows" : "show"} $0.00. Token counts
                are still correct.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
