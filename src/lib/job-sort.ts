import type { Prisma } from "@/generated/prisma/client";
import type { JobStatus } from "@/generated/prisma/enums";
import { jobStaleness } from "@/lib/staleness";

export type JobSort = "created" | "applied" | "updated" | "stale" | "score";

export const JOB_SORT_VALUES: JobSort[] = [
  "created",
  "applied",
  "updated",
  "stale",
  "score",
];

const SORT_LABELS: Record<JobSort, string> = {
  created: "Newest",
  applied: "Applied date",
  updated: "Recently touched",
  stale: "Stale first",
  score: "Match score",
};

export function sortLabel(sort: JobSort): string {
  return SORT_LABELS[sort];
}

export function parseJobSort(
  value: string | string[] | undefined
): JobSort {
  const v = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  return (JOB_SORT_VALUES as string[]).includes(v) ? (v as JobSort) : "created";
}

export function prismaOrderBy(
  sort: JobSort
): Prisma.JobOrderByWithRelationInput | null {
  switch (sort) {
    case "created":
      return { createdAt: "desc" };
    case "updated":
      return { updatedAt: "desc" };
    case "applied":
      return { appliedAt: { sort: "desc", nulls: "last" } };
    case "stale":
    case "score":
      return null;
  }
}

type JobRow = {
  status: JobStatus;
  updatedAt: Date;
  matches: { score: number }[];
};

const STALE_RANK: Record<string, number> = { stale: 3, aging: 2, fresh: 1 };

export function compareByStale(a: JobRow, b: JobRow, now: Date): number {
  const sa = jobStaleness(a.status, a.updatedAt, now);
  const sb = jobStaleness(b.status, b.updatedAt, now);
  const ra = sa ? STALE_RANK[sa] : 0;
  const rb = sb ? STALE_RANK[sb] : 0;
  if (ra !== rb) return rb - ra;
  return a.updatedAt.getTime() - b.updatedAt.getTime();
}

export function compareByScore(a: JobRow, b: JobRow): number {
  const sa = a.matches[0]?.score ?? -1;
  const sb = b.matches[0]?.score ?? -1;
  return sb - sa;
}

export function sortHref(
  sort: JobSort,
  statuses: JobStatus[],
  query: string,
  archived = false,
  attention = false
): string {
  const params = new URLSearchParams();
  if (statuses.length > 0) params.set("status", statuses.join(","));
  if (query) params.set("q", query);
  if (sort !== "created") params.set("sort", sort);
  if (archived) params.set("archived", "1");
  if (attention) params.set("attention", "1");
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}
