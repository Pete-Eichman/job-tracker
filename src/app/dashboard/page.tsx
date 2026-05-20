import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ExtractForm } from "./ExtractForm";
import { SubmitButton } from "@/components/SubmitButton";
import { formatSpend, formatTokens } from "@/lib/pricing";
import {
  parseJobFilter,
  activePreset,
  jobWhereFromFilter,
} from "@/lib/job-filters";
import {
  parseJobSort,
  prismaOrderBy,
  compareByStale,
  compareByScore,
} from "@/lib/job-sort";
import { needsAttention } from "@/lib/follow-up";
import { FilterBar } from "./FilterBar";
import { JobCard } from "./JobCard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    q?: string | string[];
    sort?: string | string[];
    archived?: string | string[];
    attention?: string | string[];
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id!;

  const params = await searchParams;
  const filter = parseJobFilter(params);
  const sort = parseJobSort(params.sort);
  const active = activePreset(filter);
  const hiddenStatus = filter.statuses.join(",");

  const [jobsRaw, defaultResume, usage] = await Promise.all([
    prisma.job.findMany({
      where: jobWhereFromFilter(userId, filter),
      orderBy: prismaOrderBy(sort) ?? { createdAt: "desc" },
      include: {
        matches: { take: 1, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.resume.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    }),
    prisma.aiUsage.aggregate({
      where: { userId },
      _sum: { costCents: true, inputTokens: true, outputTokens: true },
      _count: true,
    }),
  ]);

  const now = new Date();
  const sorted =
    sort === "stale"
      ? [...jobsRaw].sort((a, b) => compareByStale(a, b, now))
      : sort === "score"
        ? [...jobsRaw].sort(compareByScore)
        : jobsRaw;
  const jobs = filter.attention
    ? sorted.filter((j) => needsAttention(j.status, j.updatedAt, now))
    : sorted;

  const isFiltered = active !== "all" || filter.query !== "";

  const usageCount = usage._count;
  const totalTokens =
    (usage._sum.inputTokens ?? 0) + (usage._sum.outputTokens ?? 0);
  const totalCents = usage._sum.costCents ?? 0;

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            {usageCount > 0 && (
              <Link
                href="/dashboard/usage"
                className="text-xs text-gray-500 hover:text-gray-800 hover:underline"
              >
                {usageCount} AI {usageCount === 1 ? "call" : "calls"} ·{" "}
                {formatTokens(totalTokens)} tokens ·{" "}
                {formatSpend(totalCents)} spent
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/jobs/export"
              className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
            >
              Export CSV
            </a>
            <Link
              href="/dashboard/resumes"
              className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
            >
              Resumes
            </Link>
            <form action={logout}>
              <SubmitButton className="px-4 py-2 border rounded-md text-sm disabled:opacity-50">
                Sign out
              </SubmitButton>
            </form>
          </div>
        </div>

        {!defaultResume && (
          <div className="border border-yellow-200 bg-yellow-50 text-yellow-900 rounded-md px-3 py-2 text-sm">
            Add a resume to enable match scoring.{" "}
            <Link href="/dashboard/resumes" className="underline">
              Add one now
            </Link>
            .
          </div>
        )}

        <ExtractForm />

        <FilterBar
          filter={filter}
          sort={sort}
          hiddenStatus={hiddenStatus}
          active={active}
        />

        <div className="space-y-4">
          {jobs.length === 0 && filter.attention && (
            <p className="text-sm text-gray-500">
              Nothing needs follow-up right now. Nice work.
            </p>
          )}
          {jobs.length === 0 &&
            !filter.attention &&
            !isFiltered &&
            !filter.archived && (
              <p className="text-sm text-gray-500">
                No jobs saved yet. Paste a URL above to get started.
              </p>
            )}
          {jobs.length === 0 &&
            !filter.attention &&
            !isFiltered &&
            filter.archived && (
              <p className="text-sm text-gray-500">No archived jobs.</p>
            )}
          {jobs.length === 0 && !filter.attention && isFiltered && (
            <p className="text-sm text-gray-500">
              No jobs match this filter.{" "}
              <Link
                href={`/dashboard`}
                className="underline"
              >
                Clear filters
              </Link>
              .
            </p>
          )}
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              archived={filter.archived}
              now={now}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
