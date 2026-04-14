# State Matrix — Workspace Checklist (`/workspace/checklist`)

**Page file:** `frontend/app/workspace/checklist/page.tsx`
**Route:** `/workspace/checklist`
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** PI-16 Phase A retrofit (F-045 / F-047)
**Persona source:** `docs/quality/personas.md` (last reviewed 2026-04-14)
**Invariant source:** `docs/quality/invariants.md`
**Last full walkthrough:** 2026-04-14 by UX + Architect (source-read only, no browser)
**Linked features:** F-031 (AI chat), F-034 (employee empty-state), F-036 (awareness intro banner), F-039 (caller-scoped stats), F-045, F-047

---

## Canonical source of truth

Every cell below assumes the checklist page derives its state from these inputs and nothing else:

- `assessment` — the single active assessment fetched from `/api/assessments` (`status === "active"`), or `null`.
- `membership.is_it_executor` — the boolean that drives track visibility (`INV-checklist-track-visibility`).
- `membership.role` — drives employee-only welcome banner.
- `items[]` + `groups[]` — immutable snapshot from `/api/assessments/{id}`.
- `responses[]` — caller-scoped answers from `/api/assessments/{id}/responses/me`.
- `verifications[]` — per-item campaign-verification flags (piggybacks on responses query).

Anything the UI renders that does NOT trace back to these inputs is either a defect or a missing invariant.

---

## Page regions (columns)

Enumerated by reading `page.tsx` top-to-bottom:

| Region ID | UI name (as rendered) | Code anchor |
|---|---|---|
| R1 | **Page title** — `<h1>"My checklist"` | line 280 / 342 |
| R2 | **Empty state — no active assessment** — grey card "No active assessment yet" | lines 213–222 |
| R3 | **Loading skeleton** — animated pulse bars while items load | lines 224–234 |
| R4 | **Progress header** — answered / total / % + gradient progress bar + "Resume where you left off" link | lines 344–365 |
| R5 | **Employee welcome banner** (blue, employees with zero answers) | lines 368–376 |
| R6 | **High-impact callout** (amber, visible when ≥1 high-impact item open AND user has answered ≥1) | lines 379–393 |
| R7 | **IT-Executor track assignment banner** (blue, IT execs, dismissible via localStorage) | lines 395–411 |
| R8 | **IT Baseline section** — grouped by `checklist_groups`, IT-exec-only visibility | lines 413–441 |
| R9 | **Awareness intro banner** (teal, IT execs only, dismissible) | lines 442–483 |
| R10 | **Awareness section** — flat list, all personas | lines 484–486 |
| R11 | **Per-item controls** — Done / Unsure / Skipped buttons, labels vary by track | lines 642–663 |
| R12 | **Per-item guidance (expanded)** — description, "Why it matters", Steps, template download, AI panel toggle | lines 605–640 |
| R13 | **AI chat panel (F-031)** — toggle → "Start chat" card → history + sticky input + remaining footer | lines 763–981 |
| R14 | **Completion state** — green "All items answered" card with stat trio + ICS download + collapsible checklist | lines 277–338 |
| R15 | **Verification badges** — per item, "Verified — passed campaign test" / "Failed campaign test" | lines 590–600 |
| R16 | **Error state** — red banner "Failed to load checklist" on API failure | lines 205–211 |

---

## Matrix

Legend: `—` = region not rendered for this persona. `N/A` = persona cannot reach page. `⚠ DEFECT` = today's code diverges from intended. Invariant IDs from `invariants.md` in brackets.

### R1 — Page title

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A — redirected to `/login` by `useWorkspace` gate | INV-workspace-auth-boundary | N/A |
| O1 | `"My checklist"` | — | OK |
| O2 | `"My checklist"` | — | OK |
| O3 | `"My checklist"` | — | OK |
| IT1 | `"My checklist"` | — | OK |
| E1 | N/A — not yet a member | — | N/A |
| E2 | `"My checklist"` | — | OK |

### R2 — Empty state (no active assessment)

