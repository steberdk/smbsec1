# State Matrix — Settings (`/workspace/settings`)

**Page file:** `frontend/app/workspace/settings/page.tsx`
**Route:** `/workspace/settings`
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** Phase A retrofit for F-045 (PI-16 Quality Baseline)
**Persona source:** `docs/quality/personas.md` (reviewed 2026-04-14)
**Invariant source:** `docs/quality/invariants.md`
**Last full walkthrough:** 2026-04-14 (source-read, no live browser)
**Linked features:** F-045 (matrices), F-048 (Home/Settings parity), F-041 (IT-executor reassignment), F-049 (delete copy hygiene — adjacent)

---

## Scope

Settings is admin-only. Non-admins either render the "Only the organisation owner can change settings." fallback (line 167) or never have the nav entry. The page manages four independent org-level fields plus a link-out to GDPR:

1. Email platform (`orgs.email_platform`)
2. Campaign language / locale (`orgs.locale`)
3. AI guidance toggle (`orgs.ai_guidance_enabled`)
4. IT executor assignment (`org_members.is_it_executor` — via `/api/orgs/executor`)

Stefan's PDF findings landing here:
- **PDF #43** — Home subtitle shows "Owner · IT Executor" while Settings' IT executor field reads `"Not set"` (actually: Email platform shows "Not set" while Home/Team disagree on exec). Two sources of truth for one fact. Anchored by `INV-home-exec-parity` and `INV-no-not-set-when-derivable`.

