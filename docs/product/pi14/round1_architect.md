# PI 14 ROADMAP — Round 1: Architect

**Author:** Architect agent
**Date:** 2026-04-11
**Purpose:** Code-traced reality check for the Product Team. Other agents should reason from these traces in Round 2 rather than from documented intent.

---

## A. Code-traced reality check

### A.1 Dashboard math (F-038, F-039 source of truth)

**File:** `frontend/app/api/dashboard/route.ts`
**File:** `frontend/app/workspace/dashboard/page.tsx`

#### A.1.1 Top-line `stats.percent`

`frontend/app/api/dashboard/route.ts:122-135`:

```ts
const done    = allResponses.filter((r) => r.status === "done").length;
const unsure  = allResponses.filter((r) => r.status === "unsure").length;
const skipped = allResponses.filter((r) => r.status === "skipped").length;

// Calculate role-adjusted total: IT executors see all items, others see only awareness
const totalPossible = scopedUserIds.reduce((sum, uid) => {
  const member = allMembers.find((m) => m.user_id === uid);
  return sum + (member?.is_it_executor ? totalItems : awarenessCount);
}, 0);
const percent =
  totalPossible === 0
    ? 0
    : Math.round(((done + unsure + skipped) / totalPossible) * 100);
```

**Meaning:** `totalPossible` is the sum of per-member item totals — IT executors contribute the full `totalItems`, non-executors contribute only `awarenessCount`. For Stefan's example (1 owner-IT-executor, 1 employee, 25 IT + 11 awareness = 36 total items):
- owner contribution = 36
- employee contribution = 11
- `totalPossible` = **47**
- `percent` is computed with denominator 47.

**Bug 1 (F-038 AC-3 / AC-4 / AC-5):** the numerator `done + unsure + skipped` treats `unsure` as progress. Stefan wants `(done + skipped) / totalPossible` on the track bars and explicitly wants the top-line to follow the same "resolved = done + not-applicable" semantics. Current code counts `unsure` toward percent on both top-line and per-track.

#### A.1.2 Per-track `trackStats()`

`frontend/app/api/dashboard/route.ts:138-156`:

```ts
function trackStats(itemIds: Set<string>, trackName: string) {
  const trackResponses = allResponses.filter((r) => itemIds.has(r.assessment_item_id));
  const tDone    = trackResponses.filter((r) => r.status === "done").length;
  const tUnsure  = trackResponses.filter((r) => r.status === "unsure").length;
  const tSkipped = trackResponses.filter((r) => r.status === "skipped").length;
  // Role-adjusted: only count members who can see this track
  const members = allMembers ?? [];
  const membersWhoSeeTrack = trackName === "it_baseline"
    ? scopedUserIds.filter((uid) => members.find((m) => m.user_id === uid)?.is_it_executor)
    : scopedUserIds; // all members see awareness
  const tTotal = itemIds.size * membersWhoSeeTrack.length;
  return {
    total: itemIds.size,
    done: tDone,
    unsure: tUnsure,
    skipped: tSkipped,
    percent: tTotal === 0 ? 0 : Math.round(((tDone + tUnsure + tSkipped) / tTotal) * 100),
  };
}
```

**Stefan's example applied to IT Baseline track** (25 items, 1 IT-exec in scope):
- `tTotal` = 25 × 1 = 25
- Done=7, Unsure=3, Skipped=3 → current formula: `(7+3+3)/25 = 13/25 = 52%` ← **wrong**
- Stefan's correct formula: `(7+3)/25 = 10/25 = 40%`

