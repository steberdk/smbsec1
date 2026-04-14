# State Matrix — Home (`/workspace`)

**Page file:** `frontend/app/workspace/page.tsx`
**Route:** `/workspace`
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** Intended behaviour (F-048 shipped; was Pilot for F-045 PI-16 Quality Baseline)
**Fallback persona list used:** ANON, O1, O2, O3, E1, E2, IT1 (see note at end — `docs/quality/personas.md` did not exist when this matrix was authored).

---

## Canonical source of truth

Every cell below assumes the Home page derives its state from **one** selector:

```
getOwnerHomeState(org, membership, members, assessments) ->
  {
    subtitle: "Owner" | "Owner · IT Executor",
    itExecutor: { id, name, isSelf } | null,
    pendingItInvite: boolean,
    memberCount: number,          // accepted members, incl. owner
    hasActiveAssessment: boolean,
    steps: [ { id, title, description, href, cta, done } ]
  }
```

This is F-048 AC-1. No cell in this matrix depends on any other derivation (no client-side session cache, no first-visit flag, no ad-hoc props). If you change a cell, you change the selector — not the JSX.

The selector ships in F-048 at `frontend/lib/selectors/ownerHomeState.ts`. `WorkspacePage` now fetches every dependency in one `Promise.all` and consumes the selector via `useMemo` — no per-component re-derivation. The ⚠ DEFECT flags previously in this matrix are resolved; see "Defect summary" at the bottom.

---

## Page regions (columns)

Enumerated by reading `frontend/app/workspace/page.tsx` (lines 61–173):

| Region ID | UI name (as rendered) | Code anchor |
|---|---|---|
| R1 | **Header identity** — `<h1>` org name + subtitle "Owner" / "Owner · IT Executor" | lines 63–67 |
| R2 | **Cadence banner** — amber/red "Security review due/overdue" | lines 69–88 |
| R3 | **Get started in N steps** block (admin + no active assessment only) | lines 90–123 |
| R4 | **My checklist** card (progress bar + `resolved / denominator`) | lines 127–137 |
| R5 | **Dashboard** card | lines 138–142 |
| R6 | **Team** card (admin only) | lines 143–149 |
| R7 | **Assessments** card (admin only) | lines 150–156 |
| R8 | **Org Settings** card (admin only) | lines 157–163 |
| R9 | **Settings & data** card (all roles, copy varies admin vs. non-admin) | lines 164–172 |

---

## Personas (rows)

Fallback list (from plan `wondrous-gathering-mccarthy.md` + F-045 AC-1):

| ID | Persona | Org state |
|---|---|---|
| ANON | Unauthenticated visitor | — |
| O1 | Owner — handles IT themself | `is_it_executor = true` on self; `memberCount = 1` |
| O2 | Owner — delegates IT to an **accepted** employee | `is_it_executor = true` on another accepted member |
| O3 | Owner — pending IT-exec invite (invited, not accepted) | `pendingItInvite = true`, no member has `is_it_executor` |
| E1 | Employee — invited, link not yet clicked | not in `org_members` yet |
| E2 | Employee — accepted, regular role (not IT exec) | `role = 'employee'`, `is_it_executor = false` |
| IT1 | IT Executor who is **not** the owner | `role = 'employee'`, `is_it_executor = true` |

Missing persona state surfaced by this matrix (see note to coordinator): O1/O2/O3 each need a sub-state for `memberCount === 1` vs. `memberCount >= 2`, because step 1 ("Invite team") is keyed off that.

---

## Matrix

Legend: `—` = region not rendered for this persona. `⚠ DEFECT` = today's code diverges from intended; `PDF #XX` points at Stefan's 2026-04-14 test report. Invariant IDs from `docs/quality/invariants.md` appear in brackets.

### R1 — Header identity (subtitle)

