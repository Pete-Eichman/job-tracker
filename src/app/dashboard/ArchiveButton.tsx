"use client";

import { useActionState } from "react";
import { toggleArchiveAction } from "@/app/actions/archive-job";

interface Props {
  jobId: string;
  archived: boolean;
  iconOnly?: boolean;
  buttonClassName?: string;
}

function ArchiveIcon({ title }: { title: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      className="w-3.5 h-3.5"
      aria-hidden
    >
      <title>{title}</title>
      <rect
        x="1"
        y="1.5"
        width="12"
        height="2.75"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M2.25 4.25v7a.75.75 0 00.75.75h8a.75.75 0 00.75-.75v-7"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M5 8l2 2 2-2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 10V7"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ArchiveButton({
  jobId,
  archived,
  iconOnly = false,
  buttonClassName,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    toggleArchiveAction,
    {}
  );

  const label = archived ? "Unarchive" : "Archive";
  const pendingLabel = archived ? "Unarchiving…" : "Archiving…";

  return (
    <div className={iconOnly ? undefined : "flex flex-col items-end gap-1"}>
      <form action={formAction}>
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="shouldArchive" value={String(!archived)} />
        {iconOnly ? (
          <button
            type="submit"
            disabled={isPending}
            title={label}
            className="flex items-center justify-center w-7 h-7 rounded-md text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors duration-150 disabled:opacity-40"
          >
            <span className="sr-only">{isPending ? pendingLabel : label}</span>
            <ArchiveIcon title={isPending ? pendingLabel : label} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending}
            className={buttonClassName}
          >
            {isPending ? pendingLabel : label}
          </button>
        )}
      </form>
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
