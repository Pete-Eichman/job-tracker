/**
 * Small statistics helpers for the eval harness. Implemented directly (no
 * dependencies) and placed under `src/lib` so they are unit tested and covered
 * by CI.
 */

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((sum, x) => sum + x, 0) / xs.length;
}

/**
 * Population standard deviation. Used for the consistency metric (spread of a
 * case's composite score across repeated runs). Returns 0 for fewer than 2
 * samples.
 */
export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((sum, x) => sum + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

/**
 * Fractional ranks (1-based) with average ranks for ties. e.g. [10, 30, 30, 50]
 * -> [1, 2.5, 2.5, 4].
 */
export function rank(xs: number[]): number[] {
  const sorted = xs
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);

  const ranks = new Array<number>(xs.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].value === sorted[i].value) {
      j++;
    }
    // Average of 1-based positions i..j (inclusive).
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      ranks[sorted[k].index] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

/** Pearson correlation. Returns 0 if either series has zero variance. */
export function pearson(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const denom = Math.sqrt(da * db);
  if (denom === 0) return 0;
  return num / denom;
}

/**
 * Spearman rank correlation: rank both series (average ranks for ties) and take
 * the Pearson correlation of the ranks. Ranges -1..1; higher means the model's
 * ordering agrees with the human ordering.
 */
export function spearman(a: number[], b: number[]): number {
  return pearson(rank(a), rank(b));
}
