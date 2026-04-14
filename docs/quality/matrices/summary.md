# State Matrix — Summary (`/summary`)

**Page file:** `frontend/app/summary/page.tsx`
**Route:** `/summary` (public; auth-aware)
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** PI-16 Phase A retrofit (F-045). Authored 2026-04-14 by UX + Architect pair.

- Persona source: `docs/quality/personas.md` (last reviewed: 2026-04-14)
- Invariant source: `docs/quality/invariants.md`
- Last full walkthrough: 2026-04-14 by UX+Architect (source-only; no browser)
- Linked features: F-045, F-046, F-038/F-040 (dashboard math parity — cross-page)

---

## Canonical source of truth

`/summary` is the **public, auth-aware teaser/progress page** — distinct from `/workspace/report` (the owner-only printable posture report). Its visible state is a pure function of:

```
(authState, dashboardApiResult)
```

- `authState` — `supabase.auth.getSession()` at mount. No token → `viewMode = "signin"`.
- `dashboardApiResult` — `apiFetch("/api/dashboard", token)` at mount. On success with `data.assessment` → `hasOrg = true` and `stats = data.stats`. On any error or null assessment → `hasOrg = false`, `viewMode = "summary"` anyway.

The three view modes are:
- `loading` — transient "Loading…" state.
- `signin` — teaser + "Sign in to see your progress summary" CTA.
- `summary` — real data (when `hasOrg`) OR "Set up your workspace" CTA + first 10 checklist items (when `!hasOrg`).

---

## Page regions (columns)

Enumerated from `frontend/app/summary/page.tsx` (lines 79–247):

| Region ID | UI name (as rendered) | Code anchor |
|---|---|---|
| R1 | **Header** — H1 "Summary" | lines 98, 152 |
| R2 | **Loading placeholder** — "Loading…" box | lines 79–92 |
| R3 | **Sign-in CTA card (ANON)** — blue info box + "Sign in" button | lines 98–113 |
| R4 | **Teaser example card (ANON)** — grey "Example" box with hard-coded 67% / 12 / 3 / 2 | lines 115–136 |
| R5 | **ANON secondary links** — "Browse the checklist first", "Home" | lines 138–145 |
| R6 | **Signed-in real-data progress card** (iff `hasOrg`) — progress bar + done/unsure/skipped/total | lines 156–172 |
| R7 | **Signed-in "Next steps" section** (iff `hasOrg`) — advice copy; conditional "Nice — everything is marked Done" message | lines 174–185 |
| R8 | **Signed-in "Go to workspace dashboard" CTA** (iff `hasOrg`) | lines 187–194 |
| R9 | **Signed-in-no-org "Set up workspace" CTA** (iff `!hasOrg && authed`) — blue box + "Set up workspace" → `/onboarding` | lines 198–211 |
| R10 | **Signed-in-no-org "Checklist items to review"** (iff `!hasOrg && authed`) — first 10 `CHECKLIST.items` | lines 213–228 |
| R11 | **Footer links** — "Back to checklist", "Home" | lines 232–245 |
| R-MISSING-CADENCE | **Missing next-reassessment / cadence indicator** (briefed as key region; not in code today) | N/A today |
| R-MISSING-EXPORT | **Missing export / share options** (briefed as key region; not in code today) | N/A today |

---

## Personas (rows)

Fixed order per `state-matrix-template.md` §Rows:
`ANON | O1 | O2 | O3 | IT1 | E1 | E2`

Per personas.md coverage table, `/summary` is reachable by ALL personas (public). Behaviour branches on auth + org state.

---

## Matrix

Legend: `—` = region not rendered. `DEFECT — …` = today diverges from intent.

### R1 — Header

| Persona | Expected | Status |
|---|---|---|
| All | H1 "Summary". | OK |

Linked invariants: —.

### R2 — Loading placeholder

