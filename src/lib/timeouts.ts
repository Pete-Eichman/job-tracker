export const TIMEOUTS = {
  pageFetch: 15_000,
  jobExtract: 60_000,
  matchScore: 60_000,
  matchExplain: 60_000,
  coverLetter: 90_000,
} as const;

export function isAbortLike(err: unknown): boolean {
  if (err instanceof DOMException) {
    return err.name === "AbortError" || err.name === "TimeoutError";
  }
  if (err instanceof Error) {
    return err.name === "AbortError" || err.name === "TimeoutError";
  }
  return false;
}

export function timeoutError(operation: string, ms: number): Error {
  const seconds = Math.round(ms / 1000);
  return new Error(`${operation} timed out after ${seconds}s. Try again.`);
}
