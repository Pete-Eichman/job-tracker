# H-1 — SSRF hardening for the job-posting scraper

## The vulnerability

The app extracts jobs by fetching a user-supplied URL server-side (`fetchPageText`
in `src/lib/services/job-extraction.ts`) and feeding the page text to the model.
Before this change there was **no restriction on where that URL pointed**. The
existing `scrape-guard.ts` inspects the *response body* (does it look like a job
posting?) but never the *destination*.

That is a server-side request forgery (SSRF) primitive. Any authenticated user
could make the server issue requests to:

- `http://127.0.0.1` / `http://localhost` and other loopback services,
- private ranges (`10/8`, `172.16/12`, `192.168/16`) and CGNAT (`100.64/10`),
- the cloud metadata endpoint `169.254.169.254` (credentials, on many hosts),
- any internal service reachable from the deploy environment.

`fetch()` also follows redirects by default, so even a benign-looking public URL
could redirect (302) to an internal target on a later hop.

**Why it matters more now:** as a single-user tool the blast radius was mostly
the operator's own infrastructure. As a multi-user / marketable product, every
signed-up user gets this primitive against the shared backend — so this is the
finding to close first.

## What I changed

New module `src/lib/services/ssrf-guard.ts`, wired into `fetchPageText`. Two
layers, because a URL's host is either an IP literal or a name that needs DNS:

1. **`assertFetchableUrl(url)` — synchronous, before any network.** Rejects
   non-`http(s)` schemes, URLs with embedded credentials (`user:pass@`), and
   **IP-literal hosts** in a blocked range (`http://127.0.0.1`,
   `http://169.254.169.254`, `http://[::1]`, …). This layer exists because
   undici connects straight to an IP literal *without ever calling our DNS
   hook* — so literals must be validated here.

2. **`safeDispatcher()` — validates the resolved IP at connect time.** A custom
   undici `Agent` whose connector `lookup` resolves the host, refuses the
   connection if **any** resolved address is blocked, and hands undici exactly
   the vetted IP. Redirect hops open new connections through the same
   dispatcher, so every hop is re-validated with no extra code.

Blocked attempts surface the **same generic message** as any other scrape
failure (`"Could not read this posting — paste the text directly."`), so the
guard can't be used as an internal port scanner (no "blocked vs. unreachable"
oracle).

## Why this approach and not something simpler

The obvious cheaper fix is "resolve the hostname, check the IP, then `fetch()`."
That has a real hole: **DNS rebinding**. An attacker who controls their domain's
DNS returns a *public* IP for the validation lookup, then a *private* IP for the
actual connection a moment later — the check passes, the connection lands
internally. This is a well-known SSRF bypass and the first thing a reviewer
asks about.

Closing it requires validating the IP **at connect time** and connecting to
*exactly that IP*. Node's global `fetch` exposes no connect-time hook, and Node
22 doesn't expose undici's `Agent` globally — so the fix adds `undici` as a
direct dependency and does the validation inside the connector's `lookup`. There
is no window between check and connect for the resolver to swap the address.

This was a deliberate choice to pay one dependency + a bit of complexity in
exchange for closing rebinding, which is the right trade for something that may
ship to real users.

## The blocklist

`isBlockedAddress(ip)` fails **closed** (anything that isn't a parseable public
IP is blocked) and covers:

- **IPv4:** `0.0.0.0/8`, `10/8`, `100.64/10` (CGNAT), `127/8`, `169.254/16`
  (link-local incl. metadata), `172.16/12`, `192.0.0/24`, `192.0.2/24`,
  `192.88.99/24`, `192.168/16`, `198.18/15`, `198.51.100/24`, `203.0.113/24`,
  `224/4` (multicast), `240/4` (reserved, incl. `255.255.255.255`).
- **IPv6:** `::` (unspecified), `::1` (loopback), `fc00::/7` (ULA), `fe80::/10`
  (link-local), `ff00::/8` (multicast), plus IPv4-mapped `::ffff:0:0/96` and
  NAT64 `64:ff9b::/96` — both **unwrapped and re-checked** as IPv4, which closes
  the `::ffff:127.0.0.1` mapped-loopback bypass.

## How it was verified

- **59 unit tests** (`__tests__/ssrf-guard.test.ts`) over `isBlockedAddress`
  (public allow-list, every blocked v4/v6 range, edge cases just outside a CIDR,
  the mapped/NAT64 bypasses, fail-closed on junk) and `assertFetchableUrl`
  (schemes, credentials, IP literals, bracketed IPv6). Full suite: 346 passing.
- **End-to-end behavioral proof:** `fetchPageText` refuses `127.0.0.1`,
  `169.254.169.254`, `10.0.0.1`, `[::1]`, `localhost`, and
  `localhost.localtest.me` (a *public* name that resolves to `127.0.0.1` — the
  rebinding shape, caught at connect time), each with the generic message; a
  public address passes the connect-time check.
- `tsc --noEmit`, ESLint, and `next build` all clean.

## Residual considerations (intentionally out of scope here)

- **Timing side-channel:** a synchronous reject (bad literal) returns slightly
  faster than a DNS-resolved reject. This is a weak oracle; closing it fully
  (constant-time responses) wasn't judged worth the complexity for this surface.
- **Port allow-listing:** the guard blocks by destination IP, not port. Adding an
  `80/443`-only allow-list would further reduce the surface but breaks
  legitimate postings served on non-standard ports; left open deliberately.
- **Response size cap:** the body is already truncated to 20 000 chars in
  `stripHtml`, but the full body is downloaded first. A streamed byte cap is a
  reasonable follow-up.
