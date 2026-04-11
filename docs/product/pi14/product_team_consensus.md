# PI 14 + PI 15 Product Team Consensus

**Author:** Product Manager (Round 3 synthesis on behalf of the Product Team)
**Date:** 2026-04-11
**Status:** LOCKED — hand-off to IT Dev Team refinement
**Sources:** Round 1 + Round 2 inputs from PM, UX, Security, Architect, BA (10 files in this folder)

> This document is the source of truth for PI 14 and PI 15. Where anything here contradicts `features.md` or `backlog.md`, this document wins and those files must be updated in refinement (IT Dev Team step 2e) before development begins.

---

## Executive summary

- **Two PIs, not three.** PI 14 = "Numbers you can trust" (data correctness, test harness, trust-critical copy cleanups). PI 15 = "AI conversation and mobile" (interactive chat, mobile audit, final F-012 hardening). A contingent PI 16 only materialises if PI 15 Business Test finds High/Medium defects, per CLAUDE.md §3d.
- **20 features in scope across the two PIs:** F-009, F-012, F-023, F-024, F-025, F-031, F-033, F-034, F-035, F-036, F-037, F-038, F-039, F-040, F-041, F-042, F-043 — plus three AC-level additions (Anthropic privacy disclosure on F-012, SHA-256 email hash on F-033 AC-7, dashed-avatar WCAG check on F-035).
- **F-038 is the anchor.** It is treated as a P1 trust bug, not a polish item. F-038/F-039/F-040 share a single helper (`frontend/lib/dashboard/computeStats.ts`) so the three features cannot diverge again.
- **F-043 ships first.** Iteration 1 of PI 14 lands the multi-user harness before any dashboard-math code is touched. PI 13's phantom-Done failure on F-023/F-024/F-025 is the reason — without the harness we cannot prove the math features actually shipped.
- **Key decisions locked in Round 3:** denominator semantics (Architect Option C — both numbers in one API); pending invitees contribute zero to the denominator; F-033/F-041 in PI 14 Iter 3 (not PI 15); F-036 in PI 14 Iter 3 (stays with awareness UI, not dragged into Iter 2); 3 iterations per PI.

---

## Locked decisions (tie-breaks resolved)

### 1. F-038 AC-7 denominator semantics — **Architect Option C (ship BOTH numbers)**

**Decision.** The `/api/dashboard` response returns `stats.denominator` (per-member sum, Stefan's example = 47) AND `stats.me.denominator` (caller's own item set, Stefan's example = 36 for an IT-exec owner, 11 for an employee). The dashboard top bar binds to `stats.denominator`; the workspace home "My checklist" card binds to `stats.me.denominator`. Per-track bars use their own per-track per-member-sum denominator.

**Rationale for conceding my Round 2 position.** My Round 2 locked option (b) "unique checklist items in caller's viewing context". Architect, UX, and BA all independently converged on Option C: keep option (a) `stats.denominator = 47` as the team number AND add `stats.me = { denominator: 36 }` as the per-caller sibling. Architect's A.1.3 trace proved the 18/36 ↔ 18/47 flicker is not a semantics choice at all — it is a pure client-side bug where `page.tsx:183` picks one denominator while the server computed `percent` against a different one. Once we (a) return a single authoritative `stats.denominator` from the server and (b) use it everywhere in the team view, the flicker dies. Option C is strictly better than my Round 2 option (b) because it costs zero schema work, keeps both numbers Stefan's PDF implicitly asks for (36 for "my checklist", 47 for "team responses"), and makes `stats.me` usable for F-039 with the same call. I concede. Locked.

### 2. F-035 pending invitee contribution — **pending invitees contribute ZERO to the denominator**

**Decision.** Pending invitees do NOT expand `stats.denominator`. Their row on the dashboard renders as `0 / <applicable>` greyed-out (per UX §7), contributes a visible row but no denominator math. The moment an invitee accepts, the join promotes them to a regular member row and their `awarenessCount` (or full set if IT-exec) enters `stats.denominator` on the next fetch.

**Rationale.** Architect's Round 2 §12(2) left this open; Security/BA/UX/PM all landed on "zero contribution" with different words. The counter-argument (Architect's A.2 Option A — invitees contribute `awarenessCount`) causes a counter-intuitive percent drop the moment an owner sends an invite ("sending an invite makes my org less secure"). That is exactly the trust-breaking kind of behaviour F-038 is supposed to fix. BA's canonical fixture in Round 2 §4 uses 47 (no invitee contribution). Lock: **pending invitees = zero denominator contribution until they accept**.

### 3. F-033 / F-041 PI placement — **PI 14 Iteration 3 (conceding to Security, Architect, UX)**

