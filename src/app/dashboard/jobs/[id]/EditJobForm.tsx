"use client";

import { useActionState } from "react";
import { updateJobAction } from "@/app/actions/update-job";
import { SubmitButton } from "@/components/SubmitButton";
import { JOB_STATUS_VALUES, statusLabel } from "@/lib/job-status";
import {
  jobStaleness,
  formatRelativeDays,
  stalenessTextColor,
} from "@/lib/staleness";
import type { JobStatus } from "@/generated/prisma/enums";

interface Props {
  jobId: string;
  status: JobStatus;
  notes: string | null;
  appliedAt: string | null;
  updatedAt: string;
}

export function EditJobForm({
  jobId,
  status,
  notes,
  appliedAt,
  updatedAt,
}: Props) {
  const [state, formAction] = useActionState(updateJobAction, {});
  const updatedAtDate = new Date(updatedAt);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="space-y-1 block">
          <span className="text-sm font-medium">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="w-full border rounded-md px-3 py-2 text-sm bg-white"
          >
            {JOB_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-sm font-medium">Applied on</span>
          <input
            type="date"
            name="appliedAt"
            defaultValue={appliedAt ?? ""}
            className="w-full border rounded-md px-3 py-2 text-sm bg-white"
          />
          <span className="text-xs text-gray-500 block">
            Auto-set to today when you first move past Saved.
          </span>
        </label>
      </div>
      <label className="space-y-1 block">
        <span className="text-sm font-medium">Notes</span>
        <textarea
          name="notes"
          rows={4}
          maxLength={10_000}
          defaultValue={notes ?? ""}
          placeholder="Recruiter, follow-ups, interview prep, etc."
          className="w-full border rounded-md px-3 py-2 text-sm bg-white"
        />
      </label>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p
            className={`text-xs ${stalenessTextColor(jobStaleness(status, updatedAtDate))}`}
            title={updatedAtDate.toLocaleString()}
          >
            Last touched {formatRelativeDays(updatedAtDate)}
          </p>
          {state.error && (
            <p role="alert" className="text-xs text-red-600">
              {state.error}
            </p>
          )}
        </div>
        <SubmitButton
          className="text-xs px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          pendingLabel="Saving…"
        >
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
