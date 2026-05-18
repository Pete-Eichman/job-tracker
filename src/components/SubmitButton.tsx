"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  pendingLabel?: ReactNode;
  className?: string;
};

export function SubmitButton({ children, pendingLabel, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? (pendingLabel ?? "…") : children}
    </button>
  );
}
