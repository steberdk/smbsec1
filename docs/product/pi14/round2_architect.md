# PI 14 ROADMAP — Round 2: Architect

**Author:** Architect agent
**Round:** 2 of 3
**Date:** 2026-04-11
**Purpose:** Lock the technical approach and answer the open questions from Round 1 with concrete code/SQL sketches so IT Dev can start refinement without further architecture debate.

I have now read PM, UX, Security, and BA Round 1 inputs. References: `round1_product_manager.md`, `round1_ux_designer.md`, `round1_security_expert.md`, `round1_business_analyst.md`, and my own `round1_architect.md`.

---

## 0. Round 2 headlines (TL;DR)

1. **F-038 AC-7 is locked as "per-member sum" (option a).** UX's clever two-number proposal (36 personal / 47 team) is exactly what I recommend — but it falls out of option (a) naturally when we add `stats.me`. No data-model change needed.
2. **The dashboard flicker** is a pure client-side bug in `page.tsx` line 183 (ternary on `members.length`). Root cause: two different denominators in the same render. Fix is four lines in `page.tsx`, plus one rename in `route.ts`.
3. **`stats.me` goes into the existing `/api/dashboard` response.** Option C (sibling object) confirmed. No new endpoint.
4. **Single shared helper** `frontend/lib/dashboard/computeStats.ts`. API route + security report both import it. Kills F-040 regression risk forever.
5. **I concede to 2 PIs.** PM/Security/UX/BA all independently converged on PI 14 = trust core + harness, PI 15 = AI + GDPR + mobile. Splitting avoids F-031 attack surface landing in the same iteration as dashboard math. My Round 1 "1 PI / 2 iter" was too aggressive.
6. **Phantom-Done root cause** is not a missed file — it is that the PI 13 commit `fee865e` never contained the F-023/F-024 code changes at all. See section 11.

---

## 1. F-038 AC-7 — denominator semantics LOCKED

**Decision: option (a) — per-member sum.**

What the API returns:

```ts
// /api/dashboard response (trimmed to the relevant fields)
{
  stats: {
    // --- ORG-WIDE AGGREGATE (unchanged semantics, corrected math) ---
    total:       number,   // legacy field = unique checklist items in assessment (e.g. 36). KEPT for back-compat readers but the UI stops using it for denominators.
    denominator: number,   // NEW, authoritative: sum over scoped members of (is_it_executor ? totalItems : awarenessCount). Stefan's example = 47.
    done:        number,   // raw count of done responses across scoped members
    unsure:      number,   // raw count of unsure/not-yet responses
    skipped:     number,   // raw count of not-applicable responses
    resolved:    number,   // = done + skipped (new, per F-038 AC-2)
    percent:     number,   // = round((resolved / denominator) * 100)
    by_track: {
      it_baseline: { total, denominator, done, unsure, skipped, resolved, percent },
      awareness:   { total, denominator, done, unsure, skipped, resolved, percent },
    },

    // --- CALLER-ONLY AGGREGATE (F-039) ---
    me: {
      total:       number,   // unique items the caller sees (totalItems if IT exec, else awarenessCount) — Stefan's example = 36 or 11
      denominator: number,   // same as `total` (single-member scope; renamed for symmetry)
      done:        number,   // caller's own done responses
      unsure:      number,
      skipped:     number,
      resolved:    number,
      percent:     number,
    },
  },
  members: [...],  // unchanged
  cadence: {...},  // unchanged
}
```

**Why option (a) and not (b):**

- The current code IS option (a). Option (b) requires deciding what "answered" means (any member? all members? caller?). Every definition of (b) is internally inconsistent when applied per-track.
- UX's mental-model point ("Stefan thinks 36, not 47") is still served: the `stats.me.percent` is the 36-based number and **that is what the "My checklist" card on the workspace home will display** (F-039). The dashboard itself (which is by definition team-scope) uses the 47-based `stats.denominator` and labels it "responses" — which matches BA's AC rewrite and UX's two-number framing.
- Option (a) makes `F-035` (pending invitees) trivial later: a pending invitee simply contributes `awarenessCount` (or 0, per Round 2 open question) to `denominator`. No formula rework.

**How `/api/dashboard?scope=me` (or `stats.me`) is computed:**

Inside the same handler, after computing the org-wide aggregate, filter `allResponses` to `r.user_id === user.id` and run the **same helper function** against `scopedUserIds = [user.id]`. Zero extra DB round-trips — we already loaded all rows. One function, two calls, two sub-objects. See section 4.

---

## 2. F-038 fix — exact code change

### `frontend/app/api/dashboard/route.ts` lines 122-156 → refactor

**Current (lines 122-135):**
```ts
const done    = allResponses.filter((r) => r.status === "done").length;
const unsure  = allResponses.filter((r) => r.status === "unsure").length;
const skipped = allResponses.filter((r) => r.status === "skipped").length;

const totalPossible = scopedUserIds.reduce((sum, uid) => {
  const member = allMembers.find((m) => m.user_id === uid);
  return sum + (member?.is_it_executor ? totalItems : awarenessCount);
}, 0);
const percent =
  totalPossible === 0
    ? 0
    : Math.round(((done + unsure + skipped) / totalPossible) * 100);
```

