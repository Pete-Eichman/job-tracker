"use client";

import { useActionState } from "react";
import { extractAndSaveJob } from "@/app/actions/extract-job";
import { SubmitButton } from "@/components/SubmitButton";

export function ExtractForm() {
  const [state, formAction] = useActionState(extractAndSaveJob, {});

  return (
    <div className="space-y-1">
      <form action={formAction} className="flex gap-2">
        <input
          name="url"
          type="url"
          required
          placeholder="Paste a job posting URL…"
          className="flex-1 px-3 py-2 border rounded-md text-sm"
        />
        <SubmitButton
          className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          pendingLabel="Extracting…"
        >
          Extract
        </SubmitButton>
      </form>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
