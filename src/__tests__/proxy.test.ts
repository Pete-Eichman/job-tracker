import { describe, it, expect, vi, beforeEach } from "vitest";

// handleProxy is a plain function and doesn't need NextAuth's runtime —
// only the module-level `const { auth } = NextAuth(authConfig)` and the
// `auth(handleProxy)` default export do. Stub next-auth so importing
// proxy.ts doesn't pull in the real package (which errors under Vitest's
// module resolution, unrelated to this code — same reason other tests mock
// @/lib/auth rather than importing it live).
vi.mock("next-auth", () => ({
  default: () => ({ auth: (fn: unknown) => fn }),
}));

// enforceRateLimit is mocked so this test proves the ROUTING/branch decision
// (block vs. allow, which path gets checked) deterministically — the same
// approach used for the H-2 action-layer tests, since a live Redis isn't
// available in CI/sandbox. See docs/security/h2b-auth-callback-limit.md for
// the manual verification against a real deploy.
const mockEnforceRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: (...a: unknown[]) => mockEnforceRateLimit(...a),
}));

import { handleProxy } from "@/proxy";

function fakeReq(opts: {
  path: string;
  method?: string;
  auth?: unknown;
  forwardedFor?: string;
}) {
  const url = `http://localhost:3000${opts.path}`;
  return {
    nextUrl: new URL(url),
    url,
    method: opts.method ?? "GET",
    auth: opts.auth ?? null,
    headers: new Headers(
      opts.forwardedFor ? { "x-forwarded-for": opts.forwardedFor } : {}
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnforceRateLimit.mockResolvedValue({ ok: true });
});

describe("handleProxy — credentials-callback rate limiting", () => {
  it("checks the auth limiter, by IP, on POST to the credentials callback", async () => {
    await handleProxy(
      fakeReq({
        path: "/api/auth/callback/credentials",
        method: "POST",
        forwardedFor: "203.0.113.9",
      })
    );
    expect(mockEnforceRateLimit).toHaveBeenCalledWith("auth", "203.0.113.9");
  });

  it("returns 429 with Retry-After when the limiter blocks", async () => {
    mockEnforceRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 42 });

    const res = await handleProxy(
      fakeReq({ path: "/api/auth/callback/credentials", method: "POST" })
    );

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("does NOT check the limiter for GET requests to the same path", async () => {
    await handleProxy(
      fakeReq({ path: "/api/auth/callback/credentials", method: "GET" })
    );
    expect(mockEnforceRateLimit).not.toHaveBeenCalled();
  });

  it("does NOT check the limiter for unrelated api/auth routes", async () => {
    await handleProxy(fakeReq({ path: "/api/auth/session", method: "GET" }));
    await handleProxy(fakeReq({ path: "/api/auth/csrf", method: "POST" }));
    expect(mockEnforceRateLimit).not.toHaveBeenCalled();
  });

  it("falls through to a normal 200-shaped response when allowed", async () => {
    mockEnforceRateLimit.mockResolvedValue({ ok: true });
    const res = await handleProxy(
      fakeReq({ path: "/api/auth/callback/credentials", method: "POST" })
    );
    expect(res.status).not.toBe(429);
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
  });
});

describe("handleProxy — unrelated routes are unaffected", () => {
  it("redirects an unauthenticated /dashboard request to /login", async () => {
    const res = await handleProxy(fakeReq({ path: "/dashboard", auth: null }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    expect(mockEnforceRateLimit).not.toHaveBeenCalled();
  });

  it("does not redirect an authenticated /dashboard request", async () => {
    const res = await handleProxy(
      fakeReq({ path: "/dashboard", auth: { user: { id: "user-1" } } })
    );
    expect(res.status).not.toBe(307);
  });

  it("sets a CSP on a public route without redirecting", async () => {
    const res = await handleProxy(fakeReq({ path: "/login" }));
    expect(res.status).not.toBe(307);
    expect(res.headers.get("Content-Security-Policy")).toMatch(/nonce-/);
  });
});