**After (replace lines 122-156 with a single call into the new helper):**
```ts
import { computeStats, computeTrackStats } from "@/lib/dashboard/computeStats";

// Org-wide aggregate across all scoped users
const orgStats = computeStats({
  responses: allResponses,
  scopedUserIds,
  allMembers,
  totalItems,
  awarenessCount,
});
const orgTrack = {
  it_baseline: computeTrackStats({
    responses: allResponses,
    itemIds: itBaselineItemIds,
    trackName: "it_baseline",
    scopedUserIds,
    allMembers,
  }),
  awareness: computeTrackStats({
    responses: allResponses,
    itemIds: awarenessItemIds,
    trackName: "awareness",
    scopedUserIds,
    allMembers,
  }),
};

// Caller-only aggregate (F-039)
const meStats = computeStats({
  responses: allResponses,
  scopedUserIds: [user.id],
  allMembers,
  totalItems,
  awarenessCount,
});
const meTrack = {
  it_baseline: computeTrackStats({
    responses: allResponses,
    itemIds: itBaselineItemIds,
    trackName: "it_baseline",
    scopedUserIds: [user.id],
    allMembers,
  }),
  awareness: computeTrackStats({
    responses: allResponses,
    itemIds: awarenessItemIds,
    trackName: "awareness",
    scopedUserIds: [user.id],
    allMembers,
  }),
};
```

Then in the JSON response body (lines 211-223), replace the `stats:` object with:

```ts
stats: {
  total: totalItems,        // legacy — do not remove yet
  denominator: orgStats.denominator,
  done:     orgStats.done,
  unsure:   orgStats.unsure,
  skipped:  orgStats.skipped,
  resolved: orgStats.resolved,
  percent:  orgStats.percent,
  by_track: orgTrack,
  me: { ...meStats, by_track: meTrack },
},
```

Member breakdown (lines 172-202) also calls `computeStats` with `scopedUserIds: [uid]` per member to keep formulas identical.

### `frontend/app/workspace/dashboard/page.tsx` line 183

**Current:**
```tsx
<span>{stats.done + stats.unsure + stats.skipped} / {members.length > 0 ? members.reduce((s, m) => s + m.total, 0) : stats.total} responses</span>
```

**After:**
```tsx
<span>{stats.resolved + stats.unsure} / {stats.denominator} responses</span>
```

The flicker is gone because `stats.denominator` and `stats.percent` come from the same server computation in the same response. No client-side branching on `members.length`.

**Line 184** — `stats.percent` is already correct after the API fix.

### `frontend/app/workspace/dashboard/page.tsx` lines 193-197 (pills)

**Current:**
```tsx
<div className="grid grid-cols-4 gap-3 text-center">
  <StatPill label="Resolved" value={stats.done + stats.skipped} color="text-teal-700" />
  <StatPill label="Done" value={stats.done} color="text-green-700" />
  <StatPill label="Unsure" value={stats.unsure} color="text-amber-700" />
  <StatPill label="Not applicable" value={stats.skipped} color="text-gray-500" />
</div>
```

**After (UX Round 1 order + labels):**
```tsx
<div className="grid grid-cols-4 gap-3 text-center">
  <StatPill label="Resolved"       value={stats.resolved} color="text-teal-700" />
  <StatPill label="Done"           value={stats.done}     color="text-green-700" />
  <StatPill label="Not applicable" value={stats.skipped}  color="text-green-700" variant="outline" />
  <StatPill label="Unsure / Not yet" value={stats.unsure} color="text-amber-700" />
</div>
```

The `StatPill` component grows one optional `variant` prop; outline variant uses `border-green-300 bg-white` per UX spec. Two new lines in `StatPill.tsx`. Not controversial.

### `trackStats` inside the same file

The current `trackStats` function is removed from the route — it now lives in `computeStats.ts` as `computeTrackStats`. Line 154's `((tDone + tUnsure + tSkipped) / tTotal) * 100` becomes `((tDone + tSkipped) / tTotal) * 100` — the F-038 numerator fix. Track pills in `TrackBar.tsx` switch to the new `resolved` / `unsure` / `done` / `skipped` field names (one-line find-replace).

**Total change:** ~4 files, ~100 LOC including the new helper. No DB changes.

---

## 3. F-039 — `stats.me` Option C confirmed

**Shape (exact):**
```ts
stats.me = {
  total:       number,  // unique items caller can see (totalItems or awarenessCount)
  denominator: number,  // same as total (single-member scope)
  done:        number,
  unsure:      number,
  skipped:     number,
  resolved:    number,  // done + skipped
  percent:     number,  // round(resolved / denominator * 100)
  by_track: {
    it_baseline: { total, denominator, done, unsure, skipped, resolved, percent },
    awareness:   { total, denominator, done, unsure, skipped, resolved, percent },
  },
}
```

**Who calls it:** `frontend/app/workspace/page.tsx` line 32 — change `setChecklistPercent(stats.percent)` to `setChecklistPercent(stats.me.percent)`. That is the **entire F-039 client delta**.

Also the `WorkspaceCard` at line 115 already binds `progress={checklistPercent}` — no change there.

**Important:** `stats.me.by_track` is sent even though the workspace home doesn't currently use it. It costs nothing (same data already in memory) and unlocks a future "Your IT Baseline: X%" card without another API round-trip.

---

## 4. F-040 — shared helper `frontend/lib/dashboard/computeStats.ts`

**Yes, refactor to a single helper.** This is exactly the right answer because:

1. The security report (`frontend/app/workspace/report/page.tsx` lines 133-136) currently re-computes `totalAnswered = done + unsure + skipped` from the raw `stats` fields it receives from `/api/dashboard`. If F-038 relabels `percent` server-side but the report keeps its own client-side sum, we get the exact divergence F-040 is trying to kill.
2. Also lines 254-262 compute three widths as `totalDone / totalAnswered` — wrong for the "resolved vs unresolved" framing. Need the helper definition to enforce which ratio is shown where.
3. F-041 (IT Executor reassignment) will verify "dashboard math unchanged before/after reassignment" — a single helper guarantees this test is meaningful.

