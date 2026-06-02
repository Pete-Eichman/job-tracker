# Eval dataset

Labeled cases for the resume-scoring eval harness (`pnpm eval`). Stored as
committed fixtures so runs are reproducible and fully offline — the harness
feeds this structured job data + resume text straight into the scorer. It does
**not** scrape URLs or run the extractor.

## Format — `cases.jsonl`

One JSON object per line (JSONL). Each case:

```jsonc
{
  "id": "stable-unique-id",          // referenced in reports; keep stable over time
  "label": "strong" | "medium" | "weak", // human fit tier (the ground truth)
  "job": {                            // already-extracted structured job data
    "title": "...",
    "company": "...",
    "location": "..." | null,
    "workMode": "REMOTE" | "HYBRID" | "ONSITE" | null,
    "seniority": "..." | null,
    "requiredSkills": ["..."],
    "niceToHaveSkills": ["..."],
    "responsibilities": ["..."],
    "salaryMin": null,                // keep null (numeric salaries need a Prisma Decimal)
    "salaryMax": null,
    "salaryCurrency": null
  },
  "resume": { "rawText": "full resume text with \\n line breaks" }
}
```

The `job` shape matches `JobForBrief` (`src/lib/services/job-brief.ts`); the
`resume` shape matches what the scorer expects (`{ rawText }`).

## Labels

`label` is a **tier** reflecting human judgment of overall fit
(`strong` > `medium` > `weak`). Agreement is measured by Spearman rank
correlation between the model's mean composite score per case and these tiers,
so the *ordering* matters, not exact numbers. Ties are expected and handled.

## Adding a case

Append one line to `cases.jsonl`. Resume text must be a single JSON string
(escape newlines as `\n`). Pick a fresh, descriptive `id`. Aim to grow toward
20–30 cases with a spread across all three tiers.
