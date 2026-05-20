"use client";

import { useActionState } from "react";
import { extractAndSaveJob } from "@/app/actions/extract-job";
import { SubmitButton } from "@/components/SubmitButton";

export function ExtractForm() {
  const [state, formAction] = useActionState(extractAndSaveJob, {});

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex gap-2">
        <input
          name="url"
          type="url"
          required
          placeholder="Paste a job posting URL…"
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-[border-color,box-shadow] duration-150"
        />
        <SubmitButton
          className="px-4 py-2 bg-accent text-accent-fg rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 whitespace-nowrap"
          pendingLabel="Extracting…"
        >
          Extract
        </SubmitButton>
      </form>
      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-fg-muted"
        >
          {state.error}
        </div>
      )}
    </div>
  );
}