**New file:** `frontend/lib/dashboard/computeStats.ts`

```ts
// frontend/lib/dashboard/computeStats.ts
// Single source of truth for dashboard arithmetic. Imported by:
//   - frontend/app/api/dashboard/route.ts  (server)
//   - frontend/app/workspace/report/page.tsx (client, via API fields)
// Any new consumer MUST go through this file.

export type Response = { user_id: string; assessment_item_id: string; status: "done" | "unsure" | "skipped" };
export type MemberLite = { user_id: string; is_it_executor: boolean };

export type Stats = {
  total: number;        // unique items in scope (informational)
  denominator: number;  // per-member sum of applicable items — denominator for percent
  done: number;
  unsure: number;
  skipped: number;
  resolved: number;     // done + skipped
  percent: number;      // round(resolved / denominator * 100)
};

export function computeStats(input: {
  responses: Response[];
  scopedUserIds: string[];
  allMembers: MemberLite[];
  totalItems: number;       // all items in assessment
  awarenessCount: number;   // awareness-track items
}): Stats {
  const scoped = new Set(input.scopedUserIds);
  const rs = input.responses.filter((r) => scoped.has(r.user_id));
  const done    = rs.filter((r) => r.status === "done").length;
  const unsure  = rs.filter((r) => r.status === "unsure").length;
  const skipped = rs.filter((r) => r.status === "skipped").length;
  const resolved = done + skipped;

  const denominator = input.scopedUserIds.reduce((sum, uid) => {
    const m = input.allMembers.find((x) => x.user_id === uid);
    return sum + (m?.is_it_executor ? input.totalItems : input.awarenessCount);
  }, 0);

  // Total (informational): largest item set any in-scope user can see
  const anyItExec = input.scopedUserIds.some((uid) =>
    input.allMembers.find((m) => m.user_id === uid)?.is_it_executor
  );
  const total = anyItExec ? input.totalItems : input.awarenessCount;

  const percent = denominator === 0 ? 0 : Math.round((resolved / denominator) * 100);
  return { total, denominator, done, unsure, skipped, resolved, percent };
}

export function computeTrackStats(input: {
  responses: Response[];
  itemIds: Set<string>;
  trackName: "it_baseline" | "awareness";
  scopedUserIds: string[];
  allMembers: MemberLite[];
}): Stats {
  const scoped = new Set(input.scopedUserIds);
  const rs = input.responses.filter(
    (r) => scoped.has(r.user_id) && input.itemIds.has(r.assessment_item_id)
  );
  const done    = rs.filter((r) => r.status === "done").length;
  const unsure  = rs.filter((r) => r.status === "unsure").length;
  const skipped = rs.filter((r) => r.status === "skipped").length;
  const resolved = done + skipped;

  const eligible = input.trackName === "it_baseline"
    ? input.scopedUserIds.filter((uid) =>
        input.allMembers.find((m) => m.user_id === uid)?.is_it_executor
      )
    : input.scopedUserIds;
  const denominator = input.itemIds.size * eligible.length;

  const percent = denominator === 0 ? 0 : Math.round((resolved / denominator) * 100);
  return { total: input.itemIds.size, denominator, done, unsure, skipped, resolved, percent };
}
```

**Unit test file:** `frontend/lib/dashboard/computeStats.test.ts` — covers BA's 4 scenarios + Stefan's exact example (47/36 split) + empty-org + no-IT-executor edge case. This is the "unit test before merge" PM demanded. The test file must exist in iteration 1 — it is the forever-regression-guard for F-038/F-039/F-040.

**Security report file touched:** `frontend/app/workspace/report/page.tsx` lines 133-136 and 254-262. After the helper lands, the report reads `stats.resolved`, `stats.unsure`, `stats.skipped`, `stats.denominator` from the API response — no local summation. The progress bar at lines 250-266 switches to segments `resolved / denominator`, `unsure / denominator`, `(denominator - resolved - unsure) / denominator` (undecided room). AC-5 (dashboard ↔ report equivalence) becomes a trivial Playwright parity test.

---

## 5. F-031 — `/api/guidance/chat` endpoint shape

**Route:** `POST /api/guidance/chat`
**Auth:** requires signed-in user (Bearer token). Guarded by `supabaseForRequest`.

**Request body:**
```ts
{
  item_id: string,              // assessment_item_id — globally unique UUID
  item_title: string,           // for system prompt context
  item_description?: string,    // sanitised upstream of API (see F-012 §3)
  item_why?: string,
  item_steps?: string[],
  history: Array<{              // sent by client every turn; server is stateless
    role: "user" | "assistant",
    content: string,
  }>,
  message: string,              // new user message; server enforces ≤ 500 chars
}
```

**Response (success):**
```ts
{
  reply: string,                // assistant message, ≤ 2000 chars post-filter
  remaining_today: number,      // messages left for this (user, item, UTC day)
  flagged?: boolean,            // true if output filter triggered soft flag
}
```

**Response (rate-limited, HTTP 429):**
```ts
{
  error: "rate_limited",
  scope: "item_day" | "user_day" | "org_day",
  reset_at: string,             // ISO timestamp
  remaining_today: 0,
}
```

**Response (input too long, HTTP 400):**
```ts
{ error: "message_too_long", max_chars: 500 }
```

**History truncation strategy:**