| Persona | Intended | Defect? |
|---|---|---|
| ANON | — (redirected to `/login` by `useWorkspace` / `useSession`) | |
| O1 | `"{org name}"` + subtitle `"Owner · IT Executor"` — derived from `itExecutor.isSelf === true` [INV-home-exec-parity] | OK today (`membership.is_it_executor` happens to agree) |
| O2 | `"Owner"` only — `itExecutor.isSelf === false` [INV-home-exec-parity] | OK |
| O3 | `"Owner"` only — no accepted exec; pending invite does not make the owner the exec [INV-home-exec-parity] | Fixed in F-048 — subtitle derives from `home.subtitleIsExec`, which is true only if an accepted member with `is_it_executor=true` matches the viewer. |
| E1 | — (not yet a member — onboarding / accept-invite flow) | |
| E2 | `"Employee"` (no IT-exec suffix) | OK |
| IT1 | `"Employee · IT Executor"` [INV-home-exec-parity] | OK |

**Nuance for PDF #43 (flagged by UX):** the contradiction Stefan saw was actually across **two independent org fields**:
1. `orgs.email_platform` — shown as "Not set" on Settings; **never** contributes to the Home subtitle.
2. `org_members.is_it_executor` — drives both the Home subtitle and Settings' IT-Executor dropdown.

The matrix only requires parity on (2) via `INV-home-exec-parity`. The "Not set" on (1) is a separate copy/placeholder issue owned by the Settings matrix, not Home. Documenting so a fix to the subtitle is not mistaken for fixing the email-platform label.

### R2 — Cadence banner

| Persona | Intended | Defect? |
|---|---|---|
| ANON | — | |
| O1 / O2 / O3 | Rendered iff `cadence.status ∈ {amber, red}`. Amber = "due soon"; Red = "overdue". Link: `/workspace/assessments`. | OK |
| E1 | — | |
| E2 / IT1 | Same as owners (API returns same cadence for org). | OK |

### R3 — "Get started in N steps" block

Visible **only** when `isAdmin && hasActiveAssessment === false` (line 59). Non-admins never see this block.

Intended step list (F-048 AC-2 — 4 steps per PI-16 product team consensus §4, matrix reflects shipped selector):

1. **Invite a team member** — `done` iff `memberCount >= 2`. CTA → `/workspace/team`.
2. **Assign or confirm your IT Executor** — `done` iff `itExecutor.source !== "none"`. Title when `source === "member"` & `isSelf`: `"IT checklist assigned to you"`; when `source === "member"` & not self: `"IT Executor: {itExecutor.name}"`; when `source === "pending-invite"`: `"IT Executor invite sent to {email}"`. CTA → `/workspace/settings`.
3. **Start your first assessment** — `done` iff `hasActiveAssessment`. CTA → `/workspace/assessments`.
4. **Share the summary** — `done` iff `hasActiveAssessment` (tightens in a later PI to require at least one teammate response; documented in selector comments). CTA → `/workspace/dashboard`.

| Persona | Intended cells (step 1 / step 2 / step 3 / step 4) | Defect? |
|---|---|---|
| ANON | — | |
| O1 (memberCount=1) | [1: open, "Invite team member"] · [2: ✓ "IT checklist assigned to you" (isSelf)] · [3: open] · [4: open] | Fixed in F-048 — selector emits 4 steps; step 2 title branches on `itExecutor.isSelf`. |
| O1 (memberCount≥2) | [1: ✓] · [2: ✓ isSelf] · [3: open or ✓] · [4: open] | Fixed in F-048 — `memberCount` drives step 1 deterministically. |
| O2 (memberCount≥2) | [1: ✓] · [2: ✓ "IT Executor: {name}"] · [3: open or ✓] · [4: open] | Fixed in F-048 — step 2 title reads `"IT Executor: {name}"` when `itExecutor.source === "member"` and not self. |
| O3 (pending invite, memberCount=1) | [1: open, "Invite team member"] · [2: open-but-informative, "IT Executor invite sent to {email}"] · [3: open] · [4: open] | Fixed in F-048 — `resolveItExecutor` reports `source === "pending-invite"`. Step 2 title surfaces the invitee so the user is never told to "assign" when an assignment is already en route. |
| E1 | — | |
| E2 / IT1 | — (non-admin; block never renders) | |

**Step strikethrough invariant [INV-home-steps-deterministic]**: for any persona, the `done` state of every step is a pure function of `getOwnerHomeState()` output. Navigating to another page and back MUST NOT change it.
Fixed in F-048 — all dependencies now resolve via ONE `Promise.all` in `page.tsx`, and the selector is called from `useMemo` keyed on the fetched payload. There is no session-cached "first visit" flag, no split-fetch race, so the previous PDF #44 / #44b flicker cannot recur. Invariant spec `frontend/tests/invariants.spec.ts` (F-046) asserts this by byte-equal snapshot across navigation.

