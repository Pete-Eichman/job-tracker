"use client";

import { useActionState, useState } from "react";
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
  const [state, formAction, isPending] = useActionState(updateStatusAction, {});

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as JobStatus;
    setStatus(next);
    const fd = new FormData();
    fd.set("jobId", jobId);
    fd.set("status", next);
    formAction(fd);
  }

  return (
    <div className="flex flex-col items-end gap-1">
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
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
