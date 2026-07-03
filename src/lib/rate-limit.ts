import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting for the app's two abuse surfaces:
 *
 *   - "auth" — login/register, keyed by client IP. Slows credential
 *     brute-forcing and scripted account creation.
 *   - "ai"   — the AI endpoints (extract, score, explain, cover letter),
 *     keyed by user id. A cost cap: every call spends real tokens, so an
 *     authenticated user can't run the bill up without bound.
 *
 * Counters live in Upstash Redis (sliding window) because Vercel runs many
 * ephemeral function instances — an in-process counter wouldn't be shared.
 *
 * Availability posture (documented deliberately):
 *   - UNCONFIGURED (no Upstash env vars): limiting is DISABLED and every
 *     request is allowed, with a one-time warning. This keeps local dev and
 *     preview builds working without credentials. Production MUST set the env
 *     vars (see README) — otherwise this silently no-ops.
 *   - BACKEND ERROR (Redis unreachable): fail OPEN (allow) rather than take the
 *     app down when the limiter's datastore hiccups. Availability is chosen
 *     over strict enforcement; the error is logged.
 */

export type RateLimitKind = "auth" | "ai";

/** Window configs — tunable. Exported so tests and docs reference one source. */
export const RATE_LIMITS: Record<
  RateLimitKind,
  { limit: number; window: `${number} ${"s" | "m" | "h" | "d"}`; prefix: string }
> = {
  // 5 auth attempts per minute per IP.
  auth: { limit: 5, window: "60 s", prefix: "rl:auth" },
  // 30 AI operations per hour per user (cost cap).
  ai: { limit: 30, window: "1 h", prefix: "rl:ai" },
};

export function isRateLimitConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

let limiters: Record<RateLimitKind, Ratelimit> | null = null;
let warnedUnconfigured = false;

function getLimiter(kind: RateLimitKind): Ratelimit | null {
  if (!isRateLimitConfigured()) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is DISABLED. " +
          "Set both in production."
      );
    }
    return null;
  }
  if (!limiters) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    limiters = {
      auth: new Ratelimit({
        redis,
        prefix: RATE_LIMITS.auth.prefix,
        limiter: Ratelimit.slidingWindow(RATE_LIMITS.auth.limit, RATE_LIMITS.auth.window),
        analytics: false,
      }),
      ai: new Ratelimit({
        redis,
        prefix: RATE_LIMITS.ai.prefix,
        limiter: Ratelimit.slidingWindow(RATE_LIMITS.ai.limit, RATE_LIMITS.ai.window),
        analytics: false,
      }),
    };
  }
  return limiters[kind];
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

/**
 * Consume one unit against `kind` for `identifier` (an IP for "auth", a user id
 * for "ai"). Returns `{ ok: false, retryAfterSeconds }` when the window is
 * exhausted; allows (fails open) when unconfigured or on a backend error.
 */
export async function enforceRateLimit(
  kind: RateLimitKind,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getLimiter(kind);
  if (!limiter) return { ok: true }; // disabled (unconfigured)

  try {
    const { success, reset } = await limiter.limit(identifier);
    if (success) return { ok: true };
    const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return { ok: false, retryAfterSeconds };
  } catch (err) {
    console.error("[rate-limit] backend error — failing open", err);
    return { ok: true };
  }
}

/** Reset memoized limiters. Test-only. */
export function __resetRateLimitState(): void {
  limiters = null;
  warnedUnconfigured = false;
}
