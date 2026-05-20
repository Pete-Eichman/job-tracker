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
          className="text-xs px-3 py-1 border rounded-md hover:bg-gray-50 shrink-0 disabled:opacity-50"
        >
          Set as default
        </SubmitButton>
      </form>
      {state.error && (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
