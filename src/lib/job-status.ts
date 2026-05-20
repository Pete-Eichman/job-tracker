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
  SAVED: "bg-surface-2 text-fg-muted",
  APPLIED: "bg-status-inflight-bg text-accent",
  PHONE_SCREEN: "bg-status-inflight-bg text-accent",
  TECHNICAL: "bg-status-inflight-bg text-accent",
  ONSITE: "bg-status-inflight-bg text-accent",
  OFFER: "bg-status-positive-bg text-positive",
  REJECTED: "bg-surface-2 text-fg-subtle",
  WITHDRAWN: "bg-surface-2 text-fg-subtle",
};

export function statusColor(status: JobStatus): string {
  return COLORS[status];
}

export const JOB_STATUS_VALUES = Object.keys(LABELS) as JobStatus[];