**Decision.** F-033 (GDPR member deletion) and F-041 (IT Executor reassignment) ship in PI 14 Iteration 3, not PI 15 Iteration 1 as my Round 2 had them.

**Rationale for conceding.** Security §9, Architect §10, and UX §10 all converged on "F-033 and F-041 belong in PI 14 because they depend on F-038 math being stable and they are unrelated to the AI chat work that dominates PI 15". Architect specifically calls out that F-041's AC "dashboard math unchanged before/after reassignment" is only provable once F-038 has shipped — so keeping F-041 in PI 14 Iter 3, one iteration after F-038 lands, minimises risk. F-033 is a standalone GDPR compliance item that benefits from the same F-043 harness used by F-038. Moving both out of PI 15 also slims PI 15 down to F-012 remainder + F-031 + F-009, which is the right focus for "AI conversation and mobile". Locked.

### 4. F-036 placement — **PI 14 Iteration 3 (not Iteration 2)**

**Decision.** F-036 (IT Executor awareness banner) ships in PI 14 Iteration 3, alongside F-041. UX §10 pulled it into Iter 2 for "surface cohesion with F-041"; I keep it in Iter 3 because F-041 itself is in Iter 3 — so the cohesion UX wants is preserved, just one iteration later than UX's proposal. Iter 2 stays tightly focused on the dashboard-math quartet (F-038/F-039/F-040/F-035) so BA has a clean "math truth" sweep at the end of Iter 2. Locked.

### 5. Iterations per PI — **3 iterations per PI, both PIs**

**Decision.** PI 14 = 3 iterations. PI 15 = 3 iterations. CLAUDE.md has no hard rule on iteration count; we pick 3 each because it gives one foundation iteration, one feature iteration, and one buffer-and-Business-Test iteration per PI. Architect's Round 1 "1 PI / 2 iter" was too tight and Architect conceded in Round 2 §10. Security's Round 2 §9 said 3+2 or 3+3; 3+3 gives PI 15 the buffer iteration F-031 will need for prompt-injection hardening. Locked.

---

## PI 14 — "Numbers you can trust"

**Theme.** Every number the owner looks at on the dashboard, workspace home, and security report is correct, stable, and matches what is actually in the database. All trust-critical copy cleanups from Stefan's 2026-04-11 test list ship in the same PI so his re-test is a single sweep. Multi-user test harness (F-043) lands first and is the reason we will stop producing phantom-Done features.

### Iteration 1 — Foundation, rate-limit plumbing, copy cleanups

| Feature | 1-line scope |
|---|---|
| **F-043** | Multi-user E2E harness (`createOrgWithMembers`, `expectDashboardCounts`, service-role seeding, `e2e-pi14-` prefix isolation, per-test teardown, nightly sweeper GitHub Action). Blocks every later feature. Ships first. |
| **F-012 (partial)** | Persistent Supabase-backed rate limit (`smbsec1.rate_limits` table + `check_and_increment_rate_limit` RPC), privacy page Anthropic sub-processor disclosure (new AC on F-012, see §"Refined ACs" below), CSP header on `/workspace/checklist`. Chat-specific hardening (system prompt skeleton, output filter, max-turn cap) moves to PI 15 Iter 1 alongside F-031. |
| **F-023** | Expired/error invite pages get a proper `AppHeader` + "Back to home" and "Go to login" links. **Reopened from PI 13 phantom-Done.** Mandatory BA screenshot in PR. |
| **F-024** | Login page heading is context-aware: `/login` → "Welcome back"; `/login?intent=signup` → "Create your free account". Landing "Sign up free" CTA appends `?intent=signup`. **Reopened from PI 13 phantom-Done.** Mandatory BA screenshot in PR. |
| **F-025** | Copy consistency sweep (menu labels, buttons, headings). **Reopened from PI 13 phantom-Done.** Mandatory BA screenshot in PR. |
| **F-034** | Remove the "Start an assessment" CTA from the employee empty-state dashboard; replace with locked string `No assessments yet — your owner will start one.` |
| **F-037** | Reword the 1-page security rules template section 7 (exact string locked in refinement; placeholder test: `contact us via the application` does NOT appear). |
| **F-042** | Delete the "contact us via the application" misleading copy and replace with `For questions, email {support email}`. **No in-app feedback form.** |

### Iteration 2 — Dashboard math (the big one)

