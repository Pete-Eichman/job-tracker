// Per-million-token rates in cents (USD). Anthropic pricing changes over
// time and varies by region/contract — VERIFY against the official pricing
// page (https://www.anthropic.com/pricing) before trusting the reported
// spend. Numbers here are estimates as of the commit date.
const RATES_PER_M_TOKENS_CENTS: Record<
  string,
  { input: number; output: number }
> = {
  "claude-sonnet-4-6": { input: 300, output: 1500 },
};

export function computeCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rate = RATES_PER_M_TOKENS_CENTS[model];
  if (!rate) return 0;
  const cents =
    (inputTokens * rate.input) / 1_000_000 +
    (outputTokens * rate.output) / 1_000_000;
  return Math.round(cents);
}

export function formatSpend(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
