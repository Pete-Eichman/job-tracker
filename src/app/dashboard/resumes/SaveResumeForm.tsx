"use client";

import { useActionState } from "react";
import { saveResume } from "@/app/actions/save-resume";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass =
  "w-full px-3 py-2 bg-surface border border-border text-fg placeholder:text-fg-subtle focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none transition-[border-color,box-shadow] duration-150 rounded-lg text-sm";

export function SaveResumeForm() {
  const [state, formAction] = useActionState(saveResume, {});

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-3 bg-surface border border-border rounded-xl p-4">
      <h2 className="font-medium text-fg">Add a resume</h2>
      <input
        name="title"
        type="text"
        required
        placeholder="e.g. Senior Backend Engineer 2025"
        className={inputClass}
      />
      <div className="space-y-1">
        <label className="block text-xs font-medium text-fg-subtle">Upload PDF</label>
        <input
          name="pdf"
          type="file"
          accept="application/pdf"
          className="block w-full text-sm text-fg file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border file:bg-surface-2 file:text-fg file:text-sm file:cursor-pointer hover:file:bg-surface-3 transition-colors"
        />
      </div>
      <p className="text-xs text-fg-subtle text-center">— or paste below —</p>
      <textarea
        name="rawText"
        rows={12}
        placeholder="Paste your resume as plain text…"
        className={`${inputClass} font-mono`}
      />
      <p className="text-xs text-fg-subtle">
        Your first resume is set as the default. Match scoring uses the default
        resume.
      </p>
      {state.error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-fg-muted">
          {state.error}
        </p>
      )}
      <SubmitButton
        className="px-4 py-2 bg-accent text-accent-fg rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        pendingLabel="Saving…"
      >
        Save resume
      </SubmitButton>
    </form>
  );
}
