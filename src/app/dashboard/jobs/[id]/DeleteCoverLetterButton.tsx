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
          className="text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50"
          pendingLabel="Deleting…"
        >
          Delete
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