Client-side and server-side both truncate. Client keeps last 10 **turns** (20 messages max) in `useState`; before posting, it trims `history` to the last 10 items. Server independently re-trims using an **approximate token budget**:

```ts
const MAX_CONTEXT_TOKENS = 8000;
// ~4 chars/token heuristic — good enough; Anthropic SDK returns accurate count in response.usage
function trimToBudget(history: Msg[], systemPromptChars: number): Msg[] {
  const budget = MAX_CONTEXT_TOKENS * 4 - systemPromptChars - 2000; // reserve for new user msg + reply
  let total = 0;
  const out: Msg[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    total += history[i].content.length;
    if (total > budget) break;
    out.unshift(history[i]);
  }
  return out;
}
```

Hard cap: absolute max 20 messages in history even if under token budget (matches Security §1 item 5).

**Anthropic streaming:** **No streaming in v1.** Rationale:
- Simpler error handling.
- Next.js 16 App Router streaming with Anthropic's `messages.stream` works but the client-side `useState` shape gets ugly (partial messages, retry semantics).
- Chat responses are capped at 1024 output tokens (~400 words, ~3 seconds). Acceptable latency for a 30-minute tool.
- Revisit for v2 once F-031 is live and we see actual latency complaints.

**Error handling:**
- `AbortSignal.timeout(30_000)` on the Anthropic call. On timeout → 504 `{ error: "timeout" }`.
- Anthropic API 5xx → 503 `{ error: "upstream_unavailable" }`, client shows retry link.
- `AI_GUIDANCE_DISABLED=true` env kill-switch returns 503 unconditionally (Security §1 item 6).
- Any exception inside `supabase.rpc("check_and_increment_rate_limit")` fails closed — return 503, do NOT call Anthropic. Better to deny service than to leak quota.

**Legacy `/api/guidance`:** **Deprecate**, not delete. Keep as a thin alias that invokes the chat handler with `history: []`. Remove after one iteration if no callers remain.

**Dependency:** F-031 must not merge until F-012's `check_and_increment_rate_limit` RPC is live in PROD.

---

## 6. F-012 — rate-limit RPC (SQL)

**Migration:** `docs/sql/022_rate_limits.sql`

```sql
-- Persistent rate-limiting for serverless functions. Cold-start safe.
CREATE TABLE IF NOT EXISTS smbsec1.rate_limits (
  bucket       text        NOT NULL,   -- feature name: 'guidance', 'dashboard', 'orgs', ...
  scope_key    text        NOT NULL,   -- e.g. user_id or "user_id::item_id"
  window_start timestamptz NOT NULL DEFAULT now(),
  count        int         NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON smbsec1.rate_limits (window_start);

ALTER TABLE smbsec1.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only service-role touches this.

-- Atomic increment. Returns { allowed, remaining, reset_at }.
CREATE OR REPLACE FUNCTION smbsec1.check_and_increment_rate_limit(
  p_bucket     text,
  p_scope_key  text,
  p_window_ms  int,       -- window length in milliseconds (e.g. 86400000 for 1 day)
  p_max        int        -- max events allowed in window
) RETURNS TABLE (allowed boolean, remaining int, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = smbsec1, public
AS $$
DECLARE
  v_now          timestamptz := now();
  v_window_start timestamptz;
  v_count        int;
BEGIN
  -- Upsert a row for the (bucket, scope_key), resetting the window if expired.
  INSERT INTO smbsec1.rate_limits (bucket, scope_key, window_start, count)
  VALUES (p_bucket, p_scope_key, v_now, 1)
  ON CONFLICT (bucket, scope_key) DO UPDATE
    SET window_start = CASE
          WHEN smbsec1.rate_limits.window_start < v_now - (p_window_ms || ' milliseconds')::interval
          THEN v_now
          ELSE smbsec1.rate_limits.window_start
        END,
        count = CASE
          WHEN smbsec1.rate_limits.window_start < v_now - (p_window_ms || ' milliseconds')::interval
          THEN 1
          ELSE smbsec1.rate_limits.count + 1
        END
  RETURNING window_start, count INTO v_window_start, v_count;

  RETURN QUERY SELECT
    (v_count <= p_max)                                         AS allowed,
    GREATEST(p_max - v_count, 0)                               AS remaining,
    v_window_start + (p_window_ms || ' milliseconds')::interval AS reset_at;
END;
$$;

REVOKE ALL ON FUNCTION smbsec1.check_and_increment_rate_limit(text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION smbsec1.check_and_increment_rate_limit(text, text, int, int) TO service_role;
```

**Atomicity:** The single `INSERT … ON CONFLICT` holds a row-lock for the duration, so concurrent callers serialise on `(bucket, scope_key)`. No lost increments.

**TypeScript wrapper** in `frontend/lib/api/rateLimit.ts` replaces the in-memory Map:

```ts
export async function rateLimit(opts: {
  bucket: string;
  scopeKey: string;
  windowMs: number;
  max: number;
}): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const svc = createServiceClient();
  const { data, error } = await svc.rpc("check_and_increment_rate_limit", {
    p_bucket: opts.bucket,
    p_scope_key: opts.scopeKey,
    p_window_ms: opts.windowMs,
    p_max: opts.max,
  });
  if (error) throw error; // fail closed upstream
  return {
    allowed: data[0].allowed,
    remaining: data[0].remaining,
    resetAt: new Date(data[0].reset_at),
  };
}
```