| Persona | Expected | Status |
|---|---|---|
| All | Brief "Loading…" state during session + dashboard fetch. | OK (transient; no invariant violation). |

Linked invariants: INV-state-pure-of-navigation (loading state must resolve to a deterministic `signin` or `summary` view based on auth + data; not on sessionStorage or prior visits). OK.

### R3 — Sign-in CTA card (ANON)

| Persona | Expected | Status |
|---|---|---|
| ANON | Blue info box: "Sign in to see your progress summary." Body: "When you sign in, your summary shows completion stats, highlights items that still need attention, and tracks your team's overall security posture." CTA: "Sign in" → `/login`. | DEFECT S-TEASER-PROMISE-MISMATCH (new finding, Medium) — the body promises three things: "completion stats", "highlights items that still need attention", "tracks your team's overall security posture". Signed-in R6 renders completion stats (OK). R7 renders generic advice copy (not a "highlights items that need attention" list; OK-adjacent). **No team-progress section appears on the signed-in view at all** — "your team's overall security posture" is a broken promise per-persona. Fix options: (a) add a lightweight team-roll-up to R6/R7 when `hasOrg`; (b) change the teaser copy to match reality and move team posture to `/workspace/dashboard`. Priority: Medium. |
| E1 | As ANON. | Same DEFECT. |
| O1 / O2 / O3 / IT1 / E2 | — (signed in; hit R6-R8 or R9-R10 branch instead) | N/A for this row |

Linked invariants: candidate `INV-teaser-promises-kept` — every "when you sign in, you'll see X" promise on a teaser page must correspond to a rendered region on the signed-in view.

### R4 — Teaser example card (ANON)

Hard-coded: "Overall progress 67%", "12 Done · 3 Unsure · 2 Skipped", footer "Plus: team progress, per-item drill-down, and printable summary."

| Persona | Expected | Status |
|---|---|---|
| ANON | Example card with "EXAMPLE" badge. | DEFECT S-TEASER-HARDCODED (new finding, Low) — example numbers are static. An ANON who returns after completing items as O2 but on a different device still sees 67%/12/3/2 rather than a sample derived from their device's public-checklist localStorage. Low priority — "Example" badge signals intent. Noting for completeness. |
| ANON | Footer promises "per-item drill-down, and printable summary". These exist at `/workspace/dashboard` and `/workspace/report` but NOT on `/summary` signed-in view. | DEFECT S-TEASER-PRINTABLE-PROMISE (extends S-TEASER-PROMISE-MISMATCH) — "printable summary" implies an export on this page. None exists (R-MISSING-EXPORT). Either add a print-friendly route on this page, or remove "printable summary" from the teaser copy and point to `/workspace/report` from the signed-in view. Priority: Medium. |
| E1 | As ANON. | Same defects. |
| O1/O2/O3/IT1/E2 | — (signed in branch) | N/A |

Linked invariants: candidate `INV-teaser-promises-kept`.

### R5 — ANON secondary links

| Persona | Expected | Status |
|---|---|---|
| ANON, E1 | "Browse the checklist first" → `/checklist`. "Home" → `/`. | OK |
| Others | — | N/A |

### R6 — Signed-in real-data progress card

