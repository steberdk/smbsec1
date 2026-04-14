# State Matrix — Onboarding (`/onboarding`)

**Page file:** `frontend/app/onboarding/page.tsx`
**Route:** `/onboarding` (no query params consumed)
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** PI-16 Phase A retrofit (F-045). Authored 2026-04-14 by UX + Architect pair.

- Persona source: `docs/quality/personas.md` (last reviewed: 2026-04-14)
- Invariant source: `docs/quality/invariants.md`
- Last full walkthrough: 2026-04-14 by UX+Architect (source-only; no browser)
- Linked features: F-027 (IT Executor affirmative choice), F-045, F-048 (Home "Invite team" step — cross-page implication)

---

## Canonical source of truth

Onboarding is the **only** first-time org-creation surface. Its visible state is a pure function of:

```
(authState, orgMembershipState, pendingInviteToken, form{name, display_name, company_size, it_handling, it_person_email, it_person_name}, submitting, error)
```

Three mount-time effects (lines 35–64) gate whether the form is shown at all:

1. **Auth guard** — `!sessionLoading && !token` → `router.replace("/login")`.
2. **Pending-invite safety net** — `sessionStorage.getItem("smbsec_pending_invite_token")` → `router.replace("/accept-invite?token=…")`. This protects an invitee who somehow reached `/onboarding` (e.g. fresh signup in the same browser as a queued invite).
3. **Existing-org redirect** — `apiFetch("/api/orgs/me", token)` succeeds → `router.replace("/workspace")`. 404 alone keeps the user here; any other error is re-thrown.

All three guards must fire BEFORE the form is rendered (today: the component returns `null` during `sessionLoading || !token`, so only guard 1 is strictly pre-render; guards 2 and 3 can flicker the form for a frame if the `apiFetch` resolves slower than the initial paint — see R-GUARD defect).

---

## Page regions (columns)

Enumerated from `frontend/app/onboarding/page.tsx` (lines 105–261):

| Region ID | UI name (as rendered) | Code anchor |
|---|---|---|
| R-GUARD | **Mount-time guards** — auth / pending-invite / existing-org redirects | lines 35–64 (behaviour, not visible) |
| R1 | **Top bar** — `smbsec` wordmark (static, not a link) | lines 108–112 |
| R2 | **Header block** — H1 "Set up your organisation" + "Takes about 2 minutes. You can change everything later in Settings." | lines 115–118 |
| R3 | **Org name input** — required, `<input type=text>`, placeholder "Acme Ltd" | lines 122–134 |
| R4 | **Display name input** — optional, "Your name" + helper "Shown to your team on the dashboard instead of your email." | lines 136–148 |
| R5 | **Company size select** — optional, "Not sure" default + 4 size buckets | lines 150–164 |
| R6 | **IT handling radio group** — required, 4 options: `self`, `staff_member`, `external_it`, `not_sure` (F-027 affirmative choice) | lines 166–203 |
| R7 | **Conditional IT person block** — shown iff `it_handling ∈ {staff_member, external_it}`; blue-background panel with email (required for staff_member) + name (optional for staff_member) | lines 205–239 |
| R8 | **Error banner** — red box rendering `error` | lines 241–245 |
| R9 | **Submit CTA** — "Create organisation →" (or "Creating…" while submitting) | lines 247–253 |
| R10 | **Footer note** — "We'll send occasional reminder emails when your security review is due for reassessment." | lines 255–257 |
| R-MISSING-INVITE | **Missing "Invite your team" step** (intended region — not present in code today; see cross-page defect O-NO-INVITE-STEP) | N/A today |
| R-MISSING-LOCALE | **Missing locale selector** (briefed by UX but not present in code today; see defect O-NO-LOCALE) | N/A today |
| R-MISSING-PLATFORM | **Missing platform selector** (briefed by UX but not present in code today; see defect O-NO-PLATFORM) | N/A today |

---

## Personas (rows)

Fixed order per `state-matrix-template.md` §Rows:
`ANON | O1 | O2 | O3 | IT1 | E1 | E2`

Onboarding is reachable **only during the first-time org-creation window** for O1/O2/O3. After creation, R-GUARD(3) redirects to `/workspace`. Post-setup personas (O1/O2/O3 with an org already, IT1, E2) should never reach the form.

