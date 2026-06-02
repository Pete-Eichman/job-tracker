"use client";

import { useActionState } from "react";
import { explainMatchAction } from "@/app/actions/explain-match";

interface Props {
  jobId: string;
  resumeId: string;
  hasExplanation: boolean;
}

export function ExplainButton({ jobId, resumeId, hasExplanation }: Props) {
  const [state, action, isPending] = useActionState(explainMatchAction, {});

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
          {isPending
            ? "Analyzing…"
            : hasExplanation
              ? "Refresh explanation"
              : "Explain this score"}
        </button>
      </form>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-fg-muted"
        >
          {state.error}
        </p>
      )}
    </div>
  );
}
