/**
 * Rate limiting helpers for API routes.
 *
 * Two flavours:
 *
 * 1. {@link rateLimit} — legacy in-memory sliding-window (`rateLimit(key)`)
 *    kept for backwards compatibility with existing callers. Not persistent
 *    across serverless cold starts. Prefer {@link rateLimitPersistent} for new
 *    code.
 *
 * 2. {@link rateLimitPersistent} — Supabase-backed, survives cold starts.
 *    Atomic check-and-increment via the `smbsec1.check_and_increment_rate_limit`
 *    RPC (see `docs/sql/023_pi14_rate_limits.sql`). Used by F-012 / F-031.
 */

import { NextResponse } from "next/server";
import { supabaseServiceClient } from "../supabase/service";

// ---------------------------------------------------------------------------
// Legacy in-memory limiter (kept for backwards compatibility)
// ---------------------------------------------------------------------------

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // per window

// Cleanup stale entries periodically (every 5 minutes).
// Guarded so it only registers once per module instance.
if (typeof globalThis !== "undefined" && !(globalThis as { __rlCleanup?: boolean }).__rlCleanup) {
  (globalThis as { __rlCleanup?: boolean }).__rlCleanup = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60_000);
}

/**
 * @deprecated Use {@link rateLimitPersistent} for new code — the in-memory
 *   store is not shared across serverless instances. Existing callers are
 *   left alone for now; migrating them is tracked under F-031.
 *
 * Returns a 429 NextResponse if the caller has exceeded the rate limit,
 * or null if the request is allowed.
 */
export function rateLimit(key: string): NextResponse | null {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Extracts a rate-limit key from the request.
 * Uses userId if provided, falls back to IP.
 */
export function rateLimitKey(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `ip:${ip}`;
}

// ---------------------------------------------------------------------------
// Persistent (Supabase-backed) limiter
// ---------------------------------------------------------------------------

export type PersistentRateLimitResult = {
  /** True if the request is allowed (within the cap). */
  allowed: boolean;
  /** Remaining requests in this window (0 if blocked). */
  remaining: number;
  /** Epoch millis at which the current window ends and counters reset. */
  resetAt: number;
};

/**
 * Atomic check-and-increment for a persistent rate-limit bucket.
 *
 * The bucket string is whatever the caller wants — conventionally
 * `"<feature>:<scope>:<id>"` (e.g. `"guidance:user:<uuid>"`).
 *
 * Fails **open** when the RPC is missing (migration 023 not yet applied) so
 * the route stays usable; falls back to the legacy in-memory limiter for
 * basic abuse protection. Once migration 023 is applied, this path becomes
 * the persistent fast path. Other RPC errors fail closed.
 *
 * @param bucket        Opaque bucket key.
 * @param windowSec     Window length in seconds.
 * @param maxCount      Maximum requests allowed inside the window.
 */
export async function rateLimitPersistent(
  bucket: string,
  windowSec: number,
  maxCount: number
): Promise<PersistentRateLimitResult> {
  const now = Date.now();
  // Compute the floor()-aligned window end that matches the RPC's bucketing.
  const windowStartEpochSec = Math.floor(now / 1000 / windowSec) * windowSec;
  const resetAt = (windowStartEpochSec + windowSec) * 1000;

  try {
    const svc = supabaseServiceClient();
    const { data, error } = await svc.rpc("check_and_increment_rate_limit", {
      p_bucket: bucket,
      p_window_seconds: windowSec,
      p_max_count: maxCount,
    });

    if (error) {
      // If the RPC doesn't exist yet (migration 023 not applied), fall back
      // to the legacy in-memory limiter. Other errors → fail closed.
      const msg = error.message ?? "";
      if (/does not exist|could not find the function|schema cache/i.test(msg)) {
        return inMemoryFallback(bucket, windowSec, maxCount, resetAt);
      }
      return { allowed: false, remaining: 0, resetAt };
    }

    const remaining = typeof data === "number" ? data : Number(data);
    if (!Number.isFinite(remaining)) {
      return { allowed: false, remaining: 0, resetAt };
    }

    if (remaining < 0) {
      return { allowed: false, remaining: 0, resetAt };
    }
    return { allowed: true, remaining, resetAt };
  } catch {
    return inMemoryFallback(bucket, windowSec, maxCount, resetAt);
  }
}

function inMemoryFallback(
  bucket: string,
  windowSec: number,
  maxCount: number,
  resetAt: number
): PersistentRateLimitResult {
  const now = Date.now();
  const entry = store.get(bucket);
  if (!entry || now > entry.resetAt) {
    store.set(bucket, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, remaining: maxCount - 1, resetAt };
  }
  entry.count++;
  if (entry.count > maxCount) {
    return { allowed: false, remaining: 0, resetAt };
  }
  return { allowed: true, remaining: maxCount - entry.count, resetAt };
}
