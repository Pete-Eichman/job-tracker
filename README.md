# Job Tracker

Personal job application tracker with AI-powered match scoring, an honest-coach
match explainer, and cover letter generation — built to run safely as a
multi-user product, not just a personal script.

<!-- TODO: replace with the live Vercel URL once deployed -->
**Live demo:** _coming soon_

## Screenshots

<!-- TODO: drop in 2-3 screenshots (dashboard, job detail + match score, cover
     letter generation) as ./docs/screenshots/*.png and reference them here,
     e.g. ![Dashboard](./docs/screenshots/dashboard.png) -->

## Features

- **Job capture** — paste a posting URL and the app scrapes, extracts
  structured fields (title, company, skills, salary, seniority) via Claude,
  and saves it — behind an SSRF-hardened fetch (see [Security](#security)).
- **Match scoring** — scores a saved job against your resume (0–100) with
  concrete strengths/gaps, plus an "honest coach" explainer that classifies
  each gap as a vocabulary mismatch, a closable skill gap, or a hard blocker.
- **Cover letter drafting** — streams a tailored draft grounded in the job and
  your resume, informed by the match analysis.
- **Multi-resume support**, application status tracking (saved → applied →
  interviewing → offer/rejected), archiving, filtering/sorting, CSV export,
  and a running AI usage/cost dashboard.

## Architecture

- **[Next.js 16](https://nextjs.org)** (App Router, Server Actions, Turbopack)
- **[Prisma 7](https://www.prisma.io)** + PostgreSQL (`@prisma/adapter-pg`)
- **[NextAuth 5](https://authjs.dev)** — credentials + GitHub OAuth
- **[Vercel AI SDK](https://sdk.vercel.ai)** + Anthropic Claude — job
  extraction, match scoring/explanation, and streamed cover letter generation,
  all behind a schema-enforced repair loop (`src/lib/ai/generate-with-repair.ts`)
- **[Upstash Redis](https://upstash.com)** — sliding-window rate limiting on
  auth and AI endpoints (`src/lib/rate-limit.ts`)
- **`src/proxy.ts`** — Next's request-time proxy convention, carrying the
  per-request CSP nonce, the auth redirect, and rate-limit enforcement

## Security

This app went through a full security audit and hardening pass — findings,
fixes, and how each one was verified are written up in [`docs/security/`](./docs/security/):

- [SSRF hardening for the job-URL scraper](./docs/security/h1-ssrf.md) — a
  connection-pinned fetch that closes DNS rebinding, not just an IP blocklist.
- [Rate limiting](./docs/security/h2-rate-limiting.md) on auth (brute-force)
  and AI endpoints (cost abuse), including
  [closing a bypass](./docs/security/h2b-auth-callback-limit.md) on NextAuth's
  raw credentials endpoint.
- [CSV export formula-injection guard](./docs/security/m3-csv-injection.md).
- [Ownership-authorization tests](./docs/security/m4-ownership-tests.md)
  proving cross-user data access is blocked, not just assumed.
- [Security headers and a nonce-based CSP](./docs/security/m1-security-headers.md).

## Required environment variables

```
DATABASE_URL=              # PostgreSQL connection string
AUTH_SECRET=               # NextAuth secret (generate with: openssl rand -base64 32)
ANTHROPIC_API_KEY=         # Anthropic API key
AUTH_GITHUB_ID=            # GitHub OAuth app client ID (optional)
AUTH_GITHUB_SECRET=        # GitHub OAuth app client secret (optional)
UPSTASH_REDIS_REST_URL=    # Upstash Redis REST URL (rate limiting)
UPSTASH_REDIS_REST_TOKEN=  # Upstash Redis REST token (rate limiting)
```

> Rate limiting (login/register brute-force, AI cost caps) is backed by Upstash
> Redis. If `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are unset,
> limiting is **disabled** (the app still runs) — set both in production.

## Development

```bash
pnpm install
pnpm exec prisma migrate dev   # apply migrations + generate client
pnpm dev                        # start dev server at http://localhost:3000
```

## Testing & linting

```bash
pnpm test        # run Vitest unit tests
pnpm lint        # ESLint
pnpm exec tsc --noEmit  # type-check
```

## Build & deploy

```bash
pnpm build   # runs prisma migrate deploy + next build
```

Deployed on Vercel. Migrations run automatically at build time via the `build` script.
