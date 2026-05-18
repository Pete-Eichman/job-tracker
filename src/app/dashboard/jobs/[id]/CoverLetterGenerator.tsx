"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  jobId: string;
  hasExisting: boolean;
};

export function CoverLetterGenerator({ jobId, hasExisting }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setText("");
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok || !res.body) {
        const message = (await res.text()) || `Request failed (${res.status})`;
        setError(message);
        setPending(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        setText(buffer);
      }
      setPending(false);
      setText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stream failed.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-busy={pending}
        className="text-xs px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Drafting…" : hasExisting ? "Regenerate" : "Generate"}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {pending && text && (
        <article className="border rounded-md p-3 bg-blue-50/40 border-blue-100">
          <p className="text-xs text-blue-700 mb-2">Drafting in progress…</p>
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-gray-800">
            {text}
          </pre>
        </article>
      )}
    </div>
  );
}
