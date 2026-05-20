"use client";

import { useActionState } from "react";
import { saveResume } from "@/app/actions/save-resume";
import { SubmitButton } from "@/components/SubmitButton";

export function SaveResumeForm() {
  const [state, formAction] = useActionState(saveResume, {});

  return (
    <form action={formAction} className="space-y-3 border rounded-lg p-4">
      <h2 className="font-medium">Add a resume</h2>
      <input
        name="title"
        type="text"
        required
        placeholder="e.g. Senior Backend Engineer 2025"
        className="w-full px-3 py-2 border rounded-md text-sm"
      />
      <textarea
        name="rawText"
        required
        rows={12}
        placeholder="Paste your resume as plain text…"
        className="w-full px-3 py-2 border rounded-md text-sm font-mono"
      />
      <p className="text-xs text-gray-500">
        Your first resume is set as the default. Match scoring uses the default
        resume.
      </p>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <SubmitButton
        className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        pendingLabel="Saving…"
      >
        Save resume
      </SubmitButton>
    </form>
  );
}
