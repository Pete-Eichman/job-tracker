"use client";

import { useActionState } from "react";
import { toggleArchiveAction } from "@/app/actions/archive-job";

interface Props {
  jobId: string;
  archived: boolean;
  buttonClassName?: string;
}

export function ArchiveButton({ jobId, archived, buttonClassName }: Props) {
  const [state, formAction, isPending] = useActionState(
    toggleArchiveAction,
    {}
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="jobId" value={jobId} />
        <input
          type="hidden"
          name="shouldArchive"
          value={String(!archived)}
        />
        <button
          type="submit"
          disabled={isPending}
          className={buttonClassName}
        >
          {isPending
            ? archived
              ? "Unarchiving…"
              : "Archiving…"
            : archived
              ? "Unarchive"
              : "Archive"}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
