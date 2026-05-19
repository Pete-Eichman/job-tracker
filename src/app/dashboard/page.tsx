import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { extractAndSaveJob } from "@/app/actions/extract-job";
import { SubmitButton } from "@/components/SubmitButton";
import { formatSpend, formatTokens } from "@/lib/pricing";
import { StatusSelect } from "@/components/StatusSelect";
import {
  parseJobFilter,
  activePreset,
  presetHref,
  viewHref,
  jobWhereFromFilter,
  FILTER_PRESETS,
  type FilterPreset,
} from "@/lib/job-filters";
import {
  jobStaleness,
  formatRelativeDays,
  stalenessTextColor,
} from "@/lib/staleness";
import {
  parseJobSort,
  prismaOrderBy,
  compareByStale,
  compareByScore,
  sortHref,
  sortLabel,
  JOB_SORT_VALUES,
} from "@/lib/job-sort";

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-700 bg-green-50";
  if (score >= 50) return "text-yellow-700 bg-yellow-50";
  return "text-gray-700 bg-gray-100";
}

const PRESET_LABELS: Record<FilterPreset, string> = {
  all: "All",
  active: "Active",
  saved: "Saved",
  offers: "Offers",
  closed: "Closed",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    q?: string | string[];
    sort?: string | string[];
    archived?: string | string[];
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
  const jobs =
    sort === "stale"
      ? [...jobsRaw].sort((a, b) => compareByStale(a, b, now))
      : sort === "score"
        ? [...jobsRaw].sort(compareByScore)
        : jobsRaw;

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

        <form action={extractAndSaveJob} className="flex gap-2">
          <input
            name="url"
            type="url"
            required
            placeholder="Paste a job posting URL…"
            className="flex-1 px-3 py-2 border rounded-md text-sm"
          />
          <SubmitButton
            className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            pendingLabel="Extracting…"
          >
            Extract
          </SubmitButton>
        </form>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="text-gray-500">View:</span>
            <Link
              href={viewHref(false, filter.statuses, filter.query, sort)}
              className={`px-3 py-1 rounded-full border ${
                !filter.archived
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Active
            </Link>
            <Link
              href={viewHref(true, filter.statuses, filter.query, sort)}
              className={`px-3 py-1 rounded-full border ${
                filter.archived
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Archived
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FILTER_PRESETS) as FilterPreset[]).map((preset) => {
              const isActive = active === preset;
              return (
                <Link
                  key={preset}
                  href={presetHref(preset, filter.query, sort, filter.archived)}
                  className={`text-xs px-3 py-1 rounded-full border ${
                    isActive
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {PRESET_LABELS[preset]}
                </Link>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="text-gray-500">Sort:</span>
            {JOB_SORT_VALUES.map((value) => {
              const isActive = sort === value;
              return (
                <Link
                  key={value}
                  href={sortHref(
                    value,
                    filter.statuses,
                    filter.query,
                    filter.archived
                  )}
                  className={`px-2 py-1 rounded-full border ${
                    isActive
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {sortLabel(value)}
                </Link>
              );
            })}
          </div>
          <form action="/dashboard" className="flex gap-2">
            <input type="hidden" name="status" value={hiddenStatus} />
            <input type="hidden" name="sort" value={sort} />
            {filter.archived && (
              <input type="hidden" name="archived" value="1" />
            )}
            <input
              name="q"
              type="search"
              defaultValue={filter.query}
              placeholder="Search company or title…"
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <button
              type="submit"
              className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50"
            >
              Search
            </button>
            {filter.query !== "" && (
              <Link
                href={sortHref(sort, filter.statuses, "", filter.archived)}
                className="px-3 py-2 border rounded-md text-sm text-gray-600 hover:bg-gray-50"
                title="Clear search"
              >
                ×
              </Link>
            )}
          </form>
        </div>

        <div className="space-y-4">
          {jobs.length === 0 && !isFiltered && !filter.archived && (
            <p className="text-sm text-gray-500">
              No jobs saved yet. Paste a URL above to get started.
            </p>
          )}
          {jobs.length === 0 && !isFiltered && filter.archived && (
            <p className="text-sm text-gray-500">No archived jobs.</p>
          )}
          {jobs.length === 0 && isFiltered && (
            <p className="text-sm text-gray-500">
              No jobs match this filter.{" "}
              <Link
                href={viewHref(filter.archived, [], "", "created")}
                className="underline"
              >
                Clear filters
              </Link>
              .
            </p>
          )}
          {jobs.map((job) => {
            const match = job.matches[0];
            return (
              <div key={job.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="font-medium hover:underline"
                    >
                      {job.title}
                    </Link>
                    <p className="text-sm text-gray-600">
                      {job.company}
                      {job.location ? ` · ${job.location}` : ""}
                    </p>
                    <p
                      className={`text-xs ${stalenessTextColor(jobStaleness(job.status, job.updatedAt))}`}
                      title={job.updatedAt.toLocaleString()}
                    >
                      Last touched {formatRelativeDays(job.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-sm font-semibold px-2 py-1 rounded-md ${
                        match ? scoreColor(match.score) : "text-gray-400 bg-gray-50"
                      }`}
                      title={match ? "Match score / 100" : "Not scored yet"}
                    >
                      {match ? match.score : "—"}
                    </span>
                    <StatusSelect
                      jobId={job.id}
                      currentStatus={job.status}
                    />
                  </div>
                </div>
                {job.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                {job.sourceUrl && (
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:underline"
                  >
                    {job.sourceUrl}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