### R4 — "My checklist" card

| Persona | Intended | Defect? |
|---|---|---|
| ANON | — | |
| O1 / O2 / O3 | Shows title "My checklist", description, `me.resolved / me.denominator`, progress bar uses `me.percent`. | OK (F-039 fix — cross-user isolation already verified) |
| E1 | — | |
| E2 / IT1 | Same behaviour; caller-only (`stats.me.percent`). | OK |

### R5 — Dashboard card

| Persona | Intended | Defect? |
|---|---|---|
| ANON | — | |
| O1 / O2 / O3 / E2 / IT1 | Always rendered. Static copy. | OK |

### R6 — Team card (admin-only)

| Persona | Intended | Defect? |
|---|---|---|
| O1 / O2 / O3 | Rendered. | OK |
| E2 / IT1 | Not rendered (`isAdmin === false`). | OK |

### R7 — Assessments card (admin-only)

| Persona | Intended | Defect? |
|---|---|---|
| O1 / O2 / O3 | Rendered. | OK |
| E2 / IT1 | Not rendered. | OK |

### R8 — Org Settings card (admin-only)

| Persona | Intended | Defect? |
|---|---|---|
| O1 / O2 / O3 | Rendered. Description: "Email platform, IT executor assignment." | OK — consistent with Settings page's fields. |
| E2 / IT1 | Not rendered. | OK |

### R9 — Settings & data card (all roles, copy varies)

| Persona | Intended copy | Defect? |
|---|---|---|
| O1 / O2 / O3 | "Export org data, manage members, or delete the organisation." | OK |
| E2 / IT1 | "View data storage info or delete your account." | OK |

---

## Invariants referenced

| ID | Statement | Cells |
|---|---|---|
| INV-home-exec-parity | Home subtitle's `· IT Executor` flag and Settings > IT Executor dropdown selection resolve from the same `itExecutor.id` value; they can never disagree. | R1 all persona rows; Settings matrix's "IT Executor" region. |
| INV-home-steps-deterministic | The `done` state of every "Get started" step is a pure function of `getOwnerHomeState()` output. Navigation does not change it. | R3 all persona rows. |
| INV-home-no-derivable-notset | Home never renders the literal "Not set" for a value that is already derivable from org state. (Home does not render `email_platform` at all — invariant holds vacuously but is listed to document the contrast with Settings.) | R1, R3. |

---

## Defect summary (F-048 resolution)

| Cell | PDF # | One-liner | Status |
|---|---|---|---|
| R1 × O3 | #43 | Subtitle said "· IT Executor" off the owner's own `is_it_executor` flag even when another executor was the real one. | Fixed — subtitle derives from `resolveItExecutor()` comparing accepted-member id to viewer id. |
| R3 × all owners | #42 | "Invite team member" step missing from the list. | Fixed — step 1 is always the Invite step; `done` iff `memberCount >= 2`. |
| R3 × O2 step 1 | #47 | Step 1 still said "Invite your IT Executor" after reassignment. | Fixed — no step conflates invite-team with invite-IT. Step 2's title surfaces the current executor name. |
| R3 × all owners step 1 | #44 | Strikethrough flickered on navigation (race between two fetches). | Fixed — single `Promise.all` + pure selector in `useMemo`. |
| R3 × all owners step 1 | #44b | "Invite team member →" link appeared/disappeared alongside #44. | Fixed — same root cause as #44. |

All five are guarded by INV-home-exec-parity + INV-home-steps-deterministic + INV-home-step-text-coherent in `frontend/tests/invariants.spec.ts` (F-046).

---

## Notes / dependencies

- `docs/quality/personas.md` did **not** exist when this matrix was authored. Persona IDs here use the plan's fallback list. When `personas.md` lands, confirm the IDs match; extend with `memberCount = 1` vs. `memberCount >= 2` sub-states for O1/O2/O3 (see coordinator note).
- Matrix assumes `getOwnerHomeState()` will be added at `frontend/lib/selectors/ownerHomeState.ts` (no existing selector module today — Architect note).
- Re-review this matrix when Product Team confirms final step count in 2b (see coordinator recommendation: 4 steps).
