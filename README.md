# Job Tracker

Personal job application tracker with AI-powered match scoring and cover letter generation.

## Stack

- **Next.js 16** (App Router, Server Actions)
- **Prisma 7** + PostgreSQL
- **NextAuth 5** (credentials + GitHub OAuth)
- **Vercel AI SDK** + Anthropic Claude

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
