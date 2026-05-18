import type { JobStatus } from "@/generated/prisma/enums";

const LABELS: Record<JobStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  PHONE_SCREEN: "Phone screen",
  TECHNICAL: "Technical",
  ONSITE: "Onsite",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export function statusLabel(status: JobStatus): string {
  return LABELS[status];
}

const COLORS: Record<JobStatus, string> = {
  SAVED: "bg-gray-100 text-gray-700",
  APPLIED: "bg-blue-100 text-blue-700",
  PHONE_SCREEN: "bg-blue-100 text-blue-700",
  TECHNICAL: "bg-blue-100 text-blue-700",
  ONSITE: "bg-blue-100 text-blue-700",
  OFFER: "bg-green-100 text-green-700",
  REJECTED: "bg-gray-200 text-gray-500",
  WITHDRAWN: "bg-gray-200 text-gray-500",
};

export function statusColor(status: JobStatus): string {
  return COLORS[status];
}

export const JOB_STATUS_VALUES = Object.keys(LABELS) as JobStatus[];