**Buckets used by F-031 chat endpoint:**
- `("guidance_item_day", `${user_id}::${item_id}::${utc_date}`)` — window 86_400_000, max **20**
- `("guidance_user_day", `${user_id}::${utc_date}`)` — window 86_400_000, max **60**
- `("guidance_org_day", `${org_id}::${utc_date}`)` — window 86_400_000, max **300**

All three are checked in order. First failure returns the 429 with the relevant `scope`.

**Cleanup:** Vercel cron daily → `DELETE FROM smbsec1.rate_limits WHERE window_start < now() - interval '7 days';`

---

## 7. F-033 — cascade deletion RPC (SQL)

**Migration:** `docs/sql/023_member_cascade.sql`

```sql
CREATE OR REPLACE FUNCTION smbsec1.delete_member_with_data(
  p_org_id        uuid,
  p_target_email  text,
  p_actor_user_id uuid
) RETURNS TABLE (
  success           boolean,
  removed_user_id   uuid,
  responses_deleted int,
  invites_deleted   int,
  campaigns_deleted int,
  error             text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = smbsec1, public
AS $$
DECLARE
  v_target_user_id uuid;
  v_is_admin       boolean;
  v_was_it_exec    boolean;
  v_last_owner     boolean;
  v_target_email_lc text := lower(p_target_email);
  v_resp_count     int := 0;
  v_inv_count      int := 0;
  v_camp_count     int := 0;
  v_assessment_ids uuid[];
BEGIN
  -- Entire function runs inside an implicit transaction.

  -- 1. Actor must be org_admin of this org.
  SELECT role = 'org_admin' INTO v_is_admin
  FROM smbsec1.org_members
  WHERE org_id = p_org_id AND user_id = p_actor_user_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN QUERY SELECT false, NULL::uuid, 0, 0, 0, 'not_authorized'::text;
    RETURN;
  END IF;

  -- 2. Resolve target (may be joined member OR pending invite).
  SELECT user_id, is_it_executor INTO v_target_user_id, v_was_it_exec
  FROM smbsec1.org_members
  WHERE org_id = p_org_id AND lower(email) = v_target_email_lc;

  -- 3. Self-removal guard.
  IF v_target_user_id = p_actor_user_id THEN
    RETURN QUERY SELECT false, v_target_user_id, 0, 0, 0, 'cannot_remove_self'::text;
    RETURN;
  END IF;

  -- 4. Last-owner guard.
  IF v_target_user_id IS NOT NULL THEN
    SELECT (COUNT(*) FILTER (WHERE role = 'org_admin')) <= 1 INTO v_last_owner
    FROM smbsec1.org_members
    WHERE org_id = p_org_id AND role = 'org_admin' AND user_id = v_target_user_id;

    IF v_last_owner THEN
      RETURN QUERY SELECT false, v_target_user_id, 0, 0, 0, 'cannot_remove_last_owner'::text;
      RETURN;
    END IF;
  END IF;

  -- 5. Delete assessment_responses for target user in this org's assessments.
  IF v_target_user_id IS NOT NULL THEN
    SELECT array_agg(id) INTO v_assessment_ids
    FROM smbsec1.assessments WHERE org_id = p_org_id;

    IF v_assessment_ids IS NOT NULL THEN
      WITH del AS (
        DELETE FROM smbsec1.assessment_responses
        WHERE user_id = v_target_user_id
          AND assessment_id = ANY(v_assessment_ids)
        RETURNING 1
      )
      SELECT count(*) INTO v_resp_count FROM del;
    END IF;
  END IF;

  -- 6. Delete campaign_recipients for target.
  WITH del AS (
    DELETE FROM smbsec1.campaign_recipients
    WHERE campaign_id IN (SELECT id FROM smbsec1.campaigns WHERE org_id = p_org_id)
      AND (user_id = v_target_user_id OR lower(email) = v_target_email_lc)
    RETURNING 1
  )
  SELECT count(*) INTO v_camp_count FROM del;

  -- 7. Delete pending/expired invites for this email in this org.
  WITH del AS (
    DELETE FROM smbsec1.invites
    WHERE org_id = p_org_id AND lower(email) = v_target_email_lc
    RETURNING 1
  )
  SELECT count(*) INTO v_inv_count FROM del;

  -- 8. Delete org_members row (frees is_it_executor slot automatically).
  IF v_target_user_id IS NOT NULL THEN
    DELETE FROM smbsec1.org_members
    WHERE org_id = p_org_id AND user_id = v_target_user_id;
  END IF;

  -- 9. Anonymise audit_logs entries about the target.
  UPDATE smbsec1.audit_logs
  SET actor_user_id = NULL, actor_email = NULL
  WHERE org_id = p_org_id
    AND (actor_user_id = v_target_user_id OR lower(actor_email) = v_target_email_lc);

  -- 10. Insert member_removed audit row. Stores SHA-256 hash of email (Security §2).
  INSERT INTO smbsec1.audit_logs (org_id, actor_user_id, event_type, payload)
  VALUES (
    p_org_id,
    p_actor_user_id,
    'member_removed',
    jsonb_build_object(
      'removed_email_hash', encode(digest(v_target_email_lc, 'sha256'), 'hex'),
      'removed_user_id', v_target_user_id,
      'was_it_executor', COALESCE(v_was_it_exec, false),
      'responses_deleted', v_resp_count,
      'campaigns_deleted', v_camp_count,
      'invites_deleted', v_inv_count
    )
  );

  RETURN QUERY SELECT true, v_target_user_id, v_resp_count, v_inv_count, v_camp_count, NULL::text;
EXCEPTION WHEN OTHERS THEN
  -- Implicit rollback of the whole function — Postgres rolls back all above writes.
  RETURN QUERY SELECT false, v_target_user_id, 0, 0, 0, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION smbsec1.delete_member_with_data(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION smbsec1.delete_member_with_data(uuid, text, uuid) TO service_role;
```