Renders iff `hasOrg && viewMode === "summary"`.

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 (hasActiveAssessment) | "Progress: {percent}%", progress bar (teal), line "Done: {done} · Not sure: {unsure} · Skipped: {skipped} · Total: {total}". Numbers match `/workspace/dashboard` exactly. | DEFECT S-NO-SUMMARY-PARITY-INVARIANT (new finding, Low) — INV-dashboard-report-parity enforces Dashboard ↔ Report parity, but `/summary` also reads from `/api/dashboard` and must agree. Extend that invariant to cover `/summary` OR codify a new `INV-summary-dashboard-parity`. Low-severity today because both pages call the same API, but a future refactor splitting the endpoint could silently fork them. |
| O1 (no active assessment) | `stats = {0,0,0,0,0}`. Progress card renders with 0% — visually empty but structurally present. | DEFECT S-ZERO-ASSESSMENT-EMPTY (new finding, Low) — a 0% progress bar with no explanation reads as a bug to a new owner who hasn't started an assessment yet. Recommend: when `stats.total === 0`, render an empty-state "No assessment started yet" with a CTA to `/workspace/assessments` instead of the zero-value card. |
| O2 (hasActiveAssessment=true per persona default) | Real numbers render. | OK (contingent on S-NO-SUMMARY-PARITY-INVARIANT being enforced). |
| O3 (hasActiveAssessment=false per persona default) | As O1 no-assessment case. | Same DEFECT S-ZERO-ASSESSMENT-EMPTY. |
| IT1 | As O2. `/api/dashboard` returns org-scope stats to any member. | OK |
| E2 | As O2. | OK |
| ANON, E1 | — (signin branch) | N/A |

Linked invariants: INV-dashboard-report-parity (needs extension — see gaps); INV-no-not-set-when-derivable (a 0% progress bar for "no assessment" is a derivable empty state — render the empty-state copy, not the zero values).

### R7 — Signed-in "Next steps" section

Renders iff `hasOrg`.

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 / IT1 / E2 (done < total) | Heading "Next steps". Static advice: "Start with 'Not sure' and 'Skipped'. If you can only do a few things, prioritize MFA, backups, and updates." | DEFECT S-NEXT-STEPS-GENERIC (new finding, Medium) — advice is static. It does not dynamically reflect what the user ACTUALLY has as "Not sure" / "Skipped" items. The teaser (R3) promised "highlights items that still need attention"; the real view delivers generic prose. Fix: list up to 5 of the user's actual `unsure`/`skipped` item titles. Priority: Medium (closes S-TEASER-PROMISE-MISMATCH). |
| O1 / O2 / O3 / IT1 / E2 (done === total && total > 0) | Bonus line "Nice — everything is marked 'Done'. Reassess quarterly." | OK — matches cadence messaging. |
| ANON, E1 | — (signin branch) | N/A |

Linked invariants: candidate `INV-teaser-promises-kept`.

### R8 — Signed-in "Go to workspace dashboard" CTA

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 / IT1 / E2 | Teal "Go to workspace dashboard" button → `/workspace/dashboard`. | OK |
| ANON, E1 | — | N/A |

Linked invariants: INV-role-page-access (Dashboard is permitted for IT1/E2 per personas.md; OK).

### R9 — Signed-in-no-org "Set up workspace" CTA

Renders iff `authed && !hasOrg && viewMode === "summary"`.

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 (pre-setup) | Blue box "Set up your workspace to track real progress." CTA → `/onboarding`. | OK. Covers the transitional moment between login and onboarding. |
| O1 / O2 / O3 (post-setup) | — (hasOrg branch). If `/api/dashboard` throws for any reason other than 404, `hasOrg` stays false and this cell wrongly renders — the user sees "Set up your workspace" while they already have one. | DEFECT S-NO-ORG-FALLBACK-WRONG (new finding, Medium) — lines 52–61 catch `/api/dashboard` errors silently and fall through to `hasOrg = false`. A transient 500 from Supabase makes a legitimate owner see "Set up your workspace". Fix: distinguish "no-org 404" from "API error" — render a retry/error banner for the latter, only R9 for the former. INV-no-raw-db-errors adjacent. Priority: Medium. |
| IT1 / E2 | — (they have an org via O2; should hit R6-R8). If falls through to R9, bug — IT1/E2 should never see "Set up your workspace" because they cannot create a new org from here. | DEFECT S-NO-ORG-FALLBACK-WRONG (same root) — worse for non-admin personas because `/onboarding` CTA would not achieve anything useful for them. Priority: Medium. |
| ANON, E1 | — (signin branch) | N/A |

