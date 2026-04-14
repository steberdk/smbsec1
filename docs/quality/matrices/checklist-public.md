# State Matrix — Public Checklist (`/checklist`)

**Page file:** `frontend/app/checklist/page.tsx`
**Route:** `/checklist`
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** PI-16 Phase A retrofit (F-045 / F-047)
**Persona source:** `docs/quality/personas.md` (last reviewed 2026-04-14)
**Invariant source:** `docs/quality/invariants.md`
**Last full walkthrough:** 2026-04-14 by UX + Architect (source-read only)
**Linked features:** F-045, F-047; legacy F-001 (public checklist)

---

## Canonical source of truth

The public checklist has **three** view modes derived from a single auth check on mount:

- `viewMode = "loading"` — initial auth-check in flight.
- `viewMode = "readonly"` — no Supabase session (ANON) OR stale-token error.
- `viewMode = "interactive"` — valid Supabase session; allows read/write against `/api/checklist-progress` (legacy `user_checklists` table, **not** the assessment model).

Crucial separation: this page's `progress` state is the **legacy localStorage-sync'd `ChecklistProgress`**, NOT the `assessment_responses` used by `/workspace/checklist`. The two models are not reconciled. See Notes for the architectural implication.

Inputs:
- Supabase session (`supabase.auth.getSession()`) on mount.
- `CHECKLIST` static content from `@/lib/checklist/items` (hard-coded, not the DB `checklist_items`).
- `fetchRemoteProgress(token)` / `putRemoteProgress(token, progress)` against `/api/checklist-progress`.

---

## Page regions (columns)

Enumerated by reading `page.tsx` top-to-bottom:

| Region ID | UI name (as rendered) | Code anchor |
|---|---|---|
| R1 | **Page title** — `<h1>"Security checklist"` + "View summary →" link | lines 161–166 / 179–184 / 237–242 |
| R2 | **Loading view** — skeletal progress bar at 0% + "Loading…" text | lines 158–174 |
| R3 | **Readonly sign-in prompt** — blue card: "Sign in to save your progress and work through the checklist with your team." + "Sign in" button → `/login` | lines 186–196 |
| R4 | **Readonly checklist body** — all groups + items, `readOnly=true`, no response buttons | lines 198–219 |
| R5 | **Readonly footer** — "Back to home" link | lines 222–229 |
| R6 | **Interactive progress header** — progress bar + `decided / total` + Done/Not sure/Skipped counts + sync status footer | lines 244–264 |
| R7 | **Interactive checklist body** — all groups + items, response buttons enabled | lines 266–287 |
| R8 | **Interactive footer** — "Summary & next steps" primary + "Back to home" secondary | lines 289–302 |
| R9 | **Auth redirect behaviour** — does the page redirect signed-in users to `/workspace/checklist`? | N/A — see ⚠ DEFECT below |

---

## Matrix

Legend: `N/A` = persona cannot reach page. `⚠ DEFECT` = today's code diverges from intended. Invariant IDs from `invariants.md` in brackets.

### R1 — Page title

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | `"Security checklist"` + "View summary →" link to `/summary` | — | OK |
| O1 | (see R9 — persona should be redirected; if we override and stay, title renders) | — | ⚠ via R9 |
| O2 | Same as O1 | — | ⚠ via R9 |
| O3 | Same as O1 | — | ⚠ via R9 |
| IT1 | Same as O1 | — | ⚠ via R9 |
| E1 | Reachable as anon (not yet signed in) — shows same as ANON. | — | OK |
| E2 | Same as O1 | — | ⚠ via R9 |

### R2 — Loading view

Rendered while `viewMode === "loading"` (first mount, before `supabase.auth.getSession()` resolves).

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | Visible transiently, then → R3/R4 (readonly). | INV-state-pure-of-navigation | OK |
| O1 / O2 / O3 / IT1 / E2 | Visible transiently, then → redirect to `/workspace/checklist` (see R9). | INV-state-pure-of-navigation | ⚠ via R9 |
| E1 | Same as ANON. | — | OK |