**Key design choices:**
- **Transactional.** Postgres runs the function body in one transaction; any raised exception rolls back all writes. No half-deletion state possible.
- **Hash, not plain email, in audit row.** Matches Security expert's strict GDPR reading (§2). Provable deletion occurred; does not re-introduce PII.
- **Audit entries about target are pseudonymised**, not deleted, so the org retains "an owner removed someone on day X" without keeping the target's identity.
- **Campaign recipients are hard-deleted.** Concedes BA's "delete vs anonymise" question in Round 1. Trade-off: old campaign click-counts become inconsistent. Mitigation: surface a small footer "totals exclude removed members" on the campaign detail page. Alternatively, Product Team can vote to anonymise in Round 3; the RPC change would be two lines.
- **Enum of error codes** (`not_authorized`, `cannot_remove_self`, `cannot_remove_last_owner`) → maps to HTTP 403 / 422 in the API route wrapper.
- **`pgcrypto.digest`** must be enabled. Add `CREATE EXTENSION IF NOT EXISTS pgcrypto;` at top of the migration if it isn't already.

**API route:** `DELETE /api/orgs/members` with body `{ email: string }`. The route validates JWT, resolves `org_id` from membership, then invokes `rpc("delete_member_with_data", ...)` with `p_actor_user_id = user.id`. Translates `error` strings to HTTP codes.

---

## 8. F-041 — IT Executor reassignment RPC (SQL)

**Product decision (locked, matching UX + BA recommendations):** responses are **preserved on the assessment, not on the user**. Old IT Exec's IT-track answers remain in `assessment_responses` (unchanged `user_id` of the authoring user). The new IT Exec sees the existing answers and can edit them; the old IT Exec loses access via role-based filtering in `/api/checklist`.

**Migration:** `docs/sql/024_reassign_it_executor.sql`

```sql
CREATE OR REPLACE FUNCTION smbsec1.reassign_it_executor(
  p_org_id          uuid,
  p_new_user_id     uuid,
  p_actor_user_id   uuid
) RETURNS TABLE (
  success                  boolean,
  previous_user_id         uuid,
  response_count_transferred int,
  error                    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = smbsec1, public
AS $$
DECLARE
  v_is_admin    boolean;
  v_prev_uid    uuid;
  v_new_member  record;
  v_assessment  uuid;
  v_resp_count  int := 0;
BEGIN
  -- 1. Actor must be owner.
  SELECT role = 'org_admin' INTO v_is_admin
  FROM smbsec1.org_members
  WHERE org_id = p_org_id AND user_id = p_actor_user_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN QUERY SELECT false, NULL::uuid, 0, 'not_authorized'::text;
    RETURN;
  END IF;

  -- 2. New assignee must be an accepted (non-pending) member of this org.
  SELECT user_id, is_it_executor INTO v_new_member
  FROM smbsec1.org_members
  WHERE org_id = p_org_id AND user_id = p_new_user_id;

  IF v_new_member IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 0, 'new_assignee_not_in_org'::text;
    RETURN;
  END IF;

  -- 3. Find current IT Executor (may be NULL).
  SELECT user_id INTO v_prev_uid
  FROM smbsec1.org_members
  WHERE org_id = p_org_id AND is_it_executor = true
  LIMIT 1;

  -- 4. No-op if same user.
  IF v_prev_uid = p_new_user_id THEN
    RETURN QUERY SELECT true, v_prev_uid, 0, NULL::text;
    RETURN;
  END IF;

  -- 5. Count transferred responses for audit payload.
  SELECT id INTO v_assessment FROM smbsec1.assessments
  WHERE org_id = p_org_id AND status = 'active' LIMIT 1;

  IF v_assessment IS NOT NULL AND v_prev_uid IS NOT NULL THEN
    SELECT count(*) INTO v_resp_count
    FROM smbsec1.assessment_responses r
    JOIN smbsec1.assessment_items i ON i.id = r.assessment_item_id
    WHERE r.assessment_id = v_assessment
      AND r.user_id = v_prev_uid
      AND i.track = 'it_baseline';
  END IF;

  -- 6. Flip flags atomically (partial unique index ensures only one is_it_executor=true).
  -- Must unset old FIRST, then set new, to avoid triggering the unique index.
  IF v_prev_uid IS NOT NULL THEN
    UPDATE smbsec1.org_members
    SET is_it_executor = false
    WHERE org_id = p_org_id AND user_id = v_prev_uid;
  END IF;

  UPDATE smbsec1.org_members
  SET is_it_executor = true
  WHERE org_id = p_org_id AND user_id = p_new_user_id;

  -- 7. Audit entry (Security expert §3).
  INSERT INTO smbsec1.audit_logs (org_id, actor_user_id, event_type, payload)
  VALUES (
    p_org_id,
    p_actor_user_id,
    'it_executor_reassigned',
    jsonb_build_object(
      'previous_it_executor_user_id', v_prev_uid,
      'new_it_executor_user_id', p_new_user_id,
      'active_assessment_id', v_assessment,
      'response_count_transferred', v_resp_count
    )
  );

  RETURN QUERY SELECT true, v_prev_uid, v_resp_count, NULL::text;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, v_prev_uid, 0, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION smbsec1.reassign_it_executor(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION smbsec1.reassign_it_executor(uuid, uuid, uuid) TO service_role;
```

