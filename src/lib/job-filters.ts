import type { JobStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { JOB_STATUS_VALUES } from "@/lib/job-status";

export type JobFilter = {
  statuses: JobStatus[];
  query: string;
};

export const FILTER_PRESETS = {
  all: [] as JobStatus[],
  active: ["APPLIED", "PHONE_SCREEN", "TECHNICAL", "ONSITE"] as JobStatus[],
  saved: ["SAVED"] as JobStatus[],
  offers: ["OFFER"] as JobStatus[],
  closed: ["REJECTED", "WITHDRAWN"] as JobStatus[],
} as const;

export type FilterPreset = keyof typeof FILTER_PRESETS;

const VALID = new Set<string>(JOB_STATUS_VALUES);

function firstString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export function parseJobFilter(searchParams: {
  status?: string | string[];
  q?: string | string[];
}): JobFilter {
  const statuses = firstString(searchParams.status)
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => VALID.has(s)) as JobStatus[];
  return { statuses, query: firstString(searchParams.q).trim() };
}

export function activePreset(filter: JobFilter): FilterPreset | null {
  const cur = new Set(filter.statuses);
  for (const [name, statuses] of Object.entries(FILTER_PRESETS) as [
    FilterPreset,
    JobStatus[],
  ][]) {
    if (cur.size === statuses.length && statuses.every((s) => cur.has(s))) {
      return name;
    }
  }
  return null;
}

export function presetHref(preset: FilterPreset, query: string): string {
  const params = new URLSearchParams();
  const statuses = FILTER_PRESETS[preset];
  if (statuses.length > 0) params.set("status", statuses.join(","));
  if (query) params.set("q", query);
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

export function jobWhereFromFilter(
  userId: string,
  filter: JobFilter
): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = { userId };
  if (filter.statuses.length > 0) {
    where.status = { in: filter.statuses };
  }
  if (filter.query) {
    where.OR = [
      { title: { contains: filter.query, mode: "insensitive" } },
      { company: { contains: filter.query, mode: "insensitive" } },
    ];
  }
  return where;
}
