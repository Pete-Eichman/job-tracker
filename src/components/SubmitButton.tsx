"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  pendingLabel?: ReactNode;
  className?: string;
};

function Spinner() {
  return (
    <svg
      className="inline-block w-3.5 h-3.5 animate-spin"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <path
        d="M7 1.5a5.5 5.5 0 015.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SubmitButton({ children, pendingLabel, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? (
        <span className="flex items-center gap-1.5">
          <Spinner />
          {pendingLabel ?? "…"}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
