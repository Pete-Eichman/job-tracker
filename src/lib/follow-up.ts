import type { JobStatus } from "@/generated/prisma/enums";
import { DAY_MS } from "@/lib/staleness";

const FOLLOW_UP_DAYS: Partial<Record<JobStatus, number>> = {
  SAVED: 14,
  APPLIED: 10,
  PHONE_SCREEN: 7,
  TECHNICAL: 7,
  ONSITE: 7,
};

export function needsAttention(
  status: JobStatus,
  updatedAt: Date,
  now: Date = new Date()
): boolean {
  const days = Math.floor((now.getTime() - updatedAt.getTime()) / DAY_MS);
  return days >= (FOLLOW_UP_DAYS[status] ?? Infinity);
}