---

## Matrix

Legend: `—` = region not rendered. `N/A` = persona cannot reach page. `DEFECT — …` = today diverges from intent.

### R-GUARD — Mount-time guards

| Persona | Expected | Status |
|---|---|---|
| ANON | Guard 1 fires → `router.replace("/login")`; form never renders. | OK |
| O1 (pre-setup) | All three guards pass through → form renders. | OK |
| O1 (post-setup, has org) | Guard 3 fires → `router.replace("/workspace")`. | OK |
| O2 (post-setup) | Guard 3 fires → `/workspace`. | OK |
| O3 (post-setup) | Guard 3 fires → `/workspace`. | OK |
| IT1 | Has an org via invite acceptance → guard 3 fires → `/workspace`. | OK |
| E1 | Has pending-invite token in sessionStorage (set by `/login` — see login matrix R5) → guard 2 fires → `/accept-invite?token=…`. If sessionStorage was cleared or never set (e.g. E1 signed up fresh without following the invite link), guard 2 is a no-op; guard 3 returns 404 (no org); form renders — which is WRONG because the invitee would then create a second, personal org and never join O2's. | DEFECT O-INVITE-FALLTHROUGH (extends F-027) — the pending-invite protection relies on sessionStorage set by `/login`. An invitee who signs in via a different browser or after clearing storage bypasses guard 2. A defence-in-depth fix is to also check `invites` table server-side on `POST /api/orgs` for an outstanding invite matching the caller's email and refuse/re-route. Medium priority. |
| E2 | Has org; guard 3 fires → `/workspace`. | OK |

Linked invariants: INV-workspace-auth-boundary (auth redirect); candidate `INV-onboarding-no-post-setup-render` (below).

**Finding O-GUARD-FLICKER (source inspection):** the component renders `null` only during `sessionLoading || !token` (lines 101–103). Guards 2 and 3 are `useEffect` side effects with no render-gating state, so a user with a sessionStorage invite token or an existing org briefly sees the full form for one paint before the `router.replace` fires. Low-severity UX jitter. Fix: collect guard state into a `guardStatus: "checking" | "render" | "redirecting"` and return early while `"checking"`. Priority: Low.

### R1 — Top bar

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 (pre-setup) | `smbsec` wordmark visible (static, not a link). | DEFECT O-WORDMARK-NOT-LINK (new finding, Low) — `/login` (R1) makes the same wordmark a link to `/`; `/onboarding` does not. Inconsistent navigation affordance. Either both link to `/` or neither does. Recommend: link to `/` consistently. |
| ANON / IT1 / E1 / E2 | N/A — persona cannot reach this page (R-GUARD). | N/A |

Linked invariants: INV-state-pure-of-navigation (cosmetic). No functional invariant.

### R2 — Header block

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 (pre-setup) | H1 "Set up your organisation" + subtitle "Takes about 2 minutes. You can change everything later in Settings." | OK |
| Others | N/A — R-GUARD. | N/A |

Linked invariants: —.

### R3 — Org name input

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 | Required text input. Validated by `form.name.trim()` on submit. Empty → R8 error "Organisation name is required." | OK |
| Others | N/A | N/A |

Linked invariants: INV-no-raw-db-errors (duplicate-name handling — see submit path below).

### R4 — Display name input

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 | Optional. Helper copy "Shown to your team on the dashboard instead of your email." | OK — helper copy is accurate and aligns with Dashboard/Team matrices. |
| Others | N/A | N/A |

Linked invariants: —.

### R5 — Company size select

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 | Optional. Default "Not sure" (empty string); 4 buckets. | DEFECT O-COMPANY-SIZE-ORPHAN (new finding, Low) — `company_size` is collected but never surfaced again on any downstream page per `docs/user-flows.md` or the home/settings matrices. Either (a) use it on Home to right-size the "Invite N team members" suggestion, or (b) remove the field to reduce friction. Currently the field asks the user for info the system never uses — INV-no-asking-twice-adjacent (see gap). |
| Others | N/A | N/A |

Linked invariants: candidate `INV-no-orphan-form-fields`.

### R6 — IT handling radio group

