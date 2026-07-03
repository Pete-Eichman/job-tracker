import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the Upstash SDKs so we exercise enforceRateLimit's branching without a
// live Redis. `limitMock` is the controllable stand-in for Ratelimit#limit.
const { limitMock } = vi.hoisted(() => ({ limitMock: vi.fn() }));

vi.mock("@upstash/redis", () => ({
  Redis: class {},
}));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {};
    }
    limit = limitMock;
  },
}));

import {
  enforceRateLimit,
  isRateLimitConfigured,
  RATE_LIMITS,
  __resetRateLimitState,
} from "@/lib/rate-limit";

const CONFIGURED = {
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "test-token",
};

function configure(on: boolean) {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", on ? CONFIGURED.UPSTASH_REDIS_REST_URL : "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", on ? CONFIGURED.UPSTASH_REDIS_REST_TOKEN : "");
}

describe("RATE_LIMITS config", () => {
  it("defines positive limits and distinct key prefixes per surface", () => {
    expect(RATE_LIMITS.auth.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.ai.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.auth.prefix).not.toBe(RATE_LIMITS.ai.prefix);
  });
});

describe("isRateLimitConfigured", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is false when the Upstash env vars are missing", () => {
    configure(false);
    expect(isRateLimitConfigured()).toBe(false);
  });
  it("is true when both Upstash env vars are set", () => {
    configure(true);
    expect(isRateLimitConfigured()).toBe(true);
  });
});

describe("enforceRateLimit", () => {
  beforeEach(() => {
    __resetRateLimitState();
    limitMock.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("allows (fails open) and never hits the backend when unconfigured", async () => {
    configure(false);
    await expect(enforceRateLimit("auth", "1.2.3.4")).resolves.toEqual({ ok: true });
    expect(limitMock).not.toHaveBeenCalled();
  });

  it("allows when the limiter reports success", async () => {
    configure(true);
    limitMock.mockResolvedValue({ success: true, reset: Date.now() + 1000 });
    await expect(enforceRateLimit("ai", "user:1")).resolves.toEqual({ ok: true });
    expect(limitMock).toHaveBeenCalledWith("user:1");
  });

  it("blocks with a positive retryAfterSeconds when the window is exhausted", async () => {
    configure(true);
    limitMock.mockResolvedValue({ success: false, reset: Date.now() + 5000 });
    const res = await enforceRateLimit("auth", "1.2.3.4");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(res.retryAfterSeconds).toBeLessThanOrEqual(6);
    }
  });

  it("fails open when the backend throws (availability over strictness)", async () => {
    configure(true);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    limitMock.mockRejectedValue(new Error("redis unreachable"));
    await expect(enforceRateLimit("ai", "user:1")).resolves.toEqual({ ok: true });
    spy.mockRestore();
  });
});
