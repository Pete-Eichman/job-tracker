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

  const navButtonClass =
    "px-3 py-1.5 border border-border rounded-lg text-xs text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors duration-150";

  return (
    <div className="min-h-screen px-4 py-6 sm:p-8 bg-bg">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold tracking-tight text-fg">
              Dashboard
            </h1>
            {usageCount > 0 && (
              <Link
                href="/dashboard/usage"
                className="text-xs font-mono tabular-nums text-fg-subtle hover:text-fg-muted transition-colors duration-150"
              >
                {usageCount} AI {usageCount === 1 ? "call" : "calls"} ·{" "}
                {formatTokens(totalTokens)} tokens ·{" "}
                {formatSpend(totalCents)} spent
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <a href="/api/jobs/export" className={navButtonClass}>
              Export CSV
            </a>
            <Link href="/dashboard/resumes" className={navButtonClass}>
              Resumes
            </Link>
            <form action={logout}>
              <SubmitButton
                className={`${navButtonClass} disabled:opacity-50`}
                pendingLabel="Signing out…"
              >
                Sign out
              </SubmitButton>
            </form>
          </div>
        </div>

        {/* Resume warning */}
        {!defaultResume && (
          <div className="rounded-lg border border-accent/20 bg-accent-soft px-3 py-2 text-sm text-fg-muted flex flex-col sm:flex-row sm:items-center sm:gap-1">
            <span>Add a resume to enable match scoring.</span>
            <Link
              href="/dashboard/resumes"
              className="text-accent hover:text-accent/80 underline underline-offset-2"
            >
              Add one now.
            </Link>
          </div>
        )}

        <ExtractForm />

        <FilterBar
          filter={filter}
          sort={sort}
          hiddenStatus={hiddenStatus}
          active={active}
        />

        {/* Job list */}
        <div className="space-y-3">
          {jobs.length === 0 && (
            <div className="py-16 text-center">
              {filter.attention ? (
                <p className="text-sm text-fg-muted">
                  Nothing needs follow-up right now. Nice work.
                </p>
              ) : filter.archived ? (
                <p className="text-sm text-fg-muted">No archived jobs.</p>
              ) : isFiltered ? (
                <div className="space-y-2">
                  <p className="text-sm text-fg-muted">
                    No jobs match this filter.
                  </p>
                  <Link
                    href="/dashboard"
                    className="text-xs text-accent hover:text-accent/80 transition-colors duration-150"
                  >
                    Clear filters →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p
                    className="text-4xl text-fg-subtle select-none"
                    aria-hidden
                  >
                    ↑
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-fg-muted">
                      No jobs saved yet.
                    </p>
                    <p className="text-xs text-fg-subtle">
                      Paste a job posting URL above to get started.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {jobs.map((job, i) => (
            <div
              key={job.id}
              className="motion-fade-up"
              style={{ animationDelay: `${Math.min(i, 7) * 60}ms` }}
            >
              <JobCard job={job} archived={filter.archived} now={now} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