Four options with sub-copy:
- `self` — "I do" / "You'll work through the IT checklist yourself."
- `staff_member` — "A staff member" / "We'll send them an invite with the IT checklist assigned."
- `external_it` — "An external IT company or consultant" / "We can send them an invite, or you can share the checklist with them."
- `not_sure` — "Not sure yet" / "We'll assign it to you for now."

| Persona | Expected | Status |
|---|---|---|
| O1 (intends to handle IT self) | Selects `self`. Post-submit: `org_members.is_it_executor = true` for the creating user. | OK — aligns with F-027 affirmative choice and with Home matrix R1 "Owner · IT Executor" subtitle. |
| O2 (intends to delegate) | Selects `staff_member`, enters IT person email. Post-submit: invite sent to that email with `is_it_executor = true` flag. | OK — aligns with personas.md O2 setup steps 2–3. |
| O3 (invites IT but invite will stay pending) | Same as O2. The difference from O2 is post-submit behaviour on the invite side (invitee never accepts); onboarding itself is identical. | OK. |
| O1 (not_sure) | Selects `not_sure` → copy "We'll assign it to you for now." Post-submit should set `is_it_executor = true` on the owner, matching O1's end state. | DEFECT O-NOTSURE-SILENT-ASSIGN (new finding, Medium) — copy says "we'll assign it to you for now" but does not tell the user how to change it later. A returning user who selected `not_sure` and then wants to hand IT off has no guidance. Add secondary line "You can reassign in Settings at any time." Matches INV-home-step-text-coherent spirit (the home page then shows IT Executor = owner, which matches the db state, but the user may not recall the implicit choice). |
| O1 / O2 / O3 (external_it, no email) | Submits without `it_person_email` (allowed for external_it). Post-submit: owner is the default executor (fallback). | DEFECT O-EXTERNAL-IT-FALLBACK-UNCLEAR (new finding, Low) — the `external_it` sub-copy "you can share the checklist with them" is vague: who gets the IT checklist in the DB? If the fallback is `is_it_executor=true` on the owner, say so. If it stays unassigned, say that. Today the user submits without knowing the outcome. |
| Others | N/A | N/A |