**Design notes:**
- Unset-then-set ordering is **critical**. The partial unique index `ux_one_it_executor_per_org` would reject the second UPDATE if we tried to set new before unsetting old.
- `assessment_responses` rows are **not touched**. Their `user_id` still points at the old author. The F-041 test assertion "dashboard track totals unchanged before vs after" is automatically true because the helper's `denominator` recomputes against `scopedUserIds` using `is_it_executor` as-of-now — the denominator shifts by zero if the old and new member were both IT-scope-eligible, which they are (the old exec drops IT items from their scope, the new exec adds them; net zero).
- Pending invitees are rejected (`new_assignee_not_in_org`). UX flagged this as an open question; I'm hard-coding the conservative answer. Can revisit in refinement.

---

## 9. F-043 — multi-user test harness

**Helper signature:**
```ts
// frontend/tests/helpers/multiUser.ts
import type { Browser, BrowserContext, Page } from "@playwright/test";

export type RosterMember = {
  user: TempUser;
  role: "org_admin" | "employee";
  isItExecutor: boolean;
  context: BrowserContext;
  page: Page;            // signed in, landed on /workspace
};

export type RosterSpec = {
  orgNamePrefix?: string;           // default "E2E-PI14-"
  owner: { isItExecutor?: boolean }; // default true
  employees?: Array<{
    isItExecutor?: boolean;
    displayName?: string;
  }>;
};

export type RosteredOrg = {
  org: IsolatedOrg;
  assessmentId: string;
  owner: RosterMember;
  employees: RosterMember[];
  allMembers: RosterMember[];
  // Deterministic seed: bypass UI clicks, insert responses via service-role.
  seedResponse: (user_id: string, item_id: string, status: "done" | "unsure" | "skipped") => Promise<void>;
  cleanup: () => Promise<void>;
};

export async function createOrgWithMembers(
  browser: Browser,
  spec: RosterSpec,
): Promise<RosteredOrg>;
```