Linked invariants: INV-state-pure-of-navigation (the branch decision must be a function of a known `dashboardApiResult.status`, not a silent catch).

### R10 — Signed-in-no-org "Checklist items to review"

Renders iff `authed && !hasOrg`. First 10 items from `CHECKLIST.items`, plus "…and N more." suffix.

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 (pre-setup) | First 10 item titles as bulleted list. R9 CTA drives them to onboarding. | DEFECT S-STATIC-SLICE-IRRELEVANT (new finding, Low) — slicing the first 10 items regardless of user state does not match the teaser promise of "highlights items that still need attention". For a pre-setup user there are no responses yet, so any 10 items would do — but the copy "Checklist items to review" implies filtered. Rename to "What you'll be assessing" or link to `/checklist` for the full list. |
| Others | — | N/A |

Linked invariants: INV-public-checklist-readonly (this region is NOT the public checklist, just item titles — OK).

### R11 — Footer links

| Persona | Expected | Status |
|---|---|---|
| All | "Back to checklist" → `/checklist`. "Home" → `/`. | OK |

### R-MISSING-CADENCE — Next-reassessment / cadence indicator

The brief lists "cadence/next-reassessment info" as a key region. **Not present today.**

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 / IT1 / E2 (hasOrg) | A line "Next reassessment due: {date}" driven by the org's cadence state — same data source as the Home cadence banner (Home matrix R2). | DEFECT S-NO-CADENCE (new finding, Medium) — the teaser (R3 body) promises "tracks…security posture"; on the signed-in view there is no reassessment indicator. Adding one aligns `/summary` with the Home cadence banner and creates a natural cross-page parity. Priority: Medium. |
| ANON, E1 | Example cadence in the teaser would strengthen the sign-up case but is optional. | Nice-to-have. |

Linked invariants: candidate `INV-cadence-visible-where-promised`.

### R-MISSING-EXPORT — Export / share options

The brief lists "export options (if any)" as a key region. **Not present today.**

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 (admin) | Given the teaser promises "printable summary", an export action (Print / PDF / email-to-self) belongs here or clearly links to `/workspace/report`. | DEFECT S-NO-EXPORT (new finding, Medium) — at minimum, add an explicit "Open printable report →" link to `/workspace/report`. Without it, the ANON teaser's "printable summary" promise (R4) is unfulfilled. Cross-links to S-TEASER-PRINTABLE-PROMISE. |
| IT1 / E2 | No `/workspace/report` access (role-restricted). "Print this page" browser behaviour is fine as fallback; no custom export required. | OK. |
| ANON, E1 | — | N/A |

Linked invariants: candidate `INV-teaser-promises-kept`.

---

## Invariants referenced

| ID | Statement | Cells |
|---|---|---|
| INV-dashboard-report-parity | `/summary` should be included (today scoped to Dashboard ↔ Report). | R6 |
| INV-no-not-set-when-derivable | 0/0 stats for a user with no assessment should render as an empty-state, not a zero-value card. | R6 |
| INV-state-pure-of-navigation | View mode is a function of auth + API result, not session cache. | R2, R9 |
| INV-no-raw-db-errors | API errors should not silently fall through to a wrong view branch. | R9 |
| INV-role-page-access | Target of "Go to workspace dashboard" must be role-accessible for the viewing persona. | R8 |
| INV-public-checklist-readonly | R10's item list is titles only, not interactive. | R10 |

---

## Invariant gaps (proposed new invariants)

1. **`INV-summary-dashboard-parity`** (or extend `INV-dashboard-report-parity` to cover `/summary`) — `/summary`, `/workspace/dashboard`, `/workspace/report` all source from the same assessment-stats RPC and render the same numbers within the same minute. Applies to all three routes. Personas: O1, O2, O3, IT1, E2. Why: closes S-NO-SUMMARY-PARITY-INVARIANT. Test idea: scrape `percent / done / unsure / skipped / total` from all three pages and assert equality.

