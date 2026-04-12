/**
 * F-012 PI 15 Iter 1 — server-side authoritative checklist item lookup.
 *
 * The AI guidance endpoints previously interpolated `item_title`,
 * `item_description`, `item_why`, and `item_steps` directly from the client
 * request body into the Anthropic system prompt. A malicious client can lie
 * about any of those fields and smuggle arbitrary content into the prompt —
 * in effect, injecting new instructions the model treats as trusted. This
 * was raised in Security Round 2 §10 (PI 14 ROADMAP) as a pre-existing
 * critical flaw.
 *
 * This module centralises the fix: given an authenticated user + an
 * `item_id` OR a legacy `item_title`, return the CANONICAL fields from the
 * `assessment_items` table for the user's org's active assessment. The
 * client-supplied fields are NEVER trusted for interpolation.
 *
 * Used by:
 *   - `/api/guidance/chat`  (new in PI 15, always by `item_id`)
 *   - `/api/guidance`       (legacy one-shot, falls back to title lookup
 *                            for backwards compatibility with PI 5+ callers)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceClient } from "../supabase/service";

/** Canonical checklist item data safe to interpolate into an AI prompt. */
export type CanonicalItem = {
  id: string;
  assessment_id: string;
  title: string;
  description: string | null;
  why_it_matters: string | null;
  /** Always a `string[]`; empty when unknown. Never raw jsonb. */
  steps: string[];
  track: "it_baseline" | "awareness" | string;
};

type RawRow = {
  id: string;
  assessment_id: string;
  title: string;
  description: string | null;
  why_it_matters: string | null;
  steps: unknown;
  track: string | null;
};

function normaliseSteps(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((s): s is string => typeof s === "string");
  }
  if (raw && typeof raw === "object") {
    // Keyed object: { default: [...], google_workspace: [...] }. Pick
    // "default" if present, else the first array value found.
    const obj = raw as Record<string, unknown>;
    const def = obj["default"];
    if (Array.isArray(def)) {
      return def.filter((s): s is string => typeof s === "string");
    }
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) {
        return v.filter((s): s is string => typeof s === "string");
      }
    }
  }
  return [];
}

function rowToCanonical(row: RawRow): CanonicalItem {
  return {
    id: row.id,
    assessment_id: row.assessment_id,
    title: row.title,
    description: row.description,
    why_it_matters: row.why_it_matters,
    steps: normaliseSteps(row.steps),
    track: (row.track ?? "it_baseline") as CanonicalItem["track"],
  };
}

/**
 * Find the user's org's currently-active assessment id. Returns null if the
 * user is not a member of any org, or the org has no active assessment.
 *
 * Uses the caller's JWT-bound supabase client so RLS still applies — the
 * service-role client is only used downstream when we know the user is a
 * legitimate member of the target org.
 */
export async function getActiveAssessmentIdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ orgId: string; assessmentId: string } | null> {
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return null;

  const orgId = (membership as { org_id: string }).org_id;

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id")
    .eq("org_id", orgId)
    .eq("status", "active")
    .maybeSingle();
  if (!assessment) return null;

  return { orgId, assessmentId: (assessment as { id: string }).id };
}

/**
 * Authoritative lookup by `item_id`. The item MUST belong to the user's
 * org's active assessment — otherwise returns `null` (treat as 404/403).
 *
 * Uses the service-role client for the final read because we already
 * enforced org ownership via the membership + assessment lookups above.
 * This avoids any RLS ambiguity during the sensitive prompt-building path.
 */
export async function lookupItemById(
  supabase: SupabaseClient,
  userId: string,
  itemId: string
): Promise<CanonicalItem | null> {
  const scope = await getActiveAssessmentIdForUser(supabase, userId);
  if (!scope) return null;

  const svc = supabaseServiceClient();
  const { data, error } = await svc
    .from("assessment_items")
    .select("id, assessment_id, title, description, why_it_matters, steps, track")
    .eq("id", itemId)
    .eq("assessment_id", scope.assessmentId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToCanonical(data as RawRow);
}

/**
 * Legacy lookup by title (case-insensitive substring) for the pre-PI-15
 * `/api/guidance` route. Returns the first matching assessment item in the
 * caller's active assessment. Emits a deprecation warning via console for
 * observability.
 *
 * Returns `null` if the user has no active assessment OR no item matches.
 */
export async function lookupItemByTitle(
  supabase: SupabaseClient,
  userId: string,
  rawTitle: string
): Promise<CanonicalItem | null> {
  if (!rawTitle || typeof rawTitle !== "string") return null;

  console.warn(
    "[F-012] /api/guidance legacy title-based lookup used — migrate caller to send item_id"
  );

  const scope = await getActiveAssessmentIdForUser(supabase, userId);
  if (!scope) return null;

  const svc = supabaseServiceClient();

  // First try exact (case-insensitive) title match, which is the common case
  // for the existing AiGuidancePanel that sends the server-rendered title.
  const { data: exact } = await svc
    .from("assessment_items")
    .select("id, assessment_id, title, description, why_it_matters, steps, track")
    .eq("assessment_id", scope.assessmentId)
    .ilike("title", rawTitle)
    .limit(1);

  if (exact && exact.length > 0) {
    return rowToCanonical(exact[0] as RawRow);
  }

  // Fall back to substring match for robustness across trivial copy edits.
  // ilike with `%` wildcards escapes nothing else, so we guard against the
  // pattern operators by stripping them.
  const safeSubstring = rawTitle.replace(/[%_\\]/g, " ").trim();
  if (!safeSubstring) return null;

  const { data: like } = await svc
    .from("assessment_items")
    .select("id, assessment_id, title, description, why_it_matters, steps, track")
    .eq("assessment_id", scope.assessmentId)
    .ilike("title", `%${safeSubstring}%`)
    .limit(1);

  if (like && like.length > 0) {
    return rowToCanonical(like[0] as RawRow);
  }

  return null;
}
