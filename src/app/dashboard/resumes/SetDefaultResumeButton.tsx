"use client";

import { useActionState } from "react";
import { setDefaultResume } from "@/app/actions/save-resume";
import { SubmitButton } from "@/components/SubmitButton";

interface Props {
  resumeId: string;
}

export function SetDefaultResumeButton({ resumeId }: Props) {
  const [state, formAction] = useActionState(setDefaultResume, {});

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="resumeId" value={resumeId} />
        <SubmitButton
          className="px-3 py-1.5 border border-border rounded-lg text-xs text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors duration-150 shrink-0 disabled:opacity-50"
        >
          Set as default
        </SubmitButton>
      </form>
      {state.error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-fg-muted">
          {state.error}
        </p>
      )}
    </div>
  );
}