| Feature | 1-line scope |
|---|---|
| **F-038** | Dashboard math fix: pill order `Resolved \| Done \| Not applicable \| Unsure / Not yet`, pill colours per UX §1, `stats.denominator` as single server-side authoritative field, numerator = `done + skipped`, `stats.resolved` as a new field. Kills the 18/36 ↔ 18/47 flicker by removing the client-side ternary on `members.length`. |
| **F-039** | Workspace home "My checklist" card binds to `stats.me.percent`. Single-line client change on top of the `stats.me` sibling shipped by F-038. |
| **F-040** | Security report re-reads `stats.resolved / stats.denominator` from the same helper — no local summation. Dashboard ↔ report parity becomes a trivial Playwright test. |
| **F-035** | Pending invitees render on the dashboard team list as dashed-avatar rows with `0 / N` greyed-out bars (UX §7). Pending invitees contribute ZERO to `stats.denominator` (see locked decision #2). Section header `"Team progress — X joined · Y pending"`. |

**Shared helper.** All four features above import a single new file `frontend/lib/dashboard/computeStats.ts` exporting `computeStats()` and `computeTrackStats()`. Unit tests in `computeStats.test.ts` cover BA's canonical fixture (section below), the 4 F-038 AC-8 edge cases, and the empty-org / no-IT-executor cases. This file is the forever-regression-guard for dashboard arithmetic.

### Iteration 3 — Team lifecycle + awareness banner + Business Test prep

| Feature | 1-line scope |
|---|---|
| **F-033** | Remove team member via `smbsec1.delete_member_with_data` Postgres RPC (hard-delete cascade across `assessment_responses`, `campaign_recipients`, `invites`, `org_members`, legacy `user_checklists`; audit_logs anonymised for target-authored rows; one new `member_removed` audit row with SHA-256 hash of email, no plain PII). `DELETE /api/orgs/members` route. Typed-email confirmation dialog for joined members, one-line confirm for pending invites. |
| **F-041** | IT Executor reassignment via `smbsec1.reassign_it_executor` Postgres RPC (unset-then-set flag flip, audit row, response ownership preserved on the assessment — see locked AC-1). Reassignment dialog per UX §5. Rejects pending-invitee targets in v1 (AC-10). |
| **F-036** | IT Executor awareness-section banner with UX §8 locked copy. Dismissible, per-user localStorage persistence. |
| **Regression + BA prep** | Mandatory regression pack green on the iteration push. Screenshot audit of every F-023..F-042 feature. Push to Vercel at end of iteration. |

### PI 14 BA Test scope

Business Test Team sweep after Vercel deploy. Mandatory scenarios (per BA Round 2 §9):

- **S1** F-043 harness 10-run flakiness gate
- **S2** F-038 canonical fixture — every cell in the 18-row Stefan fixture table (§"Canonical fixture" below)
- **S3** F-039 cross-user isolation (owner vs employee "My checklist" progress independence)
- **S4** F-040 dashboard/report numeric parity
- **S5** F-035 pending-invitee row rendering + zero-denominator contribution
- **S6** F-041 reassignment — preserve responses, 1 audit row, dashboard totals unchanged pre/post
- **S7** F-036 awareness banner render + dismissal persistence
- **S8** F-034 employee empty state — correct copy, no Start CTA
- **S9** F-023 / F-024 / F-025 browser walkthrough — expired invite has nav, login heading context-aware, copy consistencies verified
- **S10** F-042 repo grep + rendered-page grep for the removed string = zero hits
- **S11** Full regression pack green on every iteration push (per the new Anti-Phantom-Done rule below)

**PI 14 exit gate.** Stefan re-runs his 2026-04-11 test script in a live browser. All his numbered findings 31-42 are visibly fixed. BA sign-off with dated screenshots of each. No feature is `Done` without both (a) screenshot in PR body and (b) regression pack green — same rule applies to everything, but for PI 14 specifically this closes the phantom-Done hole.

---

## PI 15 — "AI conversation and mobile"

**Theme.** Ship the interactive per-item AI chat Stefan asked for, make the mobile layout genuinely usable (especially for chat), and harden the remaining F-012 chat-specific guardrails that didn't ride along in PI 14. F-012's persistent rate limit and privacy disclosure landed in PI 14 Iter 1, so by the time F-031 starts, the guardrails have soaked in PROD for 2-3 weeks and we have real abuse-log data to tune against.

### Iteration 1 — F-012 remainder + F-031 endpoint

| Feature | 1-line scope |
|---|---|
| **F-012 (remainder)** | Hardened system prompt (locked literal text per Security §5), sanitisation of interpolated item fields, server-side item lookup (do NOT trust client-supplied `item_title` etc. — Security §10 finding), output filter with 5 concrete heuristics (Security §6), `smbsec1.ai_guidance_flags` table + RLS, 90-day TTL cron, `AI_GUIDANCE_DISABLED` kill-switch env var, per-session 20-turn cap, `guidance:first_turn_auto` rate-limit bucket (10/min/user — guards auto-first-message abuse). |
| **F-031 (backend)** | `POST /api/guidance/chat` endpoint per Architect §5: stateless, client sends full `history` each turn, server truncates to 8000 tokens + hard 20-message cap, 3-tier rate limit check (item/user/org), deprecate `/api/guidance` to a thin alias. Model: Claude Haiku 3.5 only. No streaming in v1. |

### Iteration 2 — F-031 UI + F-009 mobile

| Feature | 1-line scope |
|---|---|
| **F-031 (frontend)** | Per-item chat panel in `/workspace/checklist`. **No auto-first-message on panel expand** (UX §4 conceded to Security): panel opens with a "Start chat" prompt card; clicking triggers the first AI call. `Clear` button, scrollable history (max 320px desktop / 400px mobile), sticky-within-card input, rate-limit footer when ≤5 left. Chat state is client-only `useState` per item drawer — no DB persistence in v1. |
| **F-009** | Mobile responsiveness audit scoped to 6 pages × 3 viewports (UX §9): `[360×640, 390×844, 768×1024]` × `[/, /login, /workspace, /workspace/checklist, /workspace/dashboard, /workspace/team]`. Pass criteria: no horizontal scroll, no element overflow, tap targets ≥44×44 px, chat input not occluded by mobile keyboard. Out-of-scope pages get an F-009.1 follow-up if BA flags issues. |

### Iteration 3 — Buffer, hardening, Business Test

- Prompt-injection corpus run against live F-012 + F-031 (BA Round 2 §6 scenarios 1-8). Corpus is 10-15 malicious prompts per BA Round 1 §1; corpus file committed under `frontend/tests/fixtures/ai-injection-corpus.json`.
- Token-cost observation: hit the daily caps intentionally from a scripted test context, verify the kill-switch path works.
- Mobile regression sweep across all 6 in-scope pages after F-031 UI lands.
- Vercel deploy at end of iteration.
- Business Test Team full walkthrough per CLAUDE.md §3.

### PI 15 BA Test scope

Scenarios S12-S19 per BA Round 2 §9: persistent rate limit across cold start (S12), F-031 6-scenario chat suite (S13), mobile layout readability (S14), F-009 mobile audit (S17), privacy page Anthropic disclosure verified live (S18), full Business Test Team sweep of PI 14 + PI 15 scope (S19).

**PI 15 exit gate.** Zero High/Medium defects after BA sweep. If any appear, they go into IT Dev within the same PI's retest per CLAUDE.md §3c; if systemic (e.g. dashboard math breaks again), escalate to Stefan per CLAUDE.md §3d.

---

## Refined ACs that override features.md

The following AC rewrites are the source of truth for IT Dev Team refinement. They replace whatever is currently in `features.md` for the listed feature/AC.

### F-038 AC-7 — Dashboard math denominator (LOCKED)

> `GET /api/dashboard` response shape includes:
>
> - `stats.denominator: number` — sum of (items applicable to each scoped member): IT executors contribute `totalItems`, non-executors contribute `awarenessCount`, **pending invitees contribute zero**. Labelled "responses" in the UI.
> - `stats.resolved: number` — `done + skipped` across all scoped members.
> - `stats.percent: number` — `round(resolved / denominator * 100)`. Unsure is NOT in the numerator.
> - `stats.me.denominator: number` — caller's own applicable item count (`totalItems` if caller `is_it_executor = true`, else `awarenessCount`).
> - `stats.me.resolved`, `stats.me.percent` — same formula scoped to the caller only.
> - `stats.by_track[track].denominator`, `.resolved`, `.percent` — per-track, same formula, `itemIds.size × eligible_members_for_this_track`.
>
> For Stefan's 2-person fixture (1 owner-IT-exec, 1 employee, 25 IT + 11 awareness; owner answers Done=7/Unsure=3/N/A=3 IT + Done=4/NotYet=1/N/A=1 awareness; employee answers nothing): `stats.denominator = 47`, `stats.resolved = 15`, `stats.percent = 32`. `stats.me.denominator = 36`, `stats.me.resolved = 15`, `stats.me.percent = 42`. Two snapshots taken 100 ms apart via `page.reload()` produce byte-identical JSON (no flicker).
>
> The legacy `stats.total` field is deprecated. The UI MUST NOT use it for any denominator; removal scheduled post-PI-15.

### F-041 AC-1 — IT Executor reassignment (LOCKED)

> Given org O has active assessment A with previous IT Executor U1 who has authored N `assessment_responses` rows scoped to IT Baseline items, when an owner invokes the `smbsec1.reassign_it_executor(p_org_id=O, p_new_user_id=U2, p_actor_user_id=owner)` RPC via `POST /api/orgs/[id]/it-executor`, then in a single DB transaction:
>
> 1. `smbsec1.org_members` row for U1 is updated to `is_it_executor = false` FIRST.
> 2. `smbsec1.org_members` row for U2 is updated to `is_it_executor = true` SECOND (ordering matters — the partial unique index `ux_one_it_executor_per_org` would reject the inverse order).
> 3. The N `assessment_responses` rows remain untouched — `user_id` stays `U1`, `value` unchanged. Ownership is preserved-on-the-assessment, NOT rebound to U2.
> 4. Exactly one row is appended to `smbsec1.audit_logs` with `event_type = "it_executor_reassigned"` and payload `{ previous_it_executor_user_id: U1, new_it_executor_user_id: U2, active_assessment_id: A, response_count_transferred: N }`.
> 5. U2 must be a member of O with `accepted_at IS NOT NULL`; else the RPC returns `error = "new_assignee_not_in_org"` and the API returns HTTP 400.
> 6. Post-reassignment `GET /api/dashboard` returns `stats.by_track.it_baseline.resolved` and `.denominator` byte-identical to the pre-reassignment snapshot (the denominator shift is exactly zero because the helper recomputes against current `is_it_executor` flags).
> 7. U2's `GET /workspace/checklist` shows the IT Baseline section with the N pre-answered items visible and editable.
> 8. U1's `GET /workspace/checklist` no longer shows the IT Baseline section — only Awareness.
> 9. The dialog copy in UX Round 2 §5 is the approved copy. The checkbox "I understand {new_name} will see {previous_name}'s existing IT Baseline answers" is required before the primary button enables.
> 10. Reassignment targets who are pending invitees (not yet accepted) are rejected in v1.

### F-033 AC-7 — Audit log email handling (LOCKED — hash only)

> After successful member removal, `smbsec1.audit_logs` contains exactly one new row with `event_type = "member_removed"`, `actor_user_id = <owner who performed the deletion>`, `actor_email = NULL`, and `payload` containing:
>
> - `removed_email_sha256: <SHA-256 hex digest of lowercase-trimmed email>`
> - `removed_user_id_sha256: <SHA-256 hex digest of removed user_id>` (if the target was a joined member)
> - `was_it_executor: boolean`
> - `responses_deleted: int`
> - `campaigns_deleted: int`
> - `invites_deleted: int`
>
> The `payload` MUST NOT contain the plain email, the plain user_id, or any derived PII field. In the same transaction, all other `audit_logs` rows where `actor_user_id = removed.user_id` are updated: `actor_user_id → NULL`, `actor_email → NULL`, and any payload keys in `{email, removed_email, invited_email}` are stripped via `jsonb - 'key'`. The SHA-256 is sufficient to answer "was X ever removed from org Y" on demand (recompute hash, compare) without the controller storing X.

### F-012 AC-NEW — Anthropic privacy disclosure (NEW AC, PI 14 Iter 1)

> In the same commit that ships F-012 Iter 1 to PI 14:
>
> 1. `frontend/app/privacy/page.tsx` Sub-processors table gains one new row: **Anthropic | AI-assisted security guidance (Claude Haiku). Sends checklist item text and your question; receives a short written answer. | US (Anthropic API)**.
> 2. A sentence is appended below the Sub-processors table: *"Anthropic may retain API request data for up to 30 days for trust-and-safety review (per Anthropic's published data policy). No training is performed on this data. Organisation admins can disable AI guidance in Settings."*
> 3. Section 4 ("Where data is stored") gains: *"AI guidance requests (when used) are processed by Anthropic in the United States under Standard Contractual Clauses. All other data stays in the EU."*
> 4. Section 8 ("Right to object") gains: *"Right to object — employees can ask their org admin to disable AI guidance for the organisation (Settings → AI guidance toggle)."* The org-level toggle itself (`orgs.ai_guidance_enabled boolean default true`) is added in the same F-012 Iter 1 commit.
>
> This disclosure is independent of F-031 and must ship in PI 14 Iter 1 because the existing `/api/guidance` route is already sending user content to Anthropic — this is a pre-existing GDPR Art. 13 transparency gap.

### F-035 AC-2 — Pending invitee row behaviour (rewritten)

> After `POST /api/invites` creates an invite for email E in org O, `GET /api/dashboard` response `members[]` contains a row with `pending: true`, `email: E`, `total: <awarenessCount or 0>`, `resolved: 0`, `percent: 0`. This row DOES NOT expand `stats.denominator` — the denominator is unchanged from before the invite was sent. After accept-invite, on the next dashboard fetch, the row is returned with `pending: false` and the contribution enters `stats.denominator` on the same fetch. For that email there is never both a pending and a joined row in the same response.

### F-031 AC-5 — Chat rate limit (rewritten)

> 21st `POST /api/guidance/chat` for same `(user_id, item_id, UTC-day-bucket)` returns HTTP 429 with body `{"error": "rate_limited", "scope": "item_day", "reset_at": <ISO>, "remaining_today": 0}`. The `smbsec1.rate_limits` row records the attempt via `check_and_increment_rate_limit` RPC. Cold-starting the Vercel lambda by redeploying does NOT reset the counter (validated in the F-043 harness via service-role insert of 20 usage rows followed by a UI-level message attempt). Parallel caps: 60/user/day and 300/org/day (see Security Round 2 §3 bucket table).

### F-031 AC-7 — Output filter (rewritten as wiring-only, non-blocking on filter accuracy)

> The `/api/guidance/chat` response pipeline passes replies through `lib/ai/outputFilter.ts` before returning, applying the 5 heuristics in Security Round 2 §6 (length, jailbreak markers, code-block abuse, topic drift, PII echo). Flagged replies are logged to `smbsec1.ai_guidance_flags` with request/response hashes (NOT content). No AC assertion is made on the filter's refusal accuracy — this AC is about the wiring being in place and the flag table being populated, not about the model's behaviour.

### F-034 AC-1 — Employee empty-state copy (rewritten)

> Employee visiting `/workspace/dashboard` where no assessment exists sees the literal string `No assessments yet — your owner will start one.` and does NOT see the string `Start an assessment`. DOM assertion against exact text.

### F-036 AC-2 — Awareness banner copy (rewritten)

> IT-Executor user viewing `/workspace/checklist` awareness section for the first time sees a banner containing the literal string `Now your personal security habits. Every person in your organisation — including you — answers the same awareness questions.` (UX Round 2 §8 final copy). Banner is dismissible, dismissal persisted to localStorage key `smbsec1.banner.awarenessIntro.dismissed`, and after dismissal the banner never re-renders on subsequent loads (asserted via `page.reload()` in test).

### F-024 AC (rewritten) — Login heading context-aware

> `/login` (no query param) renders `<h1>Welcome back</h1>` with sub `<p>Enter your email — we'll send you a sign-in link.</p>`. `/login?intent=signup` renders `<h1>Create your free account</h1>` with sub `<p>Enter your email — we'll send you a link to get started. No password needed.</p>`. Landing page "Sign up free" CTA links to `/login?intent=signup`. Implementation reads `searchParams.intent === "signup"` — no separate page, no duplication.

---

## Canonical F-038 fixture (BA Round 2 §4)

| UI element | Expected value |
|---|---|
| Dashboard top-line `X / Y responses` | `15 / 47 responses` |
| Dashboard top-line percent | `32%` (round(15/47*100) = 31.9%) |
| IT Baseline track bar | `10 / 25` → **40%** |
| IT Baseline Resolved pill | `10` |
| IT Baseline Done pill | `7` |
| IT Baseline Not applicable pill | `3` |
| IT Baseline Unsure / Not yet pill | `3` |
| Awareness track bar | `5 / 22` → **23%** |
| Awareness Resolved pill | `5` |
| Awareness Done pill | `4` |
| Awareness Not applicable pill | `1` |
| Awareness Unsure / Not yet pill | `1` |
| Workspace home "My checklist" bar (owner) | `15 / 36` → **42%** |
| Workspace home "My checklist" bar (employee) | `0 / 11` → **0%** |
| Dashboard top-level Resolved pill | `15` |
| Dashboard top-level Done pill | `11` |
| Dashboard top-level Not applicable pill | `4` |
| Dashboard top-level Unsure / Not yet pill | `4` |

F-043 seeds these exact response rows via service-role `assessment_responses` inserts; F-038 spec asserts every cell via DOM selector. This table is the single place the "dashboard tells the truth" invariant lives — any future math change must re-justify every cell.

---

## Known dependencies and ordering

```
F-043 (harness) ──┬── F-034 ──┐
                  │            │
                  ├── F-038 ──┼── F-039 ── F-035
                  │            │
                  │            └── F-040 (shared helper)
                  │
                  ├── F-033 (post-F-038 so recompute provable)
                  └── F-041 (post-F-038 so pre/post math invariant)

F-012 (Iter 1: rate limit + privacy) ── F-012 (Iter-PI15: chat hardening) ── F-031
F-012 (Iter 1: rate limit persistence) ── F-031 (requires RPC live in PROD)
F-009 runs alongside F-031 (mobile chat is the hardest layout constraint)
```

**Hard technical dependencies (locked, non-negotiable):**

1. **F-043 ships in PI 14 Iter 1 before anything else.** Every later dashboard-math feature depends on it for multi-user verification. This is the anti-phantom-Done insurance.
2. **F-012's persistent rate limit RPC must be live in PROD before F-031's endpoint merges.** F-012 Iter 1 part lands in PI 14 Iter 1, giving F-031 multiple iterations of production soak before the chat endpoint is exposed. Non-negotiable per Security §1.
3. **F-038 / F-039 / F-040 share one helper (`frontend/lib/dashboard/computeStats.ts`) and ship in the same iteration (PI 14 Iter 2).** Splitting them risks server/client divergence in the report vs dashboard — which is exactly the bug class we are fixing.
4. **F-038 before F-041 and F-033.** F-041's "dashboard math unchanged pre/post reassignment" AC is only provable after F-038 lands. F-033's "dashboard recomputes after removal" is only provable after F-038 lands.
5. **F-038 before F-035.** F-035 AC-2 ties directly to F-038's denominator decision — they must ship the same PI, F-038 one iteration first so F-035 can verify the zero-contribution rule against correct denominator math.
6. **Privacy-page Anthropic disclosure ships in PI 14 Iter 1**, not PI 15. The GDPR Art. 13 gap exists today independent of F-031.

**Soft ordering (preferred but not blocking):**
- F-036 after F-041 (same iteration is fine; they share the IT Executor / awareness UI surface).
- F-009 mobile audit runs in PI 15 Iter 2 alongside F-031 UI because chat-on-mobile is the highest-value mobile constraint.

---

## Risks accepted

**Risks we are choosing NOT to mitigate further in PI 14/15.** These are on the record so retrospective conversations have a starting point.

1. **Shared Supabase DEV project for F-043 harness.** BA Round 2 §10 flagged that running harness against the shared DEV Supabase leaves e2e-pi14 orgs visible to Stefan during any screen-share. We accept the risk because (a) the `e2e-pi14-` prefix + `@example.invalid` TLD guarantees zero collision with real data, (b) per-test teardown + nightly sweeper GitHub Action give two layers of cleanup, (c) a dedicated Supabase project is ~1 day of plumbing we can do in PI 15 prep if it becomes embarrassing. **Locked: shared DEV Supabase for PI 14; revisit at PI 15 start.**
2. **Campaign recipient history breaks on F-033 delete.** The RPC hard-deletes `campaign_recipients` for the removed member. Historical campaign click-rate stats will drop one recipient, making the old campaign's totals look inconsistent. We accept this because GDPR Art. 17 strict compliance is worth more than campaign-stats fidelity for an SMB tool with no legal retention obligation. Mitigation: small footer "totals exclude removed members" on campaign detail page — optional, IT Dev's call during refinement.
3. **Chat history is client-only (not persisted) in F-031 v1.** If the user reloads mid-conversation, the history is gone. F-031 AC-3 explicitly says "does NOT need to persist across reloads". If users immediately demand persistence after PI 15 Business Test, we add a `chat_messages` table as a new feature in post-PI-15 refinement.
4. **Member-percent visible drop after F-038.** Users currently seeing "45% done" (unsure counted in numerator) will drop to "30%" after F-038. This is correct behaviour but may confuse returning users. We accept this without a release-notes banner because the target user segment is Stefan and ≤10 test organisations — all of whom have been briefed. A public-release banner will be revisited when smbsec1 has >50 real orgs.
5. **F-031 token-cost blowup under coordinated attack.** Security §4 puts worst-case at "well under $5/org/day for an abusive org". We accept this because the kill-switch env var provides a ≤60-second-response mitigation and we will observe actual token usage via the `ai_guidance_flags` table during the PI 15 Iter 3 buffer.
6. **Pending-invitee reassignment target rejected.** F-041 AC-10 rejects reassignment to a not-yet-accepted invitee. UX §6 flagged this as restrictive. We accept the restriction because "takes effect on accept" semantics requires a new `pending_reassignment` column on `invites`, which is non-trivial. Revisit post-PI-15.
7. **Output filter on F-031 is wiring-only in v1.** BA Round 2 §1 moved F-031 AC-7 to non-blocking because LLM output filters are famously brittle to test deterministically. The pipeline and flag logging are required; the filter's refusal accuracy is not gated.

---

## Process improvement — Anti-Phantom-Done rule for IT Dev Team

This is the combined rule that goes into `docs/team_rules_it_dev_team.md` (currently empty) at PI 14 retrospective (step 2n). It merges my Round 2 PR-screenshot proposal with BA Round 2's mandatory regression-spec list.

```markdown
### Rule 1 — Anti-Phantom-Done gate (added 2026-04-11, PI 14 ROADMAP)

**Problem this solves.** In PI 13, features F-023, F-024, F-025 were marked Done in
features.md and the PI 13 close-out note, but NO code shipped for any of them.
Architect Round 2 §11 root-caused this to a desync: the bulk status-flip commit
be6db93 swept three features into Done even though they were never in scope for
the PI 13 fix commit fee865e. The gate between "CI green" and "feature Done"
was vibes, and vibes failed.

**Rule.** No feature in this project moves to status `Developed` unless ALL FOUR
of the following appear in the Pull Request description that ships it:

1. **CI evidence.** Link to the GitHub Actions run showing the mandatory
   regression pack green: `auth`, `smoke`, `public`, `roles`, `onboarding`,
   `invite`, `dashboard`, `checklist`, `delete`, `gdpr`, `awareness`,
   `assessment`, `campaigns`. If any of those are skipped or filtered, the PR
   is rejected regardless of the reason. "Tests not in scope for this feature"
   is not an accepted reason — that is the phantom-Done path.

2. **Browser screenshot.** At least one dated screenshot of the feature's
   acceptance criterion observable in a real browser, taken by the implementing
   dev against local `npm run dev` or the Vercel preview URL. For copy fixes,
   a screenshot of the changed string in place. For math fixes (F-038 class),
   a screenshot showing the canonical fixture numbers from the feature's test
   table.

3. **Feature ID in PR title.** Format `F-nnn: <short summary>`. Enables
   automated traceability between PR, feature doc, and test file.

4. **Link to the new/changed test.** Every PR that lands a feature lands its
   tests in the same PR. No "tests will follow in the next iteration" — that
   is exactly how PI 13 produced phantom-Done.

**Who enforces.** The dev opens the PR. The coordinator (Claude) refuses to
merge unless 1-4 are present. features.md and backlog.md status transitions
happen AFTER merge, not before.

**What happens if a feature is flagged Done but later found not delivered.**
Reopen the feature, set status back to Ready, treat as a P1 incident, add a
mandatory retro entry to this file explaining which of the four gates was
bypassed and how the process will prevent a recurrence.
```

**Rationale for one combined rule rather than two.** PM's PR-screenshot rule catches the "I forgot to wire the page" failure mode (F-023 type). BA's regression-pack rule catches the "I broke an adjacent flow without noticing" failure mode (F-038 → F-040 divergence risk). Combined they close both holes. One rule, two gates, one enforcement point.

---

## Open questions for IT Dev Team refinement

These are deliberately punted from the Product Team to the IT Dev Team refinement step (2e) because they are implementation-level decisions the Product Team has no strong opinion on, OR because they depend on code inspection the IT Dev Team is better positioned to do.

1. **F-035 dashed-avatar a11y contrast.** UX §9 Q3 flagged that a 1 px dashed outline on a white background may fail WCAG AA. IT Dev should validate against real Tailwind tokens; if contrast fails, fall back to `bg-grey-100` fill with the dashed border.
2. **F-033 campaign_recipients: hard-delete vs anonymise.** Architect §7 ships the RPC with hard-delete per Security's strict Art. 17 reading. If IT Dev refinement finds the historical inconsistency on campaign stats is louder than expected, a two-line RPC change switches to `UPDATE ... SET user_id = NULL, email = '<removed>'`. Product Team is indifferent; Security prefers delete. Default: delete.
3. **F-012 CSP header exact policy.** Security §10 proposed `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; img-src 'self' data:; frame-ancestors 'none'`. IT Dev should verify this doesn't break Tailwind's inline styles in production build mode before shipping.
4. **F-009 tap-target exception list.** 44×44 px targets may require layout changes to existing components. If IT Dev finds ≥3 components need non-trivial refactors, lift those into an F-009.1 follow-up and keep PI 15 Iter 2 unblocked.
5. **F-031 chat history truncation threshold.** Architect §5 picked "last 10 turns, 8000 token budget". If token accounting turns out cheaper or more expensive than the 4-chars-per-token heuristic, IT Dev can tune the constant without re-opening the product decision.
6. **F-041 + F-033 interaction: removing the current IT Executor.** F-033 AC-9 already says "if the removed member is IT Executor, cascade triggers re-offer of 'Invite your IT Executor'". IT Dev should verify this interaction works end-to-end in the same test (harness scenario: owner removes IT Exec who has responses → responses deleted → owner's workspace home prompts to invite a new IT Exec → owner invites replacement → new IT Exec accepts → dashboard shows clean state).
7. **Org-level AI guidance toggle UI placement.** Security §1 requires the toggle to exist in Settings; Product Team has not specified where. IT Dev's call during refinement — probably `/workspace/settings` under a new "Integrations" section, but open.

---

**End of Product Team Consensus. Hand-off to IT Dev Team refinement (CLAUDE.md §2e).**