Rendered iff `noAssessment === true` (no active assessment row).

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | INV-workspace-auth-boundary | N/A |
| O1 | Visible by default (O1 has no active assessment). Copy: "No active assessment yet" + "Your checklist will appear here once an assessment is started." | INV-state-pure-of-navigation | ⚠ DEFECT — new finding: copy tells the OWNER that an assessment "will appear once started", but the owner is the one who starts it. Should read "Start an assessment from the Assessments page." with a CTA link. Non-actionable empty-state for admins. |
| O2 | Hidden (active assessment exists) | — | OK |
| O3 | Visible (no active assessment). Same defect as O1. | INV-state-pure-of-navigation | ⚠ DEFECT — same as O1 |
| IT1 | Hidden (active assessment exists in O2 org) | — | OK |
| E1 | N/A | — | N/A |
| E2 | Hidden (active assessment exists in O2 org) — if O2 had not started one, would show "No active assessment yet" + "your owner will start one" from R2's expected copy (today: E2 sees the same admin-oriented copy → defect). | INV-state-pure-of-navigation | ⚠ DEFECT — new finding: employee empty-state copy is identical to admin empty-state. F-034 AC-1 fixed this on the Dashboard page; parity fix missing here. |

### R3 — Loading skeleton

Rendered iff `assessment` is truthy but `items.length === 0` (pre-fetch).

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 / IT1 / E2 | Skeleton pulse (4 bars). Disappears once items load. | INV-state-pure-of-navigation | OK |
| E1 | N/A | — | N/A |

