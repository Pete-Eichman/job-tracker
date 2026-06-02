/**
 * Offline eval harness for resume-to-job match scoring.
 *
 * Runs the EVAL composite scorer (`src/lib/scoring/scoreResume.ts`) over the
 * committed fixtures in `eval/dataset/cases.jsonl`, several times per case, and
 * reports:
 *   - Consistency: per-case SD of the composite score, then the mean SD across
 *     cases (lower is better). Also reports per-dimension mean SD.
 *   - Agreement: Spearman rank correlation between the model's mean composite
 *     per case and the human tier labels (strong > medium > weak).
 *   - Cost: total tokens and approximate USD cost for the run.
 *
 * Writes a timestamped JSON report to `eval/results/` so runs can be diffed
 * over time. No network scraping and no database — the scorer is exercised in
 * isolation on already-extracted job data + resume text.
 *
 * Run: pnpm eval   (requires ANTHROPIC_API_KEY in the environment or .env)
 */
import "dotenv/config";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AI_MODELS } from "@/lib/ai-models";
import { computeCostCents, formatSpend, formatTokens } from "@/lib/pricing";
import { RUBRIC_DIMENSIONS, type DimensionKey } from "@/lib/scoring/rubric";
import { scoreResumeAgainstJob } from "@/lib/scoring/scoreResume";
import type { JobForBrief } from "@/lib/services/job-brief";
import { mean, stddev, spearman } from "@/lib/scoring/stats";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RUNS_PER_CASE = Number(process.env.EVAL_RUNS ?? 5);
const MODEL = AI_MODELS.default;

const TIER_RANK: Record<string, number> = { weak: 0, medium: 1, strong: 2 };

type Tier = "weak" | "medium" | "strong";

type EvalCase = {
  id: string;
  label: Tier;
  job: JobForBrief;
  resume: { rawText: string };
};

type CaseResult = {
  id: string;
  label: Tier;
  composites: number[];
  meanComposite: number;
  compositeSD: number;
  perDimensionMeanSD: Record<string, number>;
  errors: number;
};

const PASS = "\x1b[32m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// ---------------------------------------------------------------------------
// Load dataset
// ---------------------------------------------------------------------------

