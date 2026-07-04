import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseClientIp } from "@/lib/request-ip";

const { auth } = NextAuth(authConfig);

// NextAuth's raw credentials-exchange endpoint. The H-2 "auth" rate limit
// normally lives in the credentialsLogin server action (src/app/login/actions.ts)
// — but that's the *form's* path. A script can POST straight here and skip it
// entirely, since this route isn't behind the server action. Throttle it here,
// by IP, before the request reaches NextAuth.
const CREDENTIALS_CALLBACK = "/api/auth/callback/credentials";

// Routes that require a session. Everything else (/, /login, /register, …) is
// public and only receives the CSP, not the auth redirect.
const PROTECTED = [
  /^\/dashboard(\/|$)/,
  /^\/api\/cover-letter(\/|$)/,
  /^\/api\/jobs(\/|$)/,
];

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic' + nonce: framework scripts are nonced by Next; scripts
    // they load inherit trust. 'unsafe-inline'/'self' are ignored where
    // strict-dynamic is supported, kept as a fallback for older browsers.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // 'unsafe-inline' for styles: required for React inline style attributes
    // (e.g. animation delays) and Next's injected styles. Style-based injection
    // is far lower-risk than script injection.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

// Named and exported separately from the `auth(...)`-wrapped default export so
// the routing/rate-limit branch logic is unit-testable without mocking
// NextAuth's whole HOF. Behavior is unchanged — this is the same function.
export async function handleProxy(
  req: Parameters<Parameters<typeof auth>[0]>[0]
): Promise<NextResponse> {
  const path = req.nextUrl.pathname;

  if (path === CREDENTIALS_CALLBACK && req.method === "POST") {
    const ip = parseClientIp(
      req.headers.get("x-forwarded-for"),
      req.headers.get("x-real-ip")
    );
    const rate = await enforceRateLimit("auth", ip);
    if (!rate.ok) {
      return new NextResponse("Too many requests. Please wait a moment.", {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      });
    }
  }

  // Per-request nonce — Web Crypto only (edge runtime has no Node Buffer).
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));
  const csp = buildCsp(nonce);

  if (PROTECTED.some((re) => re.test(path)) && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Set the nonce/CSP on the forwarded request so Next stamps the nonce onto its
  // scripts, and on the response so the browser enforces the policy.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export default auth(handleProxy);

export const config = {
  // All routes except NextAuth's own endpoints, Next internals, and static
  // asset files — with one deliberate exception: api/auth/callback/credentials
  // stays IN scope (via the nested negative lookahead below) so it gets rate
  // limited above. Every other api/auth/* route (session, csrf, oauth
  // callbacks, signout, …) is untouched, exactly as before.
  matcher: [
    "/((?!api/auth(?!/callback/credentials(?:$|/))|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