Linked invariants: INV-home-step-text-coherent (cross-page: the IT-handling choice drives Home subtitle and Home step 2; inconsistency here cascades to every owner home view). INV-no-not-set-when-derivable (Settings' IT Executor field must reflect the onboarding choice — not "Not set").

### R7 — Conditional IT person block

| Persona | Expected | Status |
|---|---|---|
| O1 (it_handling=self or not_sure) | Block hidden. | OK |
| O2 / O3 (it_handling=staff_member) | Block shown, blue panel. Email required. Name optional. Panel heading "IT staff member details". | OK |
| O1 / O2 / O3 (it_handling=external_it) | Block shown, blue panel. Email optional. Name field hidden (code: `{form.it_handling === "staff_member" && <…>}` — external_it hides the name). Panel heading "IT company details (optional)". | DEFECT O-EXTERNAL-IT-NAME-MISSING (new finding, Low) — name field is useful for "ACME IT Services" display on Settings, but is hidden for `external_it`. Either show it for both or explain why omitted. Same priority as O-EXTERNAL-IT-FALLBACK-UNCLEAR. |
| Others | N/A | N/A |

Linked invariants: —.

### R8 — Error banner

Renders when `error !== null`. Error sources:
- Client-side required-field checks (lines 73–77): "Organisation name is required.", "Please select who handles IT.", "Please enter the IT person's email."
- Submit API error: `e instanceof Error ? e.message : "Something went wrong. Please try again."`

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 | Red box. Client errors are app-defined. API errors are passed through via `e.message`. | DEFECT O-RAW-DB-ERROR (INV-no-raw-db-errors) — on POST `/api/orgs` failure (duplicate name, RLS rejection, constraint violation), the raw error message is surfaced. E.g. a unique-name clash from a previous seeded test run could leak `duplicate key value violates unique constraint`. Priority: Medium. Fix: whitelist known client-friendly messages, else show "Something went wrong. Please try again." Already the `else` branch of the ternary — but `e.message` covers almost every throw path from `apiFetch`. |
| Others | N/A | N/A |

Linked invariants: INV-no-raw-db-errors (directly affected).

### R9 — Submit CTA

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 | "Create organisation →" button. On click: client validation → `POST /api/orgs` → `router.replace("/workspace")`. Disabled while `submitting`; label "Creating…" during flight. | OK |
| Others | N/A | N/A |

Linked invariants: INV-workspace-auth-boundary (post-success redirects to `/workspace` which requires the just-created session).

### R10 — Footer note

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 | "We'll send occasional reminder emails when your security review is due for reassessment." | OK — aligns with the cadence banner in Home matrix R2 and the cadence RPC behaviour. |
| Others | N/A | N/A |

### R-MISSING-INVITE — The "Invite your team" step that isn't here

The brief flags PDF #42's implication: onboarding does not ask about inviting team members, so Home's "Invite team" step (F-048 step 1) becomes the **only** prompt a new owner ever sees. This is a deliberate design choice (keep onboarding to 2 minutes), but the matrix must surface it explicitly so the decision survives future refactors.

| Persona | Expected behaviour | Status |
|---|---|---|
| O1 / O2 / O3 | Onboarding does NOT prompt for team invites. Home step 1 ("Invite a team member") carries the full weight of the prompt. Documenting this as intentional, keyed on F-048. | OK — **provided F-048 step 1 exists on Home.** Today it does not (Home matrix flags the same defect under R3 × all owners, PDF #42). The two matrices together show the gap is systemic, not an onboarding regression. Cross-link: **see `home.md` R3 × all owners (PDF #42).** |
| Others | N/A | N/A |

Linked invariants: candidate `INV-invite-prompt-exists-somewhere` — the app must prompt an owner to invite a team member at least once in the onboarding → home → team path; if onboarding skips it, Home must carry it. (This is a weak invariant because it spans pages; better expressed as a cross-matrix property.)

### R-MISSING-LOCALE — Locale selector

The UX brief lists "locale selector" as a key region. **It is not in the code today.** `orgs.locale` exists in the DB (PI 10 i18n work) but is not surfaced on onboarding.

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 | A locale selector (en / da at minimum) should appear, defaulting to browser locale. | DEFECT O-NO-LOCALE (new finding, Medium) — without a locale picker at setup time, a Danish user lands in English workspace until they find Settings. Given PI 10's i18n investment, this is a product gap. Fix: add a 2-option select between R5 and R6. Priority: Medium. |
| Others | N/A | N/A |

### R-MISSING-PLATFORM — Platform selector

The brief lists "platform selector" as a key region (email-platform: `gmail` / `m365` / `other`). **It is not in the code today.** `orgs.email_platform` is set via Settings post-setup and displays "Not set" until then — PDF #43.

| Persona | Expected | Status |
|---|---|---|
| O1 / O2 / O3 | A platform selector at setup time; value drives later campaign template filtering and removes the "Not set" default from Settings. | DEFECT O-NO-PLATFORM (new finding, Medium; cross-links to Settings matrix's INV-no-not-set-when-derivable) — collecting this at onboarding eliminates the downstream "Not set" state entirely. Alternative: allow it to default from the owner's email domain heuristic. Priority: Medium. |
| Others | N/A | N/A |

Linked invariants: INV-no-not-set-when-derivable (directly) — the cheapest way to guarantee "Not set" never shows on Settings' email-platform field is to collect the value at onboarding.

---

## Invariants referenced

| ID | Statement | Cells |
|---|---|---|
| INV-workspace-auth-boundary | Unauthenticated users redirected to `/login`; authed users with an org redirected to `/workspace`. | R-GUARD |
| INV-no-raw-db-errors | Client and API errors render app-defined copy; never raw Postgres/Supabase text. | R8 |
| INV-home-step-text-coherent | The IT-handling choice cascades consistently to Home subtitle and Home step 2. | R6 |
| INV-no-not-set-when-derivable | Values collected at onboarding should never later render as "Not set" on Settings. | R-MISSING-PLATFORM, R6 |
| INV-home-exec-parity | The IT-executor resolution from onboarding's choice is the single source of truth for both Home subtitle and Settings dropdown. | R6, R7 |

---

## Invariant gaps (proposed new invariants)

1. **`INV-onboarding-no-post-setup-render`** — `/onboarding` mounted by a user who already has an `org_members` row redirects to `/workspace` before rendering any form input. Guards against double-org creation. Applies to `/onboarding`. Personas: O1, O2, O3 (post-setup), IT1, E2. Why: closes R-GUARD flicker (O-GUARD-FLICKER) at the invariant level. Test idea: seed persona with org; navigate to `/onboarding`; assert no `<input>` is ever visible (use `page.waitForSelector('input', { timeout: 100 })` expected to fail).

2. **`INV-no-orphan-form-fields`** — Every field collected from the user appears on at least one downstream surface within the first 7 days of use. Applies to `/onboarding`, `/workspace/settings`. Personas: O1, O2, O3. Why: surfaces O-COMPANY-SIZE-ORPHAN. Test idea: static check — grep `form.{field}` occurrences across `frontend/app/**` and require > 1.

3. **`INV-invite-prompt-exists-somewhere`** — For every new-owner persona, the app prompts "invite at least one team member" somewhere in the onboarding → home → team journey. Applies to `/onboarding`, `/workspace`. Personas: O1, O2, O3. Why: R-MISSING-INVITE cross-matrix gap. Test idea: per new-owner persona, walk onboarding → home → team; assert at least one visible CTA matches `/invite|add team/i`.

---

## Defect summary (feeds PI-16 fix scope)

| Cell | Tag | PDF # / source | Priority | One-liner |
|---|---|---|---|---|
| R-GUARD × E1 | O-INVITE-FALLTHROUGH | extends F-027 | Medium | Pending-invite protection relies on sessionStorage; cross-browser sign-in bypasses it. Needs server-side check. |
| R-GUARD × all | O-GUARD-FLICKER | new finding | Low | Form renders for one paint before existing-org redirect. |
| R1 | O-WORDMARK-NOT-LINK | new finding | Low | `smbsec` wordmark is a link on `/login` but not on `/onboarding`. |
| R5 | O-COMPANY-SIZE-ORPHAN | new finding | Low | Company size is collected but never used downstream. |
| R6 × O1(not_sure) | O-NOTSURE-SILENT-ASSIGN | new finding | Medium | "Not sure" silently assigns to owner; no mention of how to change. |
| R6 × external_it | O-EXTERNAL-IT-FALLBACK-UNCLEAR | new finding | Low | Copy doesn't say who gets the IT checklist when `external_it` is chosen without an email. |
| R7 × external_it | O-EXTERNAL-IT-NAME-MISSING | new finding | Low | Name field hidden for `external_it`; no explanation. |
| R8 | O-RAW-DB-ERROR | INV-no-raw-db-errors | Medium | `e.message` from `POST /api/orgs` surfaces raw Postgres/Supabase text. |
| R-MISSING-LOCALE | O-NO-LOCALE | new finding | Medium | No locale selector at setup; Danish users land in English until Settings. |
| R-MISSING-PLATFORM | O-NO-PLATFORM | new finding (cross-links PDF #43) | Medium | No email-platform selector at setup; Settings shows "Not set" until fixed. |
| R-MISSING-INVITE | O-NO-INVITE-STEP | PDF #42 (cross-page) | Documented | Onboarding intentionally skips invite-team prompt; Home F-048 step 1 must carry it. |

---

## Notes / dependencies

- Guard 2 (pending-invite sessionStorage) is a client-side convenience. The authoritative check belongs on `POST /api/orgs` (refuse creation if the caller has an outstanding invite). O-INVITE-FALLTHROUGH proposes moving the invariant there.
- The brief notes F-027 "added server-side guard — verify it's still there". Inspection confirms three client-side guards (lines 35–64). No server-side refusal logic is visible in this file; the check would live in `app/api/orgs/route.ts` — out of scope for this matrix but cross-link to the backend-scope feature.
- `company_size` and `display_name` are collected but neither appears in the Home matrix — treat O-COMPANY-SIZE-ORPHAN as a usage-coverage defect, not a form-UX defect.
- All three R-MISSING-* regions are candidates for a single PI-17 feature ("Onboarding completeness") rather than three separate tickets.