### R4 — Progress header

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | `answered / total` computed over `visibleItems` (= all items because `is_it_executor`). Matches R8+R10 item count. | INV-checklist-track-visibility, INV-dashboard-report-parity | OK |
| O2 | `answered / total` over Awareness-only items (O2 is not IT-exec — delegated to IT1). | INV-checklist-track-visibility | OK |
| O3 | `answered / total` over Awareness-only items (no accepted IT-exec; pending invite does not flip O3's own flag). | INV-checklist-track-visibility | OK |
| IT1 | `answered / total` over all items (IT + Awareness). | INV-checklist-track-visibility | OK |
| E1 | N/A | — | N/A |
| E2 | `answered / total` over Awareness-only items. | INV-checklist-track-visibility | OK |

"Resume where you left off" link only appears when `0 < answered < total`; scrolls to first unanswered. Deterministic across navigations.

### R5 — Employee welcome banner

Rendered iff `membership.role === "employee" && answered === 0`.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 | Hidden (role = `org_admin`) | INV-state-pure-of-navigation | OK |
| IT1 | Visible on first entry (role = `employee`, answered = 0). Copy: "Welcome to your security checklist" + "about 15 minutes". | INV-state-pure-of-navigation | ⚠ DEFECT — new finding: IT1 sees the same copy as a regular employee, but IT1 also gets IT Baseline — "15 minutes" is unrealistic for IT Baseline scope and copy doesn't mention the two tracks. Should differentiate or at least name both tracks. Cell needs an invariant that doesn't exist yet: **INV-checklist-onboarding-copy-track-aware** (new) — the first-session welcome text must name the tracks the persona will see. |
| E1 | N/A | — | N/A |
| E2 | Visible on first entry. Copy correct for awareness-only scope. | INV-state-pure-of-navigation | OK |

Banner vanishes once any response is saved. Never dismissed — it simply stops matching the `answered === 0` predicate. INV-state-pure-of-navigation holds only if banner state is derived from `answered` and NOT from a session-cached "first visit" flag. Source confirms: derived from `answered`. OK.

### R6 — High-impact callout

Rendered iff `answered > 0` AND `≥1 item where impact === "high" && response !== "done"`.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Visible when applicable. Counts high-impact items across BOTH tracks (O1 is IT-exec). | INV-checklist-track-visibility | OK |
| O2 / O3 / E2 | Visible when applicable. Counts within Awareness only. | INV-checklist-track-visibility | OK |
| IT1 | Visible when applicable. Counts across both tracks. | INV-checklist-track-visibility | OK |
| E1 | N/A | — | N/A |

### R7 — IT-Executor track assignment banner

Rendered iff `is_it_executor === true` AND `localStorage["smbsec:executor-banner-dismissed"]` is unset.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Visible on first visit. Copy: "Your admin has assigned you the IT Baseline track…" | INV-state-pure-of-navigation | ⚠ DEFECT — new finding: O1 is her own admin; "Your admin has assigned you" is incorrect for the owner-who-handles-IT-herself case. Should read "You've taken on the IT Baseline track…" for O1. Semantic leak. |
| O2 | Hidden (not IT-exec) | — | OK |
| O3 | Hidden (not IT-exec) | — | OK |
| IT1 | Visible on first visit. Copy correct. | INV-state-pure-of-navigation | OK |
| E1 | N/A | — | N/A |
| E2 | Hidden (not IT-exec) | — | OK |

Note: R7's dismissed-flag lives in localStorage → survives reloads but NOT cross-device. This is intentional (per F-036 decision). INV-state-pure-of-navigation holds because the rendered state *is* a pure function of `(is_it_executor, localStorage flag)`; the localStorage read is idempotent.

### R8 — IT Baseline section

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Visible. Grouped by `checklist_groups` where `track === "it_baseline"`. | INV-checklist-track-visibility | OK |
| O2 | Hidden (not IT-exec) | INV-checklist-track-visibility | OK |
| O3 | Hidden (not IT-exec) | INV-checklist-track-visibility | OK |
| IT1 | Visible with full grouping. | INV-checklist-track-visibility | OK |
| E1 | N/A | — | N/A |
| E2 | Hidden (not IT-exec) | INV-checklist-track-visibility | OK |

### R9 — Awareness intro banner

Rendered iff `is_it_executor === true` AND `awarenessItems.length > 0` AND `localStorage["smbsec1.banner.awarenessIntro.dismissed"]` unset.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Visible on first visit (IT-exec). Transitions reader from IT Baseline → Awareness. | INV-state-pure-of-navigation | OK |
| O2 / O3 / E2 | Hidden (not IT-exec) | — | OK |
| IT1 | Visible on first visit. | INV-state-pure-of-navigation | OK |
| E1 | N/A | — | N/A |

### R10 — Awareness section

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 / IT1 / E2 | Visible. Flat list (no grouping — groups only exist for IT Baseline in current data). | INV-checklist-track-visibility | OK |
| E1 | N/A | — | N/A |

### R11 — Per-item controls (Done / Unsure / Skipped)

Labels + tooltips differ by `track`. IT Baseline → "Done / Unsure / Not applicable". Awareness → "I've done this / Not yet / Not applicable".

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Both label sets rendered correctly per section. Click toggles; re-click clears. Optimistic update → PUT `/api/assessments/{id}/responses`. | INV-state-pure-of-navigation | OK |
| O2 / O3 / E2 | Awareness labels only. | — | OK |
| IT1 | Both label sets. | — | OK |
| E1 | N/A | — | N/A |

Failure mode: if PUT fails, the optimistic update *stays* and no error is shown (caught-and-swallowed on line 169). ⚠ DEFECT — new finding: user cannot tell a response was not persisted. Cell needs an invariant that doesn't exist yet: **INV-optimistic-update-reconciles** (new) — every optimistic UI update must either confirm persistence (toast / badge) or roll back visibly on failure. Related to INV-no-raw-db-errors but distinct — INV-no-raw-db-errors says "don't leak raw errors"; this new invariant says "don't silently lose writes".

### R12 — Per-item guidance (expanded)

Expand on click; shows description, "Why it matters" (amber box), Steps (ordered list), template download link (if title matches one of six patterns in `ITEM_TEMPLATES`), and the AI panel toggle.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 / IT1 / E2 | All sub-regions rendered when data present. Identical content per persona (items are org-wide). | INV-state-pure-of-navigation | OK |
| E1 | N/A | — | N/A |

### R13 — AI chat panel (F-031)

Toggle button "Help me do this" → teal panel. Initial state: "Start chat" card (no Claude call). Click "Start chat" → seeds an opening user message and fires first `POST /api/guidance/chat`. Subsequent messages via sticky-bottom input. "Clear chat" text-link resets client state. Error banner maps HTTP status → human copy (429, 422, 400-too-long, 502, 503, 401/403, 404). Remaining-chats footer appears when `remaining.item ≤ 5`.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 / IT1 / E2 | Panel available on every item. No Claude call fires before "Start chat" click. Chat history is client-only (non-persistent across reloads — per F-031 consensus). | INV-state-pure-of-navigation, INV-no-raw-db-errors | OK |
| E1 | N/A | — | N/A |

503 copy says "AI guidance is disabled for this organisation. Ask your owner to enable it in Settings." — ⚠ DEFECT — new finding: there is no "enable AI guidance" toggle on the Settings page today (F-031 ships AI enabled for all orgs). Copy promises a setting that does not exist. Either remove the second sentence or ship the toggle. Covered by no invariant yet — candidate for **INV-error-copy-matches-available-actions** (new).

### R14 — Completion state

Rendered iff `answered >= total && total > 0`.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 / IT1 / E2 | Green card: "All items answered — great work!" + Done/Unsure/Skipped tri-stat + "Add reminder to calendar (.ics)" + "View dashboard →" + collapsible "Show checklist". | INV-state-pure-of-navigation | OK |
| E1 | N/A | — | N/A |

Stat-pill label "Skipped" (R14) vs. "Not applicable" button label (R11) — ⚠ DEFECT — new finding: completion card uses "Skipped" even though the response button is labelled "Not applicable". Terminology drift inside a single page. Dashboard (F-038) has already unified to "Not applicable". Fix: use the same label here. Cell needs an invariant that doesn't exist yet: **INV-terminology-single-source** (new) — a single semantic concept uses one visible label everywhere in the app.

### R15 — Verification badges

Per-item, show green "Verified — passed campaign test" or amber "Failed campaign test" if `verifications[item.id]` is set (requires F-020 / campaign test coupling).

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 / IT1 / E2 | Rendered when present. | — | OK |
| E1 | N/A | — | N/A |

### R16 — Error state

Rendered iff any of the initial fetches (`/api/assessments`, `/api/orgs/me`, `/api/assessments/{id}`, `/api/assessments/{id}/responses/me`) reject.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 / IT1 / E2 | Red banner with human copy — NOT a raw Postgres/Supabase string. | INV-no-raw-db-errors | ⚠ DEFECT — new finding: current code does `e instanceof Error ? e.message : "Failed to load checklist."` — the fallback is safe but `e.message` from a failed Supabase RPC can include raw strings like `relation "..." does not exist`. No whitelist filter. |
| E1 | N/A | — | N/A |

---

## Invariants referenced

| ID | Cells |
|---|---|
| INV-workspace-auth-boundary | R1 ANON row (redirect gate upstream in `useWorkspace`). |
| INV-checklist-track-visibility | R4, R6, R8, R10 — and R5 IT1 cell as a derived copy concern. |
| INV-state-pure-of-navigation | R2, R3, R4, R5, R6, R7, R9, R11, R12, R13, R14. |
| INV-dashboard-report-parity | R4 (caller-scoped stats must agree with Dashboard's `stats.me` per `INV-dashboard-report-parity`). |
| INV-no-raw-db-errors | R13 503 copy, R16. |

## Candidate new invariants surfaced by this matrix

| Proposed ID | Trigger cell | Why |
|---|---|---|
| INV-checklist-onboarding-copy-track-aware | R5 IT1 | Welcome copy must name the tracks the persona will see. Without it, IT1 mis-estimates scope. |
| INV-optimistic-update-reconciles | R11 | Every optimistic write must either confirm persistence or roll back visibly; today `setResponse` swallows failures. |
| INV-error-copy-matches-available-actions | R13 | Error copy must not reference actions/UI that do not exist (AI disable toggle). |
| INV-terminology-single-source | R14 | "Skipped" vs. "Not applicable" drift inside the same page. |

---

## Defect summary (feeds PI-16 fix scope)

| Cell | PDF # | One-liner |
|---|---|---|
| R2 × O1/O3 | new finding | Admin empty-state copy tells the owner the assessment "will appear once started" rather than offering a Start CTA. |
| R2 × E2 | new finding | Employee empty-state copy is admin-oriented; F-034 parity missing on checklist page. |
| R5 × IT1 | new finding | Welcome-banner scope ("15 minutes") ignores IT Baseline; does not name tracks. |
| R7 × O1 | new finding | "Your admin has assigned you" is semantically wrong for owner-who-handles-IT. |
| R11 × all personas | new finding | Response PUT failures are swallowed silently — optimistic state stays without confirmation. |
| R13 503 copy | new finding | 503 error references a Settings toggle that does not exist. |
| R14 × all personas | new finding | "Skipped" label in completion card drifts from "Not applicable" button label. |
| R16 × all personas | new finding | Error fallback may leak raw RPC `e.message` — no whitelist. |

---

## Notes / dependencies

- Track visibility is driven off `membership.is_it_executor` captured at page-mount. If the owner flips this flag in Settings for another user while the page is open, the old state persists until reload. Acceptable (no `INV-` required) because the edit is rare and reload is cheap — but worth confirming.
- Group fetch for Awareness returns zero groups today (by design). Flat list is correct; do not add an "Other" heading to Awareness.
- AI panel's "Clear chat" does not send any server-side delete — chat is client-only. This means a page reload also clears chat. Intentional per F-031 consensus; do not file as defect.
