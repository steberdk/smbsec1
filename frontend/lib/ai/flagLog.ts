/**
 * F-012 PI 15 Iter 1 — persistent log of output-filter rejections + flags.
 *
 * Writes one row per filter hit into `smbsec1.ai_guidance_flags`. We persist
 * ONLY hashes of the request/response — never the raw content — so this
 * table stays GDPR-safe. Service-role writes only; no SELECT from
 * authenticated (see docs/sql/026_pi15_ai_guidance_flags.sql).
 *
 * Fails gracefully: if the table doesn't exist yet (migration 026 not
 * applied), we log a warning but do not bubble the error up into the
 * request path. The filter still works, you just lose the audit trail
 * until Stefan applies the migration.
 */

import { createHash } from "node:crypto";
import { supabaseServiceClient } from "../supabase/service";
import type { FilterFlag } from "./outputFilter";

/** SHA-256 hex digest of the input — safe to persist, never reversible. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export type FlagLogContext = {
  userId?: string | null;
  orgId?: string | null;
  bucket?: string | null;
  requestHash: string;
  responseHash: string;
};

/**
 * Insert one row per flag into `smbsec1.ai_guidance_flags`. Swallows any
 * Postgres error so a broken flag log cannot break the chat endpoint.
 */
export async function logFlags(
  flags: readonly FilterFlag[],
  ctx: FlagLogContext
): Promise<void> {
  if (flags.length === 0) return;

  try {
    const svc = supabaseServiceClient();
    const rows = flags.map((f) => ({
      user_id: ctx.userId ?? null,
      org_id: ctx.orgId ?? null,
      bucket: ctx.bucket ?? null,
      request_sha256: ctx.requestHash,
      response_sha256: ctx.responseHash,
      reason: `${f.rule}: ${f.reason}`,
      severity: f.severity,
    }));

    const { error } = await svc.from("ai_guidance_flags").insert(rows);
    if (error) {
      const msg = error.message ?? "";
      if (/does not exist|could not find|schema cache/i.test(msg)) {
        // Migration 026 not applied yet — log once and move on.
        console.warn(
          "[F-012] ai_guidance_flags table missing (migration 026 not applied yet)"
        );
      } else {
        console.warn("[F-012] ai_guidance_flags insert failed", msg);
      }
    }
  } catch (e) {
    console.warn(
      "[F-012] ai_guidance_flags insert threw",
      e instanceof Error ? e.message : String(e)
    );
  }
}
