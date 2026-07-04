# H-2 follow-up — close the raw-credentials-callback bypass

## The gap

H-2's `"auth"` rate limit (5 attempts/minute per IP) runs inside the
`credentialsLogin` **server action** — i.e. the code path behind the login
*form*. NextAuth also exposes the raw credential-exchange endpoint directly at
`POST /api/auth/callback/credentials`, and the original middleware matcher
excluded all of `/api/auth/*` from ever reaching middleware. A scripted
attacker doesn't have to submit the form; a direct POST to that endpoint with
a valid CSRF token skips the form action — and the rate limit living inside
it — entirely.

## The fix

`src/middleware.ts`:

1. **Matcher** — narrowed the existing `api/auth` exclusion so exactly one
   sub-path, `api/auth/callback/credentials`, stays in scope (everything else
   under `api/auth/*` — session, csrf, OAuth callbacks, signout — is untouched,
   exactly as before). Verified the regex directly against 14 representative
   paths before trusting it (see Verification).
2. **Handler** — on `POST` to that exact path, run the same `"auth"` limiter
   (`enforceRateLimit("auth", ip)`) used by the login form, keyed by IP
   (`parseClientIp` — the pure function from `src/lib/request-ip.ts`; middleware
   has no `next/headers` context, so it reads `req.headers` directly). A
   blocked request returns `429` + `Retry-After` **before** NextAuth ever sees
   it. Everything else (GET to the same path, every other route) is unaffected.

`@upstash/ratelimit` / `@upstash/redis` are REST-based HTTP clients with no
Node-only APIs, so `enforceRateLimit` runs fine on the edge middleware runtime
— same module, same behavior as the action-layer H-2 checks.

## A small refactor for testability

The middleware body is now a named, exported `handleMiddleware(req)` function;
`export default auth(handleMiddleware)` wraps it exactly as before. This is
behavior-preserving — same function, same logic — but lets the routing/rate-limit
branch be unit-tested directly without mocking NextAuth's entire HOF.

## Verification

- **Matcher regex tested directly** against 14 paths before trusting it in the
  app: the credentials callback (with and without a trailing slash) is
  included; every other `api/auth/*` route, static assets, and Next internals
  are excluded; app routes (`/dashboard`, `/login`, `/api/cover-letter`) are
  included.
- **8 new unit tests** (`src/__tests__/middleware.test.ts`), mocking
  `enforceRateLimit` the same way H-2's action tests mocked Upstash: the
  limiter is checked (by IP) on `POST` to the credentials callback and
  **not** checked on `GET` to that path or on any other `api/auth/*` route; a
  blocked result returns `429` with the correct `Retry-After`; an allowed
  result falls through to the normal CSP-bearing response. Separately confirms
  the pre-existing `/dashboard` auth-redirect and CSP-on-public-routes
  behavior is unaffected. Full suite: **369 passing**.
- **Live server, end to end:** built and started the app, obtained a real CSRF
  token, then POSTed directly to `/api/auth/callback/credentials` — bypassing
  the login form entirely — confirming the request reaches the new check (the
  `[rate-limit] ... DISABLED` log line fires, proving the branch executed) and
  that unrelated `api/auth/*` routes (`session`, `csrf`) and the login/dashboard
  redirect behavior are all unchanged.
- `tsc --noEmit`, ESLint, and `next build` all clean.

## Why the live test doesn't show a 429

This sandbox has no real Upstash credentials, so — per H-2's documented
fail-open posture — `enforceRateLimit` allows every request and logs the
"DISABLED" warning instead of blocking. That's correct, intentional behavior,
not a gap in this fix: the routing/branch logic is proven deterministically by
the mocked unit tests above. **On a deploy with `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` set** (as production already is, per H-2), the same
manual test — 6+ direct `POST`s to `/api/auth/callback/credentials` within a
minute — should return `429` starting on the 6th, exactly like the login form
already does.
