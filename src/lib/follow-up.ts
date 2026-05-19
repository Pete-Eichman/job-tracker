import type { JobStatus } from "@/generated/prisma/enums";

const DAY_MS = 24 * 60 * 60 * 1000;

export function needsAttention(
  status: JobStatus,
  updatedAt: Date,
  now: Date = new Date()
): boolean {
  const days = Math.floor((now.getTime() - updatedAt.getTime()) / DAY_MS);
  switch (status) {
    case "SAVED":
      return days >= 14;
    case "APPLIED":
      return days >= 10;
    case "PHONE_SCREEN":
    case "TECHNICAL":
    case "ONSITE":
      return days >= 7;
    default:
      return false;
  }
}
