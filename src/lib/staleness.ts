import type { JobStatus } from "@/generated/prisma/enums";

export type Staleness = "fresh" | "aging" | "stale";

const IN_FLIGHT: ReadonlySet<JobStatus> = new Set<JobStatus>([
  "APPLIED",
  "PHONE_SCREEN",
  "TECHNICAL",
  "ONSITE",
]);

const DAY_MS = 24 * 60 * 60 * 1000;
const AGING_DAYS = 7;
const STALE_DAYS = 14;

export function jobStaleness(
  status: JobStatus,
  updatedAt: Date,
  now: Date = new Date()
): Staleness | null {
  if (!IN_FLIGHT.has(status)) return null;
  const days = Math.floor((now.getTime() - updatedAt.getTime()) / DAY_MS);
  if (days >= STALE_DAYS) return "stale";
  if (days >= AGING_DAYS) return "aging";
  return "fresh";
}

export function formatRelativeDays(
  date: Date,
  now: Date = new Date()
): string {
  const days = Math.floor((now.getTime() - date.getTime()) / DAY_MS);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const STALENESS_TEXT: Record<Staleness, string> = {
  fresh: "text-gray-500",
  aging: "text-amber-700",
  stale: "text-red-700",
};

export function stalenessTextColor(s: Staleness | null): string {
  return s ? STALENESS_TEXT[s] : "text-gray-400";
}
