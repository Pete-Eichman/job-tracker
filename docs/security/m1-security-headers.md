# M-1 — Security headers and a nonce-based CSP

## The problem

`next.config.ts` shipped no `headers()`. No `Content-Security-Policy`, no
`Strict-Transport-Security`, no `X-Frame-Options`/`frame-ancestors`. The
dashboard could be framed (clickjacking), and there was no defense-in-depth
layer if any injected content ever slipped past the app's own escaping.

## What I changed

**Static headers** (`next.config.ts`, applied to every route via `headers()`):
`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
`Permissions-Policy` (camera/mic/geolocation off), `X-DNS-Prefetch-Control: off`.

**Content-Security-Policy** (`src/middleware.ts`) — the nonce-based approach,
not the weaker `unsafe-inline` shortcut:

- Every request gets a fresh random nonce (`crypto.getRandomValues`, Web
  Crypto — the middleware runs on the edge runtime, no Node `Buffer`).
- `script-src 'self' 'nonce-<n>' 'strict-dynamic'` — only scripts carrying that
  exact nonce (or loaded by an already-trusted nonced script) can execute.
- `style-src 'self' 'unsafe-inline'` — the one deliberate loosening. Tailwind's
  injected stylesheet and React's inline `style` attributes (e.g. the
  dashboard's staggered fade-in delays) need it; a style-injection attack is a
  materially smaller risk than a script-injection one, and CSS-only exfil
  vectors are narrow.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `frame-ancestors 'none'` (redundant with `X-Frame-Options`, kept for browsers
  that only honor the newer directive), `connect-src 'self'` (the AI/Redis
  calls are server-side; the browser only ever talks to same-origin `/api/*`).

The auth-redirect logic is unchanged and scoped exactly as before
(`/dashboard`, `/api/cover-letter`, `/api/jobs/*`) — the middleware's matcher
was widened so the CSP applies broadly, but the `PROTECTED` route list that
triggers a redirect-to-`/login` is the same set as the original matcher.

## The non-obvious part: why a code change was needed in `layout.tsx`

Setting the CSP header in middleware is necessary but not sufficient. Next.js's
own script tags only get auto-stamped with the nonce when the **route is
rendered dynamically, per request** — the mechanism (confirmed by reading
`next/dist/server/app-render/get-script-nonce-from-header.js` and its caller in
`app-render.js`) reads the `content-security-policy` request header at render
time and regex-extracts the nonce.

`/login` and `/register` had no dynamic API usage anywhere in their tree, so
Next prerendered them as **static HTML at build time** — before any request,
and therefore before any nonce, exists. The static HTML's `<script>` tags
shipped with no nonce at all, and `'strict-dynamic'` would have silently
blocked every one of them in the browser (no server-side error — this only
shows up as a client-side CSP violation).

The fix: the root layout (`src/app/layout.tsx`) now calls `await headers()`.
`headers()` is a Next.js "dynamic API" — calling it (regardless of whether the
value is used) opts the entire route tree under that layout into per-request
rendering, which is what makes the nonce-stamping mechanism actually run. I
found and fixed this by building, then diffing what a fresh curl of `/login`
actually rendered against the CSP header — the header had a nonce, the HTML's
`<script>` tags didn't, and the build output's `○` (Static) marker on those two
routes explained why.

## Verification

- `next build` + `next start`, then curl: all headers present; the CSP header's
  nonce **matches** the nonce on every `<script>` tag in the rendered HTML
  (16/16, confirmed byte-for-byte).
- **Drove the app with the pre-installed Chromium via Playwright** (not just a
  header check) across `/`, `/login`, `/register`:
  - **Zero CSP violations** in the browser console on any page.
  - **Hydration proof, independent of the (sandboxed, DB-less) login outcome:**
    after submitting the login form, the browser fires a `fetch()` POST
    carrying Next's `Next-Action` header (React's client runtime intercepting
    the form submit) and **no full-page navigation occurs**. If `strict-dynamic`
    had blocked the bootstrap scripts, the browser would have fallen back to a
    plain HTML form POST/reload instead — that didn't happen.
- `tsc --noEmit`, ESLint, and `next build` all clean; full suite still 361
  passing (this branch predates the M-3/M-4 PRs).
- Confirmed unauthenticated `/dashboard` and `/api/jobs/export` still 307 to
  `/login` (unchanged), and `/login`/`/register` still return 200 — the auth
  redirect scope wasn't altered by widening the CSP matcher.

## Trade-offs, deliberately accepted

- `style-src 'unsafe-inline'` — see above; the pragmatic, common choice for
  a Tailwind + React app.
- Every route is now dynamically rendered (no more static prerendering for
  `/login`/`/register`). This is a real but small perf cost, and correct: the
  app needs per-request auth checks everywhere anyway, so static prerendering
  of the login shell wasn't buying much.
