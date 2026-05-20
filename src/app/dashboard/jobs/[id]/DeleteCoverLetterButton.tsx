"use client";

import { useActionState } from "react";
import { deleteCoverLetterAction } from "@/app/actions/cover-letter";
import { SubmitButton } from "@/components/SubmitButton";

interface Props {
  coverLetterId: string;
}

export function DeleteCoverLetterButton({ coverLetterId }: Props) {
  const [state, formAction] = useActionState(deleteCoverLetterAction, {});

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="coverLetterId" value={coverLetterId} />
        <SubmitButton
          className="text-xs text-fg-subtle hover:text-danger hover:underline transition-colors duration-150 disabled:opacity-50"
          pendingLabel="Deleting…"
        >
          Delete
        </SubmitButton>
      </form>
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
