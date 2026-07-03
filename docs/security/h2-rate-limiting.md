# H-2 — Rate limiting for auth and AI endpoints

## The problem

Before this change there was no throttling anywhere. Two concrete exposures on a
live, publicly-registerable app:

- **Credential brute-force / scripted signup.** `login` and `register` accept
  unlimited attempts, so passwords can be guessed and accounts created in bulk.
- **AI cost abuse.** Every call to extract, score, explain, or draft a cover
  letter spends real Anthropic tokens against the app's key. An authenticated
  user (registration is open) could loop those endpoints and run the bill up
  without bound — the classic "the attacker spends nothing, you spend per call"
  shape.

As a multi-user product this is the difference between "a bug" and "a line item
on your invoice," so it's the second must-fix from the audit.

## What I changed

A single limiter module (`src/lib/rate-limit.ts`) with two named surfaces,
enforced at each entry point:

| Surface | Keyed by | Default limit | Where |
|---|---|---|---|
| `auth` | client IP | 5 / minute | `login/actions.ts`, `register/actions.ts` |
| `ai` | user id | 30 / hour | `extract-job.ts`, `score-job.ts` (rescore), `explain-match.ts`, `api/cover-letter/route.ts` |

Counters live in **Upstash Redis** (sliding window via `@upstash/ratelimit`),
because Vercel runs many ephemeral function instances — an in-process counter
wouldn't be shared across them. Client IP comes from `x-forwarded-for` (left-most
entry) with an `x-real-ip` fallback (`src/lib/request-ip.ts`).

Server actions surface a limit as a friendly `{ error }` the existing forms
already render; the cover-letter route returns `429` with a `Retry-After`
header.

### Why the limit sits where it does

The `ai` limit is applied at the **user-facing entry points**, not inside
`scoreJob()`. `scoreJob` is also called internally — once by the auto-score that
runs after an extraction, and once by the cover-letter route when no score
exists yet — so limiting inside it would double-count a single user action.
Keeping the checks at the top of `extractAndSaveJob`, `rescoreJobAction`,
`explainMatchAction`, and the cover-letter route counts one unit per real user
request.

## Availability posture (deliberate, documented)

- **Unconfigured (no Upstash env vars):** limiting is **disabled** and requests
  are allowed, with a one-time warning. This keeps local dev and preview builds
  working without credentials. **Production must set** `UPSTASH_REDIS_REST_URL`
  and `UPSTASH_REDIS_REST_TOKEN` (see README) or the limiter silently no-ops.
- **Backend error (Redis unreachable):** **fail open** (allow) rather than take
  the app down because the limiter's datastore hiccuped. Availability is chosen
  over strict enforcement; the error is logged. The residual risk — an attacker
  who can disrupt Redis also disables the cost cap — is judged acceptable versus
  a hard dependency that can black-hole every request.

## How it was verified

- **15 unit tests.** `parseClientIp` (forwarded-for precedence, trimming,
  fallbacks, empties) and `enforceRateLimit` with the Upstash SDK mocked:
  fail-open when unconfigured (and never touching the backend), allow on
  success, block with a positive `retryAfterSeconds` when exhausted, and
  fail-open when the backend throws. Full suite: 361 passing.
- `tsc --noEmit`, ESLint (0 warnings), and `next build` all clean.
- A live Redis round-trip is **not** exercised in CI/sandbox (it needs Upstash
  credentials, which are provisioned per-environment). The enforcement logic is
  covered by the mocked tests; wiring the real backend is the two env vars above.

## Tuning & follow-ups (out of scope here)

- Limits are single constants in `RATE_LIMITS` — adjust per real traffic. The
  `ai` hourly cap (30) is deliberately conservative for cost; a power user
  bulk-adding jobs may want it raised.
- Could add a per-email auth limiter alongside per-IP to blunt distributed
  guessing, and a short burst window on `ai` in addition to the hourly cap.
- The store is swappable: only `rate-limit.ts` imports Upstash; call sites use
  `enforceRateLimit(kind, id)` and would not change if the backend did.