### R3 — Readonly sign-in prompt

Rendered iff `viewMode === "readonly"`.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | Visible. Blue card + "Sign in" button → `/login`. | INV-public-checklist-readonly | OK |
| O1 / O2 / O3 / IT1 / E2 | Not rendered — signed-in users should be redirected (R9). If redirect missing (today), they never reach readonly: they land in R6–R8 (`interactive`) — so this cell is effectively hidden for them, but for the wrong reason. | INV-public-checklist-readonly, INV-state-pure-of-navigation | N/A — but see R9 for the upstream defect. |
| E1 | Visible (E1 persona is anon-from-this-page's-viewpoint). | INV-public-checklist-readonly | OK |

### R4 — Readonly checklist body

Rendered iff `viewMode === "readonly"`.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | All 6 groups + items rendered. `<ChecklistItemCard readOnly={true}>` so response buttons are visually disabled AND no-op (`onSetStatus={() => {}}`). AI guidance hidden (component does not render it in readonly). | INV-public-checklist-readonly | OK (subject to a sub-check — see note below) |
| O1 / O2 / O3 / IT1 / E2 | Not rendered. | — | N/A via R9 |
| E1 | Same as ANON. | INV-public-checklist-readonly | OK |

Sub-check: `INV-public-checklist-readonly` says "the presence of those buttons in the DOM is the signal a user has been promoted to interactive mode — they must not appear pre-auth." If `ChecklistItemCard` renders the buttons with `disabled` rather than omitting them from the DOM, the invariant is violated. ⚠ POSSIBLE DEFECT — new finding: component code was not verified in this pass. Action for BA: inspect `ChecklistItemCard` when `readOnly={true}` and confirm buttons are absent from DOM, not merely disabled. If disabled, file as F-XXX follow-up.

### R5 — Readonly footer

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | "Back to home" link → `/`. | — | OK |
| Others | N/A via R9 | — | N/A |
| E1 | Same as ANON. | — | OK |

### R6 — Interactive progress header

Rendered iff `viewMode === "interactive"`.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | Not rendered (no session). | INV-public-checklist-readonly | OK |
| O1 / O2 / O3 / IT1 / E2 | **SHOULD BE** not rendered — the intended behaviour per the plan is a redirect to `/workspace/checklist`. Today it IS rendered and shows progress from the legacy `user_checklists` table (a different progress surface than the workspace checklist). | INV-state-pure-of-navigation, INV-dashboard-report-parity (by analogy — two progress sources for the same user) | ⚠ DEFECT — new finding: signed-in users reach this page see a **second, parallel progress state** that never reconciles with their `/workspace/checklist` progress. Root cause: no redirect. See R9. |
| E1 | Not rendered. | — | OK |

### R7 — Interactive checklist body

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | Not rendered. | INV-public-checklist-readonly | OK |
| O1 / O2 / O3 / IT1 / E2 | SHOULD be not rendered (redirect to `/workspace/checklist`). Today IS rendered. Response buttons are interactive and PUT to `/api/checklist-progress` — NOT to `assessment_responses`. | INV-state-pure-of-navigation | ⚠ DEFECT — new finding: writes go to the legacy table; no effect on the real assessment. User thinks they're making progress but Dashboard/Report show zero. |
| E1 | Not rendered. | — | OK |

### R8 — Interactive footer

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | Not rendered. | — | OK |
| O1 / O2 / O3 / IT1 / E2 | SHOULD be not rendered. Today shows "Summary & next steps" (→ `/summary` public) + "Back to home". Neither link takes the signed-in user back to their workspace. | INV-state-pure-of-navigation | ⚠ DEFECT — same root cause as R6/R7: no redirect. |
| E1 | Not rendered. | — | OK |

### R9 — Auth redirect behaviour

The coordinator's hint asked: "signed-in users should arguably redirect to `/workspace/checklist` (confirm by reading code — flag as defect if not)."

Source `frontend/app/checklist/page.tsx` lines 39–78 (Effect 1 — auth check) — on detecting a valid session, the page does:

```ts
accessTokenRef.current = token;
supabase.auth.onAuthStateChange(...);
setViewMode("interactive");
```

There is **no** `router.replace("/workspace/checklist")` call. Signed-in users stay on `/checklist` and write to the legacy progress table.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | No redirect — correct. | INV-public-checklist-readonly | OK |
| O1 | Expected: `router.replace("/workspace/checklist")` on mount after session detected. | INV-state-pure-of-navigation, INV-checklist-track-visibility (by implication — this page does not respect track visibility) | ⚠ DEFECT — new finding: no redirect wired. |
| O2 / O3 / IT1 / E2 | Same as O1. | Same | ⚠ DEFECT — same. |
| E1 | No redirect (anon from this page's viewpoint). | — | OK |

Defect owner-of-record: needs a new feature. Proposed F-050 (or next available number) — "Redirect signed-in users from `/checklist` to `/workspace/checklist`." AC sketch: (1) On `viewMode` transition to `"interactive"`, emit `router.replace("/workspace/checklist")`. (2) Verify no flash of interactive state. (3) Deprecate `user_checklists` writes from this page entirely — once authenticated users can no longer reach R6/R7, the legacy write path should be removed in the same PI.

---

## Invariants referenced

| ID | Cells |
|---|---|
| INV-public-checklist-readonly | R3, R4, R6, R7, R9 (ANON rows). |
| INV-state-pure-of-navigation | R2, R6, R7, R8, R9. |
| INV-dashboard-report-parity | R6 (signed-in row) — this page is a third, unreconciled progress source. |
| INV-checklist-track-visibility | R9 signed-in rows (this page ignores track visibility; another reason to redirect). |

## Candidate new invariants surfaced by this matrix

| Proposed ID | Trigger cell | Why |
|---|---|---|
| INV-single-progress-source-per-user | R6/R7 signed-in rows | An authenticated user's checklist progress must have a single source of truth. The legacy `user_checklists` write path on this page violates this silently. Invariant would fail CI when two tables capture the same user's progress without reconciliation. |
| INV-public-page-no-signed-in-write | R7 signed-in rows | A page marked "public" must never accept authenticated writes that diverge from the authenticated equivalents. Either redirect or write to the same table the authenticated page uses. |

---

## Defect summary (feeds PI-16 fix scope)

| Cell | PDF # | One-liner |
|---|---|---|
| R9 × all signed-in personas | new finding | No redirect from `/checklist` to `/workspace/checklist` for signed-in users. |
| R6/R7 × all signed-in personas | new finding (root cause = R9) | Signed-in users write to the legacy `user_checklists` table; this progress is not reflected in Dashboard/Report. |
| R4 × ANON | possible finding, needs component-level verification | If `ChecklistItemCard readOnly={true}` renders buttons as `disabled` rather than omitting them, `INV-public-checklist-readonly` is violated in spirit (buttons in DOM). |

---

## Notes / dependencies

- The legacy `user_checklists` table is marked "do not extend" in `CLAUDE.md` — this matrix confirms that guidance is wise: the table is a dead branch that still collects writes from this page for signed-in users, producing a silent data-divergence defect.
- Proposed fix deletes the `interactive` view mode entirely for signed-in users. Pre-requisite: confirm no BA/PM test expects to use `/checklist` as a signed-in interactive surface. Persona coverage table in `personas.md` lists `/checklist` for all personas — but as **read-only** for signed-in personas (implicit by persona description; explicit in `INV-public-checklist-readonly`). Redirecting is consistent with that.
- `/summary` (public) has the same class of issue — should also be checked in a follow-up matrix. Not in this PR's scope.
