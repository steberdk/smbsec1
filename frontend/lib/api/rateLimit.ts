/**
 * Simple in-memory sliding-window rate limiter for API routes.
 * Keyed by user ID (authenticated) or IP (unauthenticated).
 *
 * Not persistent across serverless cold starts — acceptable for the
 * SMB scale this product targets. Provides basic abuse protection.
 */

import { NextResponse } from "next/server";

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // per window

// Cleanup stale entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60_000);

/**
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
