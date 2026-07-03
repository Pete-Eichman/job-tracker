# M-4 — Ownership-check tests

## Why

The audit's strongest positive was that **every server action scopes its queries
to the authenticated `userId`**, so no user can touch another user's data. But
that was verified by reading the code, not proven by the suite — and the actions
were the least-tested part of the app (the audit flagged ~13% coverage there).
This change turns "authorization is correct everywhere" from a claim into a
regression-guarded fact. **No production code changes** — tests only.

## What's now proven

New action tests under `src/app/actions/__tests__/`, reusing the mock harness
already established in `score-job.test.ts` (mock `@/lib/auth`, `@/lib/db`,
`next/cache`, `next/navigation`; run the real `parseFormData`):

| Test file | Action(s) | Asserts |
|---|---|---|
| `update-job.test.ts` | `updateStatusAction`, `updateJobAction` | a job owned by another user → "Job not found", **no write**; the lookup/update carried `where.userId` = caller |
| `archive-job.test.ts` | `toggleArchiveAction` | archiving another user's job → "Job not found" (0 scoped rows); the caller's own job archives |
| `delete-cover-letter.test.ts` | `deleteCoverLetterAction` | a cover letter whose parent job belongs to another user → "Cover letter not found", **no delete**; missing letter → same; own letter deletes |
| `set-default-resume.test.ts` | `setDefaultResume` | defaulting another user's resume → "Resume not found", **no transaction**; lookup scoped to caller |

The common shape of each cross-user case: the `userId`-scoped Prisma query
returns nothing (or `count: 0`), the action refuses with a not-found error, and
the mutating call is **never** made. Where a write does happen, the test asserts
the `where` clause includes the caller's `userId`.

## Verification

- 9 new tests; full suite **370 passing**; `tsc` and ESLint clean.
- These exercise the authorization contract specifically; they intentionally do
  not re-cover the happy-path business logic (that lives in the actions'
  existing/dedicated tests).