Adjacent concern surfaced by this matrix (not a PDF # but a doc/UX drift):
- **Privacy page claims employees can delete their own account** (`frontend/app/privacy/page.tsx` line 129: `"Employees can delete their own account"`), but `/workspace/settings/gdpr` is gated `isAdmin === true` (line 35 of gdpr/page.tsx). Settings itself contains no self-delete UI for employees — and employees cannot reach Settings at all. Flagged as a defect candidate below (either privacy copy is wrong, or we need a new employee-facing self-delete surface).

---

## Page regions (columns)

Enumerated by reading `frontend/app/workspace/settings/page.tsx`:

| Region ID | UI name (as rendered) | Code anchor |
|---|---|---|
| R1 | **Header** — `<h1>"Settings"</h1>` | lines 166, 185 |
| R2 | **Access-restricted fallback** — rendered when `!isAdmin` | lines 163–170 |
| R3 | **Load error fallback** — rendered when members-fetch failed | lines 172–181 |
| R4 | **Email platform** dropdown with `PLATFORM_OPTIONS` (first option literal `"Not set"`) | lines 188–203 |
| R5 | **Campaign language** dropdown (en / da) | lines 205–220 |
| R6 | **AI guidance** toggle (checkbox + privacy-policy link) | lines 222–242 |
| R7 | **IT executor** dropdown (all accepted members; no "Not set" option because source-of-truth derivation guarantees a value) | lines 244–261 |
| R8 | **Save settings** button + transient message | lines 263–277 |
| R9 | **Reassign-IT-Executor confirmation dialog** (F-041) — rendered when executor changes AND there is an existing exec | lines 280–355 |
| R10 | **Data & Privacy link-out** — footer link to `/workspace/settings/gdpr` | lines 357–362 |

Out of scope: `/workspace/settings/gdpr` has its own matrix (Phase A Priority 2 — not in this file).

---

## Personas (rows)

`ANON | O1 | O2 | O3 | IT1 | E1 | E2` — fixed order.

Relevant sub-states: none — Settings behaviour is derived purely from `members` + `orgData.org`, which do not branch on `memberCount` or `hasActiveAssessment` for the admin's view.

---

## Matrix

Legend: `—` / `N/A` = region not rendered for this persona. `⚠ DEFECT` = today's code diverges from intended.

### R1 — Header

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A — redirected to `/login` | INV-workspace-auth-boundary | N/A |
| O1 / O2 / O3 | `<h1>"Settings"</h1>` — plain. No role subtitle (the subtitle concern lives on Home, not here). | INV-state-pure-of-navigation | OK |
| IT1 | H1 still renders *before* R2 ("Access restricted" is inside the same page shell — line 166 renders H1 inside the `!isAdmin` branch). That's consistent with `INV-role-page-access` (no privileged data leaks). | INV-role-page-access | OK |
| E1 | N/A — not authenticated | INV-workspace-auth-boundary | N/A |
| E2 | As IT1 | INV-role-page-access | OK |

### R2 — Access-restricted fallback

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | INV-workspace-auth-boundary | N/A |
| O1 / O2 / O3 | Hidden — admin bypass | INV-role-page-access | OK |
| IT1 | Rendered: `"Only the organisation owner can change settings."`. No member-fetch issued (the effect guards on `isAdmin` — line 53). | INV-role-page-access | OK |
| E1 | N/A | INV-workspace-auth-boundary | N/A |
| E2 | As IT1 | INV-role-page-access | OK |

### R3 — Load error fallback

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 | Rendered only when `/api/orgs/members` rejects (line 62). Red banner with the `apiFetch`-wrapped message. Must not leak raw Postgres. | INV-no-raw-db-errors | OK (wrapped via apiFetch) |
| IT1 / E1 / E2 | N/A — R2 renders instead | INV-role-page-access | N/A |

### R4 — Email platform dropdown (PDF #43 anchor region)

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Dropdown pre-selected to `orgs.email_platform` if set, else `""` (label `"Not set"`). The `"Not set"` option is **correct here** because `email_platform` is NOT derivable from other state — the org genuinely has no default. The UX should convey this is a user choice (the helper text at line 191–193 does so: `"Determines which step instructions are shown in the IT Baseline checklist."`). | INV-no-not-set-when-derivable (vacuously — `email_platform` is not derivable, so literal "Not set" is permitted with CTA / helper text), INV-state-pure-of-navigation | OK — and specifically the PDF #43 finding ("Home shows IT Executor but Settings says Not set") does NOT apply here because R4 is about the Email platform field, not the IT executor. See the **PDF #43 nuance** box below. |
| O2 | As O1. If O2 set `microsoft_365` during onboarding, dropdown shows `"Microsoft 365 (Exchange / Outlook)"`. | Same | OK |
| O3 | As O1 | Same | OK |
| IT1 / E1 / E2 | N/A — R2 | INV-role-page-access / INV-workspace-auth-boundary | N/A |

**PDF #43 nuance (carried over from `home.md`):** Stefan's PDF #43 describes *two* "Not set" moments on Settings: the Email platform label (correct behaviour — user really hasn't chosen) AND a contradiction where the Home subtitle implied "IT Executor assigned" while Settings' IT-executor reading was "Not set". The second half lives on R7 — see below.

### R5 — Campaign language dropdown

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 | Dropdown pre-selected to `orgs.locale` (default `"en"` at onboarding). Two options. Change is persisted via same PATCH as R4. No "Not set" option (there is always a value — `en` default). | INV-no-not-set-when-derivable, INV-state-pure-of-navigation | OK |
| IT1 / E1 / E2 | N/A — R2 | INV-role-page-access / INV-workspace-auth-boundary | N/A |

### R6 — AI guidance toggle

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 | Checkbox pre-set to `orgs.ai_guidance_enabled` (default `true`). Label: `"Allow AI guidance for this organisation"`. Helper text links to `/privacy` for the SCC / US sub-processor disclosure. Toggling off stops all AI requests for the org (enforced server-side on the AI endpoint — out of this matrix scope). | INV-state-pure-of-navigation | OK |
| IT1 / E1 / E2 | N/A — R2 | INV-role-page-access / INV-workspace-auth-boundary | N/A |

### R7 — IT executor dropdown (PDF #43 primary anchor)

This region **is the single source of truth** for IT-executor assignment and must agree with (a) Home subtitle, (b) Team R4 IT-Executor tag, (c) Team R5 IT-exec invite row (for O3).

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Dropdown lists all members (only the owner). Pre-selected to the owner (line 57 fallback: `orgData.membership.user_id` when no one has `is_it_executor` flag — but under O1 preconditions the owner DOES have the flag, so `currentExecutor` resolves to the owner directly). No "Not set" option. Home subtitle reads `"Owner · IT Executor"` — matches. | INV-home-exec-parity, INV-no-not-set-when-derivable | OK |
| O2 | Dropdown lists owner + IT1 + E2. Pre-selected to IT1. Home subtitle reads `"Owner"` (no `· IT Executor`) — matches (IT1, not O2, is the exec). Team page R4 shows `· IT Executor` next to IT1's row — matches. | INV-home-exec-parity, INV-no-not-set-when-derivable | OK |
| O3 | Pre-selected to… **this is where the PDF #43 defect lives**. O3's preconditions are: no accepted member has `is_it_executor = true`; a pending invite exists with the flag. The current code (lines 55–58) does: `currentExecutor = list.find((m) => m.is_it_executor)` — which returns `undefined` — then falls back to `orgData.membership.user_id` (the owner themselves). Result: the dropdown pre-selects the owner as the exec even though the owner is NOT the exec and an invite is outstanding. This is the contradiction Stefan saw — Home / Team believe the real answer ("pending invite to X"), Settings believes a third answer (owner). Intended behaviour per `INV-home-exec-parity`: dropdown has a `"(Invitation pending — {invitee_email})"` option selected by default, OR an explicit empty-state line above the dropdown reading `"Invitation pending for {invitee_email} — accepting will make them the IT Executor."` with the dropdown disabled or labelled "Currently unassigned". Either way the three surfaces (Home, Team, Settings) must show the same answer. | INV-home-exec-parity, INV-no-not-set-when-derivable | **⚠ DEFECT — PDF #43**: Settings falsely implies the owner is the IT executor when only a pending invite exists. Root cause: member-only derivation ignores the `invites` table. Fix owner: F-048 extension — the `getOwnerHomeState` selector (pilot on Home) must be the same source consumed by this dropdown. Either lift the selector to cover Settings, or have Settings read a shared `resolveItExecutor(members, pendingInvites)` helper.<br/><br/>**⚠ DEFECT candidate (adjacent)**: Dropdown today has no mechanism to *unset* the executor (no blank option; no "unassign" action). If Stefan reassigns from IT1 to E2 and then wants to revert to "no one assigned / handled by owner", the only path is to remove IT1 from the team (drastic). Consider an explicit "Owner handles IT" option. Not a PDF finding — flag for F-049 follow-up or future PI. |
| IT1 / E1 / E2 | N/A — R2 | INV-role-page-access / INV-workspace-auth-boundary | N/A |

### R8 — Save settings button + transient message

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Click saves all four fields (R4–R7) via two API calls: `PATCH /api/orgs/me` (platform + locale + ai_guidance) and conditionally `PUT /api/orgs/executor` (only if exec changed). Success → green `"Settings saved."`. Failure → red `"Failed: …"` (prefixed with literal `"Failed"` → the CSS branch on line 273 keys off the substring — works but fragile). Error text must be non-leaky. | INV-no-raw-db-errors, INV-state-pure-of-navigation | OK (class-tested; `apiFetch` wraps errors) |
| O2 | Same path as O1, but if the executor changed AND a current exec exists (O2 default), R9 dialog intervenes *before* the save fires (line 107). | INV-home-exec-parity, INV-destructive-action-double-confirm (reassignment is destructive to the previous exec's view) | OK |
| O3 | Same as O1. Because no current exec exists (defect in R7 notwithstanding), `hasCurrentExec` is `false` and R9 never fires — save writes directly. Once R7 is fixed to reflect the pending invite, saving a change-of-exec while an invite is still pending must either (a) revoke the pending invite and proceed, or (b) block with a non-leaky message "An invite is still pending — revoke it first from Team." Architect note: the cross-surface choice belongs in F-048 follow-up. | INV-home-exec-parity | OK in today's code; recommended guard added when R7 defect is fixed |
| IT1 / E1 / E2 | N/A — R2 | INV-role-page-access / INV-workspace-auth-boundary | N/A |

### R9 — Reassign-IT-Executor confirmation dialog (F-041)

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Hidden — no existing exec other than self; reassignment from self to another user WOULD trigger it (when O1 adds a team member and hands off IT). That path is legitimate. | INV-destructive-action-double-confirm | OK |
| O2 | Triggered when owner changes the dropdown from IT1 to E2 (or to self) AND clicks Save. Dialog shows three bullets (transfer, preserve answers, remove previous exec's section), ack checkbox required to enable confirm. Migration-pending error path maps `/migration_pending/i` → plain language `"IT Executor reassignment is not yet available — admin needs to apply migration 025."` (line 144). Satisfies `INV-no-raw-db-errors` + `INV-advertised-deletion-actually-deletes` (reassignment is advertised; if RPC missing, the user is told so). Cancel path (line 154) reverts the dropdown selection to `initialExecutor` so the page does not lie about current state. | INV-destructive-action-double-confirm, INV-no-raw-db-errors, INV-home-exec-parity, INV-state-pure-of-navigation | OK |
| O3 | Hidden — no existing exec. See R8 note about the guard when R7 defect is fixed. | INV-home-exec-parity | OK (today) |
| IT1 / E1 / E2 | N/A — R2 | INV-role-page-access / INV-workspace-auth-boundary | N/A |

### R10 — Data & Privacy link-out

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 | Footer link reads `"Data & Privacy (export, deletion)"` → `/workspace/settings/gdpr`. Does not render any deletion UI on this page; `/workspace/settings/gdpr` hosts it. | INV-role-page-access (GDPR page is admin-only today — see defect candidate below) | OK for owner flow |
| IT1 / E1 / E2 | N/A — R2 | INV-role-page-access / INV-workspace-auth-boundary | N/A |

---

## "Does Settings have a Delete-my-account or employee self-delete UI?" (coordinator asked)

**Answer (verified from source):** No. `/workspace/settings/page.tsx` has no self-delete UI anywhere. The closest is R10 (link to `/workspace/settings/gdpr`), which itself is gated on `isAdmin === true` (line 35 of `frontend/app/workspace/settings/gdpr/page.tsx`). Therefore:

- Owners (O1 / O2 / O3) can reach delete-org and delete-members via R10 → GDPR page. ✅
- Employees (E2) and IT executors (IT1) cannot reach `/workspace/settings` (R2 blocks them) AND cannot reach `/workspace/settings/gdpr` (same pattern). They have **no self-delete affordance anywhere in the app today**.

But `frontend/app/privacy/page.tsx` line 129 states: `"Right to erasure — Employees can delete their own account. Organisation admins can delete the entire organisation and all associated data."` This is currently false for the "Employees can delete their own account" half.

**Defect candidate (matrix-level):**

| Finding | Affected invariants | Proposed disposition |
|---|---|---|
| Privacy policy promises employee self-delete; no UI implements it. | (new candidate) `INV-privacy-copy-matches-implementation` — does not exist yet. Alternatively extend `INV-advertised-deletion-actually-deletes` to cover *advertised* deletions, not just clicked ones. | Two choices for Product Team: (a) correct the privacy copy to "Ask your organisation admin to delete your account on your behalf" (small, zero-code), OR (b) add an employee-facing self-delete UI (new feature — non-trivial because it must also handle the "last admin leaves" edge case). Recommend (a) for PI-16 via F-049 copy hygiene addition; log (b) as a new backlog item for Product Team PI-17 discussion. |

Neither option is blocking for Phase A's matrix delivery — flagging per task brief.

---

## Invariants referenced (summary)

| ID | Cells |
|---|---|
| INV-home-exec-parity | R7 all owner rows (primary anchor); R8 cross-surface save; R9 ack copy |
| INV-no-not-set-when-derivable | R4 (vacuous), R5, R7 (**PDF #43** anchor) |
| INV-no-raw-db-errors | R3, R8 save errors, R9 reassign errors |
| INV-role-page-access | R2 IT1/E2 rows; N/A columns for same |
| INV-workspace-auth-boundary | ANON row, all regions |
| INV-state-pure-of-navigation | R1, R8 save banner, R9 cancel-reverts-dropdown |
| INV-destructive-action-double-confirm | R9 (F-041 ack checkbox + distinct confirm) |
| INV-advertised-deletion-actually-deletes | R9 migration_pending branch; R10 → GDPR (inherited) |

---

## Defect summary

| Cell | PDF # | One-liner | Fix AC |
|---|---|---|---|
| R7 × O3 | #43 | ✓ Fixed in F-048 extension (2026-04-14): Settings now calls `resolveItExecutor` from `lib/selectors/ownerHomeState`. When `source === "pending-invite"` an amber banner renders ("IT Executor invite sent to {email}. Waiting for acceptance.") and the dropdown defaults to "— pending invite, not yet assigned —" instead of silently selecting the owner. Verification: PI-16 BA report defect #1 re-test after next deploy. |
| R7 × all | — | No "unassign / owner handles IT" option in the dropdown. | Backlog candidate, not a PDF finding. |
| Privacy page × Settings | — | Privacy policy claims employee self-delete exists; no UI implements it. | F-049 copy amendment **or** new backlog feature. |

---

## Notes / dependencies

- F-048 extension (2026-04-14): Settings page now consumes the same `resolveItExecutor` output as Home subtitle, closing AC-3's cross-page parity requirement end-to-end.
- Test data: O3 persona is the sharpest reproducer — do NOT use O1 or O2 to verify this region.

## Invariant gaps (this matrix wants an invariant that does not exist yet)

- **`INV-privacy-copy-matches-implementation`** (candidate): "Every right/capability described in `/privacy` is either (a) reachable from the product UI by the personas named in the copy, or (b) clearly delegated to a human process (e.g. 'Contact your org admin')." The Settings × Privacy contradiction above is a concrete miss. Propose adding in Phase A closeout alongside the Team matrix's `INV-single-it-exec-pending` candidate.
