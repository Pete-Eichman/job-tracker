"use client";

import { useActionState, useState } from "react";
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

const inputClass =
  "w-full border border-border bg-surface text-fg rounded-lg px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none transition-[border-color,box-shadow] duration-150";

export function EditJobForm({
  jobId,
  status,
  notes,
  appliedAt,
  updatedAt,
}: Props) {
  const [state, formAction] = useActionState(updateJobAction, {});
  const [appliedAtHasValue, setAppliedAtHasValue] = useState(!!appliedAt);
  const updatedAtDate = new Date(updatedAt);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="space-y-1 block min-w-0">
          <span className="text-sm font-medium text-fg">Status</span>
          <select
            name="status"
            defaultValue={status}
            className={inputClass}
          >
            {JOB_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 block min-w-0">
          <span className="text-sm font-medium text-fg">Applied on</span>
          <div className="relative group">
            <input
              type="date"
              name="appliedAt"
              defaultValue={appliedAt ?? ""}
              onChange={(e) => setAppliedAtHasValue(!!e.target.value)}
              className={`${inputClass}${!appliedAtHasValue ? " date-empty" : ""}`}
            />
            {!appliedAtHasValue && (
              <span
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle pointer-events-none select-none group-focus-within:hidden"
              >
                mm/dd/yyyy
              </span>
            )}
          </div>
          <span className="text-xs text-fg-subtle block">
            Auto-set to today when you first move past Saved.
          </span>
        </label>
      </div>
      <label className="space-y-1 block">
        <span className="text-sm font-medium text-fg">Notes</span>
        <textarea
          name="notes"
          rows={4}
          maxLength={10_000}
          defaultValue={notes ?? ""}
          placeholder="Recruiter, follow-ups, interview prep, etc."
          className={inputClass}
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
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-fg-muted">
              {state.error}
            </p>
          )}
        </div>
        <SubmitButton
          className="px-3 py-1.5 border border-border rounded-lg text-xs text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          pendingLabel="Saving…"
        >
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
