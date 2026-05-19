"use client";

import { useTransition, useState } from "react";
import type { JobStatus } from "@/generated/prisma/enums";
import { JOB_STATUS_VALUES, statusColor, statusLabel } from "@/lib/job-status";
import { updateStatusAction } from "@/app/actions/update-job";

export function StatusSelect({
  jobId,
  currentStatus,
}: {
  jobId: string;
  currentStatus: JobStatus;
}) {
  const [status, setStatus] = useState<JobStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as JobStatus;
    setStatus(next);
    const fd = new FormData();
    fd.set("jobId", jobId);
    fd.set("status", next);
    startTransition(async () => {
      await updateStatusAction(fd);
    });
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={isPending}
      className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none ${statusColor(status)}`}
    >
      {JOB_STATUS_VALUES.map((s) => (
        <option key={s} value={s}>
          {statusLabel(s)}
        </option>
      ))}
    </select>
  );
}
