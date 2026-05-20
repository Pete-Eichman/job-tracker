"use client";

import { useActionState } from "react";
import { rescoreJobAction } from "@/app/actions/score-job";

interface Props {
  jobId: string;
  resumeId: string;
  hasMatch: boolean;
}

export function RescoreButton({ jobId, resumeId, hasMatch }: Props) {
  const [state, action, isPending] = useActionState(rescoreJobAction, {});

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="resumeId" value={resumeId} />
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 border border-border rounded-lg text-xs text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Scoring…" : hasMatch ? "Rescore" : "Score now"}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-fg-muted">
          {state.error}
        </p>
      )}
    </div>
  );
}