2. **`INV-teaser-promises-kept`** — Every "when you sign in, you'll see X" promise on a public teaser/sign-in CTA must correspond to a rendered region on the signed-in view for the relevant persona. Applies to `/summary`, `/checklist`, `/` (landing). Personas: all. Why: closes S-TEASER-PROMISE-MISMATCH, S-TEASER-PRINTABLE-PROMISE, S-NEXT-STEPS-GENERIC. Test idea: maintain a tiny promise→region map in `docs/quality/teaser-promises.yaml`; one spec iterates and asserts each promise resolves to an element on the signed-in view.

3. **`INV-cadence-visible-where-promised`** — Any surface that promises "reassessment cadence" / "posture tracking" must render the cadence indicator. Applies to `/summary`, `/workspace`, `/workspace/dashboard`. Personas: O1, O2, O3 (admin); IT1, E2 (read-only). Why: closes S-NO-CADENCE.

---

## Defect summary (feeds PI-16 fix scope)

| Cell | Tag | PDF # / source | Priority | One-liner |
|---|---|---|---|---|
| R3 × ANON/E1 | S-TEASER-PROMISE-MISMATCH | new finding | Medium | Teaser promises team posture + item highlights + printable summary; signed-in view delivers none of them. |
| R4 × ANON/E1 | S-TEASER-HARDCODED | new finding | Low | Example numbers are static 67% / 12 / 3 / 2. |
| R4 × ANON/E1 | S-TEASER-PRINTABLE-PROMISE | new finding | Medium | "Printable summary" promise unfulfilled (R-MISSING-EXPORT). |
| R6 × all signed-in | S-NO-SUMMARY-PARITY-INVARIANT | new finding | Low | INV-dashboard-report-parity doesn't include `/summary`; silent divergence risk. |
| R6 × O1/O3 (no assessment) | S-ZERO-ASSESSMENT-EMPTY | new finding | Low | Zero-value card reads as a bug for users who haven't started. |
| R7 × all signed-in | S-NEXT-STEPS-GENERIC | new finding | Medium | Advice is static; does not "highlight items that still need attention" as promised. |
| R9 × O1-O3 post-setup / IT1 / E2 | S-NO-ORG-FALLBACK-WRONG | new finding | Medium | Dashboard API errors silently fall through to "Set up your workspace" for users who already have one. |
| R10 × O1-O3 pre-setup | S-STATIC-SLICE-IRRELEVANT | new finding | Low | First-10 slice doesn't match the "items to review" label. |
| R-MISSING-CADENCE | S-NO-CADENCE | new finding | Medium | No reassessment/cadence indicator despite "posture tracking" promise. |
| R-MISSING-EXPORT | S-NO-EXPORT | new finding | Medium | No export / printable link, despite teaser promising one. |

---

## Notes / dependencies

- `/summary` is auth-aware and public — it straddles the anon/authed boundary. Every defect above is a teaser-vs-reality consistency issue, not a functional-correctness issue. The consistency lens is the right one for a matrix: individually every section works; together the promises don't match.
- R-MISSING-CADENCE and R-MISSING-EXPORT are strong candidates for a single PI-17 "Summary page completeness" feature. They also close the three invariant gaps at once.
- The signed-in view has no explicit path to re-assess. A natural place for a "Start new assessment" CTA would be on this page for owners when `stats.done === stats.total` — today only the "Reassess quarterly" prose exists. Cross-link to the Assessments matrix (future).
- `CHECKLIST.items.slice(0, 10)` imports the static master list; the "…and N more" relies on `CHECKLIST.items.length`. If the checklist changes, this slice is stable but uninformative. Acceptable for today.
- The `/summary` page is referenced from `/checklist` (the public read-only variant) as "Summary" — ensure the checklist matrix, when authored, cross-links back here so teaser promises are traceable both ways.