**Awareness track** (11 items, 2 members see awareness = both owner and employee):
- `tTotal` = 11 × 2 = 22
- With owner Done=4, Not-yet=1, N/A=1 and employee nothing: `(4+1+1)/22` current → Stefan wants `(4+1)/22` (BUT Stefan's written example says 5/11 not 5/22 — see A.1.3).

**Note (open question for Round 2):** the AC-5 wording `shows 5/11` suggests Stefan is thinking about items, not member-items. Today `tTotal = itemIds.size * membersWhoSeeTrack.length` — i.e. per-member. Stefan's example numerator 5 assumes one person answered; the "5/11" phrasing suggests he is thinking of the track in **item-space**, not **member-item-space**. The Product Team needs to decide (F-038 AC-7): `(a)` member-item-space (current) or `(b)` item-space (unique checklist items where ANY scoped member has answered). Either way, the top-line, track bars, workspace-home "My checklist", and security report must all use the SAME definition (F-038 AC-7, F-039, F-040).

**Line 154 is exactly where Stefan's track-math fix lives.** Change to `((tDone + tSkipped) / tTotal) * 100`.

#### A.1.3 Denominator flicker (F-038 AC-6 — 18/47 ↔ 18/36)

`frontend/app/workspace/dashboard/page.tsx:182-185`:

```tsx
<div className="flex justify-between text-xs text-gray-500 mb-1">
  <span>{stats.done + stats.unsure + stats.skipped} / {members.length > 0 ? members.reduce((s, m) => s + m.total, 0) : stats.total} responses</span>
  <span>{stats.percent}%</span>
</div>
```

**Root cause of flicker:** the denominator is chosen CLIENT-SIDE based on `members.length`:
- If `members.length > 0`: denominator = `members.reduce((s, m) => s + m.total, 0)` = 36 + 11 = **47**
- Else: denominator = `stats.total` = `totalItems` = **36**

**But in the API (line 214):** `stats.total = totalItems = 36` (the unique checklist item count, NOT `totalPossible`). Meanwhile `stats.percent` on line 132 is computed with denominator `totalPossible = 47`. So the server sends an INCONSISTENT pair: percent is 47-based but total is 36-based.

**Resulting bug:** on first render, the page has `stats` but `members` not yet fetched → shows `18 / 36` (or similar). Then React re-renders with `members` populated → jumps to `18 / 47`. That's the **18/36 ↔ 18/47 flicker** Stefan observed. (Note: `members` and `stats` arrive in the same response, but React rendering order / any component state-setting ordering can briefly flash one before the other.)

**Fix:** the API must return a single authoritative denominator (call it `stats.total_possible` or `stats.denominator`) that MATCHES whichever definition F-038 AC-7 picks. The page must use exactly that field, nothing else.

#### A.1.4 Per-member breakdown

`frontend/app/api/dashboard/route.ts:183-199`:

```ts
const memberTotal = isItExecutor ? totalItems : awarenessCount;
// ...
percent:
  memberTotal === 0
    ? 0
    : Math.round(((mDone + mUnsure + mSkipped) / memberTotal) * 100),
```

**Bug:** same `done+unsure+skipped` inflation. Member percent also needs to drop `unsure` from the numerator when we ship F-038. **Side-effect to flag for UX:** member drill-down today reports "X% done" where X includes unsure; after the fix the personal percent will drop, which may confuse existing users. UX needs to label this clearly.

---

### A.2 Workspace home "My checklist" isolation (F-039)

**File:** `frontend/app/workspace/page.tsx`

Line 22-44:

```tsx
useEffect(() => {
  if (!token) return;
  const fetches: Promise<void>[] = [
    apiFetch<{ assessments: { status: string }[] }>("/api/assessments", token)
      .then(({ assessments }) => {
        setHasActiveAssessment(assessments.some((a) => a.status === "active"));
      }),
    apiFetch<{ stats: { percent: number }; cadence: { status: string; last_completed_at: string | null } }>("/api/dashboard", token)
      .then(({ stats, cadence: c }) => {
        setCadence(c);
        setChecklistPercent(stats.percent);
      })
      .catch(() => {}),
  ];
  ...
```

And line 115-120:

```tsx
<WorkspaceCard
  href="/workspace/checklist"
  title="My checklist"
  description="Work through your assigned security items."
  progress={checklistPercent}
/>
```

**Confirmed:** `checklistPercent` is literally `stats.percent` from `/api/dashboard`, which for an `org_admin` caller is the **org-wide aggregate** (see A.1.1 — `scopedUserIds` = all org members when caller is org_admin). So when the employee answers an awareness item, the owner's `stats.percent` drops/climbs, which moves the owner's "My checklist" bar. **Stefan's reported bug is exactly this.**

**Architectural options:**

1. **Option A — new endpoint `GET /api/checklist/me/progress`.** Cleanest separation; lightweight. Query only the caller's responses against the caller's role-scoped item set.
2. **Option B — extend `/api/dashboard` with a `scope` query param.** `/api/dashboard?scope=me` returns the exact same shape but restricts `scopedUserIds` to `[user.id]`, dropping the member breakdown.
3. **Option C — always include `stats.me` in the existing `/api/dashboard` response** (a sibling object), so workspace home uses `stats.me.percent` and the dashboard page keeps using `stats.percent`.

**Recommendation:** **Option C.** Rationale:
- Workspace home is already calling `/api/dashboard` for the cadence indicator. Adding a second endpoint doubles round-trips and cold-start latency.
- `scope=me` (Option B) makes the API polymorphic — harder to cache, harder to reason about.
- Option C lets the dashboard page itself display "Your progress" next to "Team progress" later if we want to, with zero extra work.
- DB query cost is minimal: we already loaded all responses; filtering to `user_id === caller` in JS is free.

**API shape change:**
```ts
stats: {
  // existing org-aggregate:
  total_possible: number,  // renamed from "total" to avoid confusion
  done, unsure, skipped,
  resolved: number,        // = done + skipped (new, per F-038 AC-2)
  percent: number,         // computed from (done + skipped) / total_possible
  by_track: { ... },

  // NEW for F-039:
  me: {
    total_possible: number,    // caller's own item set (awareness only, or full, depending on is_it_executor)
    done, unsure, skipped,
    resolved: number,
    percent: number,
    by_track: { ... },
  }
}
```

---

### A.3 F-023, F-024, F-025 — NOT delivered in PI 13

**Backlog claim:** `docs/product/backlog.md:301-303` lists F-023/F-024/F-025 as "moved into PI 14" which is correct, but Stefan flagged these as "still pending despite backlog claiming Done in PI 13". Features.md confirms **all three still have status `Created`** (lines 360, 378, 395) — they were never shipped.

**Code evidence:**

1. **F-023 expired-invite navigation** — `frontend/app/accept-invite/page.tsx:130-141`:

```tsx
if (!inviteInfoLoading && inviteInfoError) {
  return (
    <main className="max-w-md mx-auto px-4 py-20">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
        <p className="font-medium text-amber-800">Invitation not available</p>
        <p className="mt-1 text-sm text-amber-700">
          This invitation has expired or has already been used. Ask your administrator to send a new invite link.
        </p>
      </div>
    </main>
  );
}
```

No header, no logo, no "Back to home", no link to login. User is fully stranded. F-023 is still an open bug.

2. **F-024 login heading** — `frontend/app/login/page.tsx:150`:

```tsx
<h1 className="text-2xl font-bold text-gray-900">Log in</h1>
```

Hard-coded "Log in" regardless of whether the user arrived from "Sign up free" or anywhere else. F-024 is still an open bug.

3. **F-025 copy inconsistencies** — out of scope to re-verify every string in Round 1, but since it was never delivered, it must be re-included.

**Action for Product Team Round 2:** treat these three as confirmed-pending. They are low-risk and can piggyback on whichever PI 14 iteration is closest.

---

### A.4 AI chat architecture (F-031)

**File:** `frontend/app/api/guidance/route.ts`

Current one-shot implementation is lines 45-115 (see earlier trace). The prompt is built once per request, there's no `messages` history, no chat state, and the response is cached with a naive `item_title + platform + question` key:

```ts
const cacheKey = `${body.item_title}::${platform ?? "unknown"}::${body.question ?? ""}`;
```

**Problems for chat migration:**
1. Anthropic's `messages.create` is inherently multi-turn — we already use it. Just need to pass `messages: [...history, { role: "user", content: newMessage }]`.
2. The per-request cache is fine for the "initial AI message" (AC-2 — same as today's one-shot) but must be bypassed for follow-up turns.
3. Rate limiting today is in-memory (lines 23-35), wipes on cold start. **F-031 AC-5 requires persistent rate limit** — hard dependency on F-012 (A.5 below).
4. The system prompt already scopes to the checklist item ("Only discuss security topics related to this specific checklist item" — line 148). AC-4 asks for harder scoping; need to reinforce with explicit refusal instructions.

**Recommended new endpoint shape:**

```
POST /api/guidance/chat

Request body:
{
  item_id: string,              // assessment_item_id (NOT item_title — items are unique per assessment)
  item_title: string,           // still needed for system prompt
  item_description?: string,
  item_why?: string,
  item_steps?: string[],
  history: Array<{ role: "user" | "assistant", content: string }>,
  message: string,              // new user message, max 500 chars (F-012)
}

Response:
{
  reply: string,
  remaining_today: number,      // from persistent rate limit (AC-5 per-item-per-day counter)
}
```

**Where does history live?** Stefan said "session lifetime is fine for v1" (F-031 AC-3). **Recommendation: client-only state** in React (`useState`) per checklist-item drawer. Rationale:
- No new DB table → zero migration risk.
- Acceptable for v1: F-031 AC-3 explicitly says "does NOT need to persist across reloads".
- Keeps the endpoint stateless — the client re-sends full history on each turn. At ~5-10 turns × ~300 words, payload stays under 10KB.
- If we later want cross-session persistence, the exact same endpoint signature can be saved server-side without breaking clients.

**Cost/risk:** sending full history each call means token usage grows quadratically across the conversation. Mitigation:
- Truncate `history` to the last N turns (e.g. 10) client-side before sending.
- System prompt already caps output to 300 words; cap input `message` to 500 chars (F-012).
- Persistent rate limit: 20 messages per item per day (F-031 AC-5) — cold-start-safe.

**Legacy endpoint:** keep `/api/guidance` for the **first turn / initial guidance** (the "same level as today's one-shot", AC-2) OR deprecate it and have the chat endpoint take an empty `history` for the first call. **I recommend deprecation** — one code path, not two.

---

### A.5 F-012 rate limit persistence

**File:** `frontend/lib/api/rateLimit.ts`

Whole file is an in-memory `Map<string, Entry>`:

```ts
const store = new Map<string, Entry>();
const WINDOW_MS = 60_000;    // 1 minute
const MAX_REQUESTS = 60;     // per window
```

Plus a stale cleanup on a 5-minute `setInterval`.

**Problems:**
1. **Vercel serverless cold starts wipe the map.** An attacker can trigger a new cold start (or hit different regions) and get fresh quota every few minutes.
2. The `setInterval` leaks when the lambda is frozen/thawed.
3. No per-feature granularity — today it's the same 60 req/min limit for dashboard, guidance, invites, etc.
4. `/api/guidance` already has its own separate in-memory limiter (the `userRequests` map in `guidance/route.ts:22-35`) because the shared one wasn't granular enough.

**Recommended Supabase-backed rate limit:**

```sql
-- Migration 022_rate_limits.sql
CREATE TABLE smbsec1.rate_limits (
  key        text        NOT NULL,    -- e.g. "guidance:<user_id>:<item_id>:<day>"
  bucket     text        NOT NULL,    -- feature name: "guidance", "dashboard", etc.
  count      int         NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key)
);

CREATE INDEX idx_rate_limits_window ON smbsec1.rate_limits (window_start);

-- No RLS policies: only service-role writes.
ALTER TABLE smbsec1.rate_limits ENABLE ROW LEVEL SECURITY;
```

**Increment logic** (use `upsert` + atomic `+1`):
```ts
// Pseudo-code — use a Postgres function for atomicity
const { data } = await supabase.rpc("rate_limit_increment", {
  p_key: key,
  p_bucket: "guidance",
  p_window_ms: WINDOW_MS,
  p_max: MAX_REQUESTS,
});
// Returns { allowed: boolean, count: number, reset_at: timestamptz }
```

Postgres function ensures the read-check-write is atomic under concurrent callers. Window handling: if `now - window_start > WINDOW_MS`, reset `count = 1, window_start = now` in the same function.

**Cleanup:** a daily cron (Vercel cron or Supabase pg_cron) deletes rows where `window_start < now - 7 days`.

**Cost:** one extra DB round-trip per API call. At current scale this is negligible (< 5ms). For hot paths we could add a short in-memory LRU in front (30s TTL) to coalesce bursts — but **do NOT ship that optimisation in F-012**; correctness first.

**Critical sequencing constraint:** F-012 must ship **before or with** F-031 (per F-031 dependency note in features.md line 521). Without persistent rate limiting, an AI chat endpoint is an open runaway-cost vector.

---

### A.6 F-033 GDPR cascade deletion — affected tables

Source of truth: `docs/sql/reset_and_create_all.sql` + migrations 001-021.

**Tables holding rows that reference a single user within a specific org:**

| Table | Reference column | Current `ON DELETE` | Needs explicit handling? |
|---|---|---|---|
| `smbsec1.org_members` | `user_id → auth.users(id)` | CASCADE (from auth.users) | **Yes** — we're NOT deleting the auth.users row (user may be in other orgs). Explicit `DELETE FROM org_members WHERE org_id=X AND user_id=Y`. |
| `smbsec1.assessment_responses` | `user_id → auth.users(id)` | CASCADE (from auth.users) | **Yes** — must explicitly delete by `user_id + assessment_id` (scoped to THIS org's assessments). |
| `smbsec1.assessments` | `created_by → auth.users(id)` | NO CASCADE | **No delete** — the assessment belongs to the org, not the member. Leave it but check orphaned `root_user_id` if set to removed user (nullify). |
| `smbsec1.orgs` | `created_by → auth.users(id)` | CASCADE (from auth.users) | **Special case** — if owner leaves, don't delete the org. Either block deletion (last owner protection, AC-8) or reassign `created_by` to another owner. |
| `smbsec1.invites` | `invited_by`, old `manager_user_id` | CASCADE (from auth.users) | **Yes** — pending invites to the user's email must be deleted (AC-2). Invites created BY the removed user can stay (reassign `invited_by` or pseudonymise). |
| `smbsec1.campaigns` | `created_by → auth.users(id)` | NO CASCADE | Keep — campaigns belong to the org. Pseudonymise `created_by` if policy requires. |
| `smbsec1.campaign_recipients` | `user_id → auth.users(id)`, plus plain-text `email` | NO CASCADE | **Yes** — delete or anonymise rows where `user_id` matches the removed user OR `email` matches (covers pending-invite case). |
| `smbsec1.audit_logs` | `actor_user_id` (no FK), `actor_email` (plain text) | NONE (no FK on purpose — survives org CASCADE) | **Pseudonymise** — set `actor_user_id = null`, `actor_email = null`. Keep the row for regulatory purposes but strip PII. Also add a `member_removed` audit row for the deletion itself (AC-7). |
| `smbsec1.user_checklists` (legacy) | `user_id` | CASCADE | Leave — this is pre-org data; a cross-org user may have a row. Only delete if we know they're fully leaving. |

**Critical subtlety: `is_it_executor` flip (AC-9)**
The removed user may be the org's IT Executor. The partial unique index `ux_one_it_executor_per_org` only exists where `is_it_executor = true`. Deleting the `org_members` row implicitly frees the slot. UI must then update `hasItExecutor` on workspace home (already reactive — it queries `/api/orgs/members`).

**Critical subtlety: email-based deletion for pending invites (AC-2)**
When removing a pending invite, the target may never have had a `user_id` at all. We need to delete by `email` (case-insensitive) across `invites`. If an orphaned auth.users row exists for that email but has no `org_members` row anywhere, leave it — that's Supabase's problem, not ours.

**Recommended API endpoint signatures:**
- `DELETE /api/orgs/members/[user_id]` — remove accepted member (server-side must verify `org_admin` role, prevent self-removal, prevent last-owner removal).
- `DELETE /api/invites/[invite_id]` — revoke pending invite (already exists? check — if not, add).
- Both must record an `audit_logs` row with `event_type = "member_removed"` or `"invite_revoked"`.

**Test risk:** this is destructive and irreversible. F-043 harness is the right vehicle for the cascade completeness tests — create an org with 3 members, have each answer different items, remove one member, assert (a) their responses gone, (b) other members' responses untouched, (c) dashboard math recomputes without the removed member, (d) security report no longer lists them.

---

### A.7 Multi-user E2E harness (F-043)

**File:** `frontend/tests/helpers/fixtures.ts`

**Good news: most of the harness already exists.** The file has:
- `createTempUser(prefix)` — creates a disposable Supabase auth user (lines 174-190).
- `createIsolatedOrg(name)` — creates a full org with a fresh admin user (lines 207-235).
- `addOrgMember(orgId, user, role, { isItExecutor })` — direct DB insert (lines 238-251).
- `loginWithEmail(page, email)` — full PKCE-aware login flow using admin-generated magic link (lines 58-146). **Crucially this returns after `page.goto(/workspace)` succeeds — it's per-page, so multiple pages can call it in parallel.**
- `startAssessment(orgId, adminUserId)` — snapshots checklist items into a fresh assessment (lines 314-358).
- `deleteOrgData(supabase, orgId)` + `admin.delete()` cleanup (lines 254-290). Note: this is already exercising the F-033 cascade pattern manually — it's a good reference for the real DELETE endpoint.

**What's missing for F-043:**

1. A single composite helper that takes a roster and returns N Playwright contexts/pages, one signed-in per user:

```ts
// New: frontend/tests/helpers/multiUser.ts
import type { Browser } from "@playwright/test";

export type RosterSpec = {
  orgName?: string;
  owner: { isItExecutor?: boolean };
  employees: Array<{ isItExecutor?: boolean; displayName?: string }>;
};

export type RosteredOrg = {
  org: IsolatedOrg;
  assessmentId: string;
  members: Array<{
    user: TempUser;
    role: "org_admin" | "employee";
    isItExecutor: boolean;
    page: Page;      // signed in, sitting at /workspace
  }>;
  cleanup: () => Promise<void>;
};

export async function createOrgWithMembers(
  browser: Browser,
  spec: RosterSpec,
): Promise<RosteredOrg> {
  const org = await createIsolatedOrg(spec.orgName);
  // Update owner IT exec flag if needed (createIsolatedOrg already sets true)
  if (spec.owner.isItExecutor === false) {
    // update org_members row for owner
  }
  const assessmentId = await startAssessment(org.orgId, org.adminUser.id);

  const members: RosteredOrg["members"] = [];
  // Owner context
  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  await loginWithEmail(ownerPage, org.adminUser.email);
  members.push({ user: org.adminUser, role: "org_admin", isItExecutor: spec.owner.isItExecutor ?? true, page: ownerPage });

  // Employee contexts
  for (const emp of spec.employees) {
    const user = await createTempUser("e2e-emp");
    await addOrgMember(org.orgId, user, "employee", { isItExecutor: emp.isItExecutor });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginWithEmail(page, user.email);
    members.push({ user, role: "employee", isItExecutor: !!emp.isItExecutor, page });
  }

  return {
    org,
    assessmentId,
    members,
    cleanup: async () => {
      for (const m of members) {
        if (m.role !== "org_admin") await m.user.delete();
      }
      await org.cleanup();
    },
  };
}
```

2. A reusable assertion helper `expectDashboardCounts(page, { resolved, done, unsureNotYet, notApplicable })` — this is trivial once the dashboard labels are updated by F-038 (AC-1, AC-2).

3. The main blockers for parallelism are **not** in the helpers — they're:
   - Supabase rate limits on `auth.admin.generateLink`: each `loginWithEmail` call hits the admin API once or twice. For N=5 users this is fine; for N=20 it may throttle.
   - The test DB has one shared checklist master, so `startAssessment` snapshots a consistent set — no conflict.

4. **Flakiness risk:** `loginWithEmail` extracts tokens from `redirectRes.headers.get("location")` (line 108) — this has been fragile in PI 11. The harness should expose a retry wrapper.

**Deliverable:** F-043 is ~200 lines of new code in `tests/helpers/multiUser.ts` plus one new spec file. Low-risk.

---

## B. Recommended technical approach per feature

### F-038 — Dashboard math fix

**API changes (`app/api/dashboard/route.ts`):**
1. Rename local variable `totalPossible` → `denominator`. Return it as `stats.denominator` (and keep `stats.total = totalItems` for legacy, but the UI stops using it).
2. Change top-line percent formula: `Math.round(((done + skipped) / denominator) * 100)`.
3. Change `trackStats` line 154: `Math.round(((tDone + tSkipped) / tTotal) * 100)`.
4. Add `resolved: tDone + tSkipped` to each track stat + top-level stats.
5. Decide F-038 AC-7 (member-item-space vs item-space); document the choice in a header comment.

**Page changes (`app/workspace/dashboard/page.tsx`):**
1. Line 183 denominator: use `stats.denominator` directly — remove the `members.length > 0 ? ... : stats.total` ternary. Kills the flicker.
2. Pills order (line 193-198): render Resolved | Done | Not applicable | Unsure-or-Not-yet.
3. Rename "Unsure" → "Unsure / Not yet" in pill labels (per AC-1).
4. Track bar label should say "Unsure / Not yet" in IT-baseline/awareness context per AC-1.

### F-039 — Workspace home "My checklist" isolation

Add `stats.me` to `/api/dashboard` response (see A.2 Option C). In `app/workspace/page.tsx:32`: change `setChecklistPercent(stats.percent)` → `setChecklistPercent(stats.me.percent)`. Done. ~20 lines including the API change.

### F-040 — Report uses same math

`app/workspace/report/page.tsx` already reads `/api/dashboard` directly (line 78). Zero work in the report page beyond updating its local labels/pills to match F-038's renamed fields. AC-5 (dashboard ↔ report equivalence test) is automatically satisfied since they share the same API.

### F-031 — AI chat

- New endpoint `POST /api/guidance/chat` per A.4.
- Client state: per-item message history in a React `useState<Array<{role, content}>>([])`.
- Deprecate `/api/guidance` OR keep it as an alias for empty-history first-turn (migration safety).
- Hard requirement: ships with or after F-012.

### F-012 — Rate limit persistence

- New migration `022_rate_limits.sql` with table + atomic Postgres increment function.
- Refactor `frontend/lib/api/rateLimit.ts` to call the RPC; keep signature (`rateLimit(key) → NextResponse | null`) so no call sites change.
- Deprecate the in-memory `userRequests` map in `guidance/route.ts`; use the shared helper with a distinct bucket `"guidance"`.
- Buckets: `dashboard`, `guidance`, `invites`, `orgs`, etc. Different limits per bucket.

### F-033 — Cascade deletion

- New migration `023_member_removal_audit.sql` — only if we add any new audit_log columns; likely not needed.
- New endpoint `DELETE /api/orgs/members/[user_id]`:
  - Guards: `org_admin` only, cannot remove self, cannot remove last owner, cannot remove if an assessment is actively being modified (optional — discussion).
  - Explicit cascade in a single service-role transaction (pseudocode):
    ```ts
    // 1. Fetch target member (ensure in org)
    // 2. Delete assessment_responses for that user in this org's assessments
    // 3. Delete/anonymise campaign_recipients for that user or email
    // 4. Pseudonymise audit_logs rows about this user (set actor_user_id=null, actor_email=null)
    // 5. Delete org_members row (frees is_it_executor slot)
    // 6. Delete invites where email = target email
    // 7. Insert audit_logs row { event_type: "member_removed", org_id, actor_user_id: caller, details: { removed_email } }
    ```
- Wrap steps 2-6 in a single `rpc("remove_org_member", { ... })` Postgres function for atomicity; client-side multi-step is NOT atomic.
- New endpoint `DELETE /api/invites/[invite_id]` if not already present.
- Team page UI: Remove buttons + confirmation dialog.

### F-043 — Test harness

See A.7. ~200 lines new code, one new spec exercising F-034/F-035/F-038/F-039.

---

## C. Sequencing constraints

**Hard technical dependencies:**

1. **F-012 → F-031** (AI chat depends on persistent rate limit). Do F-012 first or same iteration.
2. **F-038 → F-039, F-040** (math formula/definition must be agreed first). F-038 and F-039 should ship same iteration since they share the `stats.me` shape change. F-040 is automatic once F-038 lands.
3. **F-043 → F-033, F-038, F-039** (cascade test + multi-user math tests NEED the harness). Ship F-043 in iteration 1.
4. **F-034** (employee dashboard CTA) has no blocker — can ship anywhere.
5. **F-035** (pending invites on dashboard) introduces new data to the API response; if done same iteration as F-038, coordinate the `stats.denominator` definition (AC-2 explicitly ties to F-038 AC-7).
6. **F-041** (IT Executor reassignment) — must ship AFTER F-038 because AC-5 requires dashboard math to still add up post-reassignment. Test depends on F-043 harness.
7. **F-023, F-024, F-025, F-037, F-042** — low-risk, no dependencies, can ship anywhere.

**Proposed iteration split (2 iterations, 1 PI):**

- **Iteration 1 (foundation):** F-043 (harness), F-012 (rate limit), F-038 (math), F-039 (my-checklist), F-040 (report auto-follows).
- **Iteration 2 (features + polish):** F-031 (AI chat), F-033 (GDPR delete), F-041 (IT reassignment), F-035 (pending invites), F-034, F-036, F-037, F-023, F-024, F-025, F-042, F-009 (mobile audit — partly cross-cutting, runs throughout).

Rationale: iteration 1 establishes the test harness and fixes the math that every other feature depends on. Iteration 2 is feature-heavy but each item is independent.

---

## D. Risks & gotchas

1. **F-038 AC-7 ambiguity.** Stefan's "5/11" awareness example in F-038 AC-5 contradicts the current `tTotal = items × members` model. Product Team MUST close this in Round 2 before code starts. If we pick item-space (unique items where ANY member answered), existing tests will break and we'll need to re-baseline snapshots.

2. **Member percent drops visibly.** After F-038, a member showing "45% done" (current, unsure counted) may drop to "30%" (fixed). This is correct behaviour but users may think their data was lost. Release notes / in-product banner recommended.

3. **F-033 cascade atomicity.** If the delete is done across 5 DB calls from the Next.js API route, a failure in the middle leaves the org half-deleted. **Must** use a Postgres RPC function to wrap it in a transaction. Client-side Promise.all is NOT atomic.

4. **F-031 token cost explosion.** Chat history grows with each turn; naive implementations can burn through Claude API budget fast. Hard truncate to last 10 turns + enforce rate limit of 20 msgs/item/day (AC-5) BEFORE the chat endpoint is exposed.

5. **F-041 response ownership.** Today `assessment_responses.user_id` is user-keyed. If the product decision is "responses belong to the assessment, not the user", we need a data migration — not just a flag flip. Round 2 decision point.

6. **F-043 multi-context flakiness.** Each new Playwright context is a separate browser — memory footprint grows. For N > 5 users per test, CI may OOM. Cap `employees.length ≤ 4` in v1.

7. **`ANTROPIC_API_KEY` typo.** The codebase uses both `ANTROPIC_API_KEY` and `ANTHROPIC_API_KEY` (line 46 of guidance route). This is pre-existing but if F-031 adds a new endpoint we should fix the fallback or standardise on the correct spelling.

8. **Vercel cold starts + persistent rate limit (F-012).** One extra DB round-trip per request. For `/api/dashboard` specifically, this is on a hot path. If latency becomes noticeable, add a 30s in-memory LRU cache in front of the RPC (but only after correctness is verified — not in F-012's initial scope).

---

## E. Open architectural questions for Round 2

1. **F-038 AC-7:** member-item-space (current, `items × members_in_scope`) vs item-space (unique items where any scoped member answered). Stefan's written example ("5/11 awareness") suggests item-space; current code is member-item-space. **Product Team must choose.** Impacts F-039, F-040, F-043 tests.

2. **F-035 × F-038 denominator.** How do pending invitees contribute to `denominator`? Option A: same as a joined employee (contribute `awarenessCount`). Option B: contribute zero until they join. AC-2 says "consistent with F-038" — which is Option A unless we decide otherwise. Option A means the org percent drops the moment an invite is sent (counter-intuitive). Option B is more intuitive.

3. **F-031 chat history persistence in v2.** V1 is client-only. If we later want cross-device resume, we need a `chat_messages` table. Should we plan the schema now (even if not built)? My vote: yes — sketch it in the F-031 feature doc for forward compatibility.

4. **F-033 anonymise vs delete for `campaign_recipients`.** Campaign stats rely on historical data. Full delete makes the old campaign's "clicked by X" counts inconsistent. Option: set `user_id = null, email = '<removed>'` instead. GDPR-permissible if the row no longer identifies the person. **Product Team + Security Expert call.**

5. **F-041 response ownership semantics.** Are `assessment_responses` owned by the user or by the org's assessment? Current code is user-owned (`user_id NOT NULL`). If the product decision is "reassignment preserves answers", we need to rebind existing responses to the new user_id, which may conflict with the `(assessment_item_id, user_id)` primary key if the new user already has a response. Round 2 needs an explicit merge/overwrite rule.

6. **F-012 rate limit buckets.** Same limits for all features, or per-bucket limits? My recommendation: per-bucket, with sensible defaults (`dashboard: 120/min, guidance: 20/hour, orgs: 30/min, invites: 10/hour`). Needs Product + Security alignment.

7. **F-042 "contact us" copy.** Simple fix or implement a lightweight in-app feedback form? If we pick the form, it adds endpoint + UI + Resend integration. Small but not trivial. Round 2 call.

---

**End of Round 1 Architect input.**
