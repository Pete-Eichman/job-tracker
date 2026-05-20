export function scoreColor(score: number): string {
  if (score >= 75) return "text-positive bg-positive-soft";
  if (score >= 50) return "text-accent bg-accent-soft";
  return "text-fg-muted bg-surface-2";
}

export function scoreRingColor(score: number): string {
  if (score >= 75) return "var(--positive)";
  if (score >= 50) return "var(--accent)";
  return "var(--fg-subtle)";
}