**Cleanup responsibilities (non-negotiable — BA §4 Must-have #5):**
1. Close every Playwright `BrowserContext` created.
2. Delete all `assessment_responses` for members in scope.
3. Delete assessment(s) for the org.
4. Delete `org_members` rows.
5. Delete the org row.
6. Delete each temp auth user (`auth.admin.deleteUser`).
7. Best-effort: `DELETE FROM smbsec1.invites WHERE email LIKE 'e2e-%@%'` — paranoid sweep.

Expose `cleanup` as an async function; tests call from `afterEach`. Errors inside cleanup are caught and logged, never thrown (so one broken test doesn't block others).

**Additional infrastructure:**
- **Nightly sweeper** — GitHub Action `cleanup-e2e-orgs.yml` runs `DELETE FROM smbsec1.orgs WHERE name LIKE 'E2E-PI14-%' AND created_at < now() - interval '24 hours' CASCADE;`. Safety net for crashed tests.
- **BA §4 question answered:** **Same Supabase project, NOT a dedicated one.** Rationale:
  1. Creating a second Supabase project requires new env vars in Vercel, new CI secrets, schema drift risk, and double the maintenance.
  2. Org-name prefix (`E2E-PI14-*`) + per-test teardown + nightly sweeper + foreign-key cascade on org delete = sufficient isolation. Stefan's own data uses real-looking org names, never `E2E-PI14-*`.
  3. Our `smbsec1` schema has strict foreign keys — deleting an org row cascades into everything.
  4. Test users use `e2e-*@playwright.test` mailbox pattern (already convention in `createTempUser`), impossible to collide with real users.

Explicit teardown + prefix isolation is the cheapest correct answer. Revisit if we ever reach 100+ concurrent CI runs.

**~200 LOC total** in `multiUser.ts` + ~50 LOC in `expectDashboardCounts.ts` + one new spec file `frontend/tests/dashboard-math.spec.ts` exercising F-038/F-039/F-040 parity.

---

## 10. PI grouping — I concede to 2 PIs

My Round 1 proposed 1 PI / 2 iterations. PM, Security, UX, and BA all independently proposed 2 PIs. I concede.

**Key reason for conceding:** F-031 (AI chat) is materially larger than I estimated in Round 1. Security's threat model (§1) legitimately requires F-012 to land, soak in PROD for at least one iteration, and be observed abuse-free before the chat endpoint is exposed. Shoving F-031 into the same PI as F-038/F-039/F-040 risks either (a) rushing F-012 guardrails and shipping a cost-abuse vector, or (b) delaying the dashboard fixes waiting for chat UI review. Neither is acceptable.

**Adjusted PI structure:**

**PI 14 — "Numbers you can trust" (2 iterations)**

*Iteration 1 — foundation + correctness:*
- F-043 (multi-user harness) — must land first or the rest cannot be verified.
- F-012 (persistent rate limit + guardrails + Anthropic disclosure in privacy page) — lands now, soaks in PROD during iteration 2. F-031 does NOT ride along.
- F-038 (dashboard math + pill order)
- F-039 (workspace home `stats.me`)
- F-040 (security report shared helper)
- F-034 (employee empty-state CTA) — trivial, piggybacks on F-038's page.
- F-023, F-024, F-025 — trivial copy/nav fixes, piggyback. **Mandatory BA screenshot proof** (PM §3 Q7) before Done, because PI 13 already claimed them once.
- F-037, F-042 — trivial copy fixes, piggyback.

*Iteration 2 — team lifecycle + math-dependent features:*
- F-033 (GDPR member deletion via `delete_member_with_data` RPC)
- F-041 (IT Executor reassignment via `reassign_it_executor` RPC)
- F-035 (pending invitees on dashboard — coupled to F-038 denominator decision)
- F-036 (IT Executor awareness banner — trivial)

**PI 14 exit:** Stefan re-runs his 2026-04-11 test script. All findings resolved. F-012 has been live 1+ iterations with zero flagged abuse events.

**PI 15 — "AI conversation + mobile"**
- F-031 (interactive AI chat endpoint + UI) — builds on F-012.
- F-009 (mobile responsiveness audit) — runs alongside F-031 because chat-on-mobile is the hardest layout constraint.

**PI 16 — Business Test + regression fixes.** Standard post-PI BA pass.

This matches BA's "F-041 after F-038", Security's "F-012 one iteration soak", PM's "F-023/F-024/F-025 re-verified with screenshots", and UX's "don't split F-038/F-039/F-040". Consensus reached.

---

## 11. Phantom-Done root cause analysis (F-023, F-024, F-025)

**How did PI 13 claim F-023/F-024/F-025 Done without shipping them?**

I inspected `git show --stat fee865e` (the PI 13 fix commit) and cross-referenced to current code.

**Finding:** The commit `fee865e` modified 20 files. `accept-invite/page.tsx` was touched but only for **2 lines** (unrelated one-line fix per the commit message). `login/page.tsx` was touched but only for **2 lines** ("Sending to:" → "Sent to:"). Neither file received the F-023 nav scaffolding nor the F-024 dynamic heading.

**Conclusion: the code was never written.** This is not "a file got missed from `git add`" — the commit message lists exactly what was done (F-026, F-027, F-028, F-029, F-030) and F-023/F-024/F-025 are **not in the commit message**. They were listed in `docs/product/backlog.md` as "moved into PI 14", but somewhere between backlog editing and features.md updating, their status in features.md appears to have drifted to `Done` without the code actually shipping — the backlog and features.md desynced.

**Contributing process failure:**
1. The PI 13 "Done" status was set in `features.md` based on the commit message listing features implemented, but **the human-readable cross-check against Stefan's Finding List wasn't performed** — so three items Stefan had reported as bugs were never queued as in-scope for PI 13 at all, and when the feature list was bulk-promoted to Done at commit `be6db93` ("docs: PI 13 features → Done"), the three stragglers got swept in.
2. No BA browser verification of F-023/F-024/F-025 specifically — the BA pass focused on F-026..F-030 which were the real PI 13 scope.

**Prevention for PI 14:**
- Process change (add to `team_rules_product_team.md` in iteration 1f): **every feature flipped to Done must have a BA screenshot in the PR body or in `docs/product/pi14/test_results.md`.** PM already proposed this; I second it.
- Technical change: add a pre-commit hook (or lint rule) that cross-checks features.md status transitions against the commit diff. Overkill for now but worth filing as a backlog item.
- The three features must be re-verified in browser by BA in PI 14 iteration 1 before they flip to Done. **No shortcut.**

---

## 12. Answers to my Round 1 open questions

1. **F-038 AC-7** — LOCKED option (a), answered in §1.
2. **F-035 × F-038 denominator** — pending invitees contribute `awarenessCount` (option A) to `denominator`, consistent with F-038. The counter-intuitive "percent drops on invite" is acceptable because the dashboard shows "responses" not "progress" at the top-line; the per-invitee row's 0% bar makes it visually obvious. Revisit if Stefan complains during PI 14 BA pass.
3. **F-031 chat history persistence v2** — do NOT sketch the schema now. Punt to post-PI-15. Premature.
4. **F-033 campaign_recipients delete vs anonymise** — hard-delete in the RPC (§7). Concedes historical inconsistency in favour of strict Art. 17 compliance per Security expert §2.
5. **F-041 response ownership** — LOCKED: responses stay on the assessment, tied to the authoring `user_id`. No re-bind. Partial unique index on `(assessment_item_id, user_id)` is preserved. Dashboard math is unaffected because `computeStats` uses the current `is_it_executor` flag to decide eligibility.
6. **F-012 rate limit buckets** — per-bucket limits. Starting values in §6. Tunable later via env vars if needed.
7. **F-042 "contact us" copy** — concede to PM's Round 1 §3 Q8 call: **delete the copy, no form.** Ship as a copy-only fix in PI 14 iteration 1. Feedback form is scope creep for a 30-minute tool.

## 13. Open questions remaining for Round 3 / refinement

1. **UX §9 Q3** — dashed-avatar a11y contrast for pending invitees. Must be validated against real design tokens; if fails WCAG AA, switch to grey-100 fill. UX to confirm in refinement.
2. **Security §8 Q1** — org-level AI opt-in toggle? I recommend deferring (not a PI 14 item) but it should be a new backlog entry F-044 flagged for PI 15 refinement.
3. **Security §8 Q6** — CSP header on checklist page before F-031 ships. Agree, add to F-031 AC as a hardening sub-task.
4. **Round 1 unresolved** — BA §7 Q7 interaction with my §7 RPC: the RPC hard-deletes `campaign_recipients`. If Round 3 decides anonymise instead, two-line change to the RPC body. Security expert should confirm the anonymisation alternative in Round 3 or sign off on delete.
5. **UX §9 Q8** — reassignment to pending invitee. My RPC (§8) rejects this. UX can advocate for "takes effect on accept" in refinement; would require a new `pending_reassignment` column on `invites`. Non-trivial. I vote to keep the restriction.

---

**End of Round 2 Architect input.** Ready for Round 3 convergence: team locks scope, I produce the IT Dev brief, and iteration 1 begins.
