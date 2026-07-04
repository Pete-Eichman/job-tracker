import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

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

export default auth((req) => {
  const path = req.nextUrl.pathname;

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
});

export const config = {
  // All routes except NextAuth's own endpoints, Next internals, and static
  // asset files. (Item 4 re-includes the credentials callback for rate limiting.)
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
