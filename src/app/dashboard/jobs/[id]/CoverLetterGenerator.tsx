"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  jobId: string;
  resumeId: string;
  hasExisting: boolean;
};

export function CoverLetterGenerator({ jobId, resumeId, hasExisting }: Props) {
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
        body: JSON.stringify({ jobId, resumeId }),
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
        className="px-3 py-1.5 border border-border rounded-lg text-xs text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Drafting…" : hasExisting ? "Regenerate" : "Generate"}
      </button>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-fg-muted">
          {error}
        </p>
      )}

      {pending && text && (
        <article className="bg-surface-2 border border-border rounded-lg p-3">
          <p className="text-xs text-fg-muted mb-2">Drafting in progress…</p>
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-fg">
            {text}
          </pre>
        </article>
      )}
    </div>
  );
}
