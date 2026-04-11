/**
 * F-012 PI 14 Iter 1 — persistent rate limit RPC.
 *
 * Verifies that `smbsec1.check_and_increment_rate_limit` correctly:
 *   - lets the first N requests through (returns remaining >= 0)
 *   - blocks the (N+1)-th request in the same window (returns remaining < 0)
 *   - the block survives a "cold start" (fresh service client — simulates
 *     a new serverless function instance reading the same persistent state)
 *
 * Uses the service-role client directly so the test is pure DB plumbing and
 * does not need the Next.js dev server. It does need Supabase env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * and the migration `docs/sql/023_pi14_rate_limits.sql` applied.
 */

import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function freshServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for rate-limit tests"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: "smbsec1" },
  }) as unknown as SupabaseClient;
}

test("E2E-RL-01 (F-012): persistent rate limit blocks the (N+1)-th request in the window", async () => {
  const bucket = `e2e-rl:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const windowSec = 3600; // 1 hour
  const maxCount = 10;

  const svc = freshServiceClient();

  // Pre-flight: skip if migration 023 hasn't been applied yet (the RPC
  // doesn't exist). Once Stefan applies it in Supabase SQL editor, the
  // test auto-runs on the next CI pass.
  const preflight = await svc.rpc("check_and_increment_rate_limit", {
    p_bucket: `__preflight_${Date.now()}`,
    p_window_seconds: 60,
    p_max_count: 1,
  });
  test.skip(
    preflight.error !== null &&
      /does not exist|could not find the function|schema cache/i.test(
        preflight.error.message ?? ""
      ),
    "migration 023 (smbsec1.check_and_increment_rate_limit) not applied yet"
  );

  // First 10 calls should return remaining >= 0 (allowed).
  for (let i = 0; i < maxCount; i++) {
    const { data, error } = await svc.rpc("check_and_increment_rate_limit", {
      p_bucket: bucket,
      p_window_seconds: windowSec,
      p_max_count: maxCount,
    });
    expect(error).toBeNull();
    expect(typeof data === "number" ? data : Number(data)).toBeGreaterThanOrEqual(0);
  }

  // 11th call (from the SAME client) must be blocked.
  const { data: blockedData, error: blockedErr } = await svc.rpc(
    "check_and_increment_rate_limit",
    {
      p_bucket: bucket,
      p_window_seconds: windowSec,
      p_max_count: maxCount,
    }
  );
  expect(blockedErr).toBeNull();
  expect(typeof blockedData === "number" ? blockedData : Number(blockedData)).toBeLessThan(0);

  // Simulate a serverless "cold start": a brand new client, same bucket.
  // Because the state lives in Postgres, the new client must also see the
  // bucket as blocked.
  const svc2 = freshServiceClient();
  const { data: blockedAgainData, error: blockedAgainErr } = await svc2.rpc(
    "check_and_increment_rate_limit",
    {
      p_bucket: bucket,
      p_window_seconds: windowSec,
      p_max_count: maxCount,
    }
  );
  expect(blockedAgainErr).toBeNull();
  expect(
    typeof blockedAgainData === "number" ? blockedAgainData : Number(blockedAgainData)
  ).toBeLessThan(0);

  // Cleanup: delete the bucket rows so the test does not leave state behind.
  await svc.from("rate_limits").delete().eq("bucket", bucket);
});