function loadCases(): EvalCase[] {
  const path = fileURLToPath(new URL("./dataset/cases.jsonl", import.meta.url));
  const lines = readFileSync(path, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.map((line, i) => {
    try {
      return JSON.parse(line) as EvalCase;
    } catch (err) {
      throw new Error(`Failed to parse case on line ${i + 1}: ${err}`);
    }
  });
}

// ---------------------------------------------------------------------------
// Run one case N times
// ---------------------------------------------------------------------------

async function runCase(
  c: EvalCase,
  runs: number
): Promise<{ result: CaseResult; inputTokens: number; outputTokens: number }> {
  const composites: number[] = [];
  const perDimensionScores: Record<string, number[]> = Object.fromEntries(
    RUBRIC_DIMENSIONS.map((d) => [d.key, [] as number[]])
  );
  let inputTokens = 0;
  let outputTokens = 0;
  let errors = 0;

  for (let i = 0; i < runs; i++) {
    try {
      const { result, usage } = await scoreResumeAgainstJob(c.job, c.resume);
      composites.push(result.composite);
      for (const d of RUBRIC_DIMENSIONS) {
        perDimensionScores[d.key].push(result.dimensions[d.key as DimensionKey].score);
      }
      inputTokens += usage.inputTokens;
      outputTokens += usage.outputTokens;
    } catch (err) {
      errors++;
      console.error(`  ${c.id} run ${i + 1} failed: ${err}`);
    }
  }

  const perDimensionMeanSD: Record<string, number> = Object.fromEntries(
    RUBRIC_DIMENSIONS.map((d) => [d.key, stddev(perDimensionScores[d.key])])
  );

  return {
    result: {
      id: c.id,
      label: c.label,
      composites,
      meanComposite: mean(composites),
      compositeSD: stddev(composites),
      perDimensionMeanSD,
      errors,
    },
    inputTokens,
    outputTokens,
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function printSummary(
  results: CaseResult[],
  aggregates: {
    meanCompositeSD: number;
    perDimensionMeanSD: Record<string, number>;
    spearmanRho: number;
  },
  cost: { inputTokens: number; outputTokens: number; costCents: number }
) {
  const pad = (s: string | number, n: number) => String(s).padEnd(n);
  const padL = (s: string | number, n: number) => String(s).padStart(n);

  console.log(`\n${BOLD}Per-case results${RESET}`);
  console.log(
    DIM +
      pad("id", 28) +
      pad("label", 8) +
      padL("mean", 7) +
      padL("SD", 8) +
      padL("runs", 7) +
      RESET
  );
  for (const r of results) {
    const runs = `${r.composites.length}${r.errors ? `(-${r.errors})` : ""}`;
    console.log(
      pad(r.id, 28) +
        pad(r.label, 8) +
        padL(r.meanComposite.toFixed(1), 7) +
        padL(r.compositeSD.toFixed(2), 8) +
        padL(runs, 7)
    );
  }

  console.log(`\n${BOLD}Consistency (lower is better)${RESET}`);
  console.log(
    `  Mean composite SD across cases: ${BOLD}${aggregates.meanCompositeSD.toFixed(2)}${RESET}`
  );
  for (const d of RUBRIC_DIMENSIONS) {
    console.log(
      `    ${DIM}${pad(d.label, 26)}${RESET} SD ${aggregates.perDimensionMeanSD[d.key].toFixed(2)}`
    );
  }

  console.log(`\n${BOLD}Agreement (higher is better, -1..1)${RESET}`);
  console.log(
    `  Spearman rho (mean composite vs. human tier): ${PASS}${BOLD}${aggregates.spearmanRho.toFixed(3)}${RESET}`
  );

  console.log(`\n${BOLD}Cost${RESET}`);
  console.log(
    `  Tokens: ${formatTokens(cost.inputTokens)} in / ${formatTokens(cost.outputTokens)} out` +
      `  •  ~${formatSpend(cost.costCents)} (model: ${MODEL})`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Add it to your .env file.");
    process.exit(1);
  }

  const cases = loadCases();
  const startedAt = new Date();

  console.log(`${BOLD}Resume-Scoring Eval${RESET}`);
  console.log(`Model: ${MODEL}  •  Cases: ${cases.length}  •  Runs/case: ${RUNS_PER_CASE}`);

  const results: CaseResult[] = [];
  let totalInput = 0;
  let totalOutput = 0;

  for (const c of cases) {
    process.stdout.write(`  scoring ${c.id} … `);
    const { result, inputTokens, outputTokens } = await runCase(c, RUNS_PER_CASE);
    totalInput += inputTokens;
    totalOutput += outputTokens;
    results.push(result);
    console.log(
      `mean ${result.meanComposite.toFixed(1)} (SD ${result.compositeSD.toFixed(2)})`
    );
  }

  // Aggregate consistency.
  const scored = results.filter((r) => r.composites.length > 0);
  const meanCompositeSD = mean(scored.map((r) => r.compositeSD));
  const perDimensionMeanSD: Record<string, number> = Object.fromEntries(
    RUBRIC_DIMENSIONS.map((d) => [
      d.key,
      mean(scored.map((r) => r.perDimensionMeanSD[d.key])),
    ])
  );

  // Agreement: Spearman between mean composite and human tier rank.
  const labelRanks = scored.map((r) => TIER_RANK[r.label]);
  const meanComposites = scored.map((r) => r.meanComposite);
  const spearmanRho = spearman(meanComposites, labelRanks);

  const costCents = computeCostCents(MODEL, totalInput, totalOutput);
  const aggregates = { meanCompositeSD, perDimensionMeanSD, spearmanRho };
  const cost = { inputTokens: totalInput, outputTokens: totalOutput, costCents };

  printSummary(scored, aggregates, cost);

  // Write timestamped JSON report.
  const resultsDir = fileURLToPath(new URL("./results/", import.meta.url));
  mkdirSync(resultsDir, { recursive: true });
  const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
  const reportPath = `${resultsDir}${stamp}.json`;
  const report = {
    runConfig: {
      model: MODEL,
      runsPerCase: RUNS_PER_CASE,
      caseCount: cases.length,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
    },
    aggregates,
    cost,
    perCase: results,
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${DIM}eval/results/${stamp}.json${RESET}`);

  const errored = results.reduce((n, r) => n + r.errors, 0);
  if (errored > 0) {
    console.log(`\n${errored} scorer call(s) failed during the run (see above).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
