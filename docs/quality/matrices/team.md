# State Matrix — Team (`/workspace/team`)

**Page file:** `frontend/app/workspace/team/page.tsx`
**Route:** `/workspace/team`
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** Phase A retrofit for F-045 done; F-049 code fixes (AC-2/AC-3/AC-5) shipped in-commit — AC-1 (migration 024 applied in Supabase) remains Stefan action.
**Persona source:** `docs/quality/personas.md` (reviewed 2026-04-14)
**Invariant source:** `docs/quality/invariants.md`
**Last full walkthrough:** 2026-04-14 (source-read, no live browser)
**Linked features:** F-045 (matrices), F-049 (Revoke+delete copy & error path), F-033 (member removal + audit hashing), F-041 (IT-executor reassignment handoff)

---

## Scope

Team is admin-only (see `isAdmin` gate, line 210). Non-owners either render the "Access restricted" fallback (IT1 attempting direct URL — `INV-role-page-access`) or never see a nav entry (E2, E1).

Stefan's PDF findings landing on this page:
- **PDF #45** — Revoke + delete confirmation copy reads "audit log PII" (jargon). `INV-audit-log-pii-hashed`, `INV-destructive-action-double-confirm`.
- **PDF #46** — Revoke + delete data surfaces a raw DB error (`function digest(text, unknown) does not exist`) verbatim into the UI and leaves the invite row visually unchanged (user cannot tell if it worked). `INV-no-raw-db-errors`, `INV-team-pending-invite-actions-safe`, `INV-advertised-deletion-actually-deletes`.

Secondary risks this matrix guards:
- Case-sensitivity silent miss on delete-by-email (`INV-email-case-normalised-on-delete`).
- Removed member ghost row on Dashboard / Report (`INV-gdpr-delete-coherent`).

---

## Page regions (columns)

Enumerated by reading `frontend/app/workspace/team/page.tsx`:

| Region ID | UI name (as rendered) | Code anchor |
|---|---|---|
| R1 | **Header** — `<h1>"Team"</h1>` + transient `actionSuccess` banner | lines 221–228 |
| R2 | **Access-restricted fallback** — rendered when `!isAdmin` | lines 210–217 |
| R3 | **Invite form** — Email input, "IT executor" checkbox, Send-invite button + submit error/success banners | lines 230–277 |
| R4 | **Team members list** — one row per accepted member with role + IT-exec tag + Remove action (self excluded) | lines 280–319 |
| R5 | **Pending invites list** — one row per pending invite with Copy link, Revoke, Revoke + delete data | lines 322–375 |
| R6 | **Pending invites empty state** — `"No pending invites."` | lines 331–332 |
| R7 | **Load error banner** — rendered when `loadError` set (invites or members fetch failed) | lines 325–329 |
| R8 | **Remove-member / revoke dialog** — typed-confirm (member) or one-click confirm (invite) + "IT Executor removal" warning + confirm button | lines 378–469 |

---

## Personas (rows)

`ANON | O1 | O2 | O3 | IT1 | E1 | E2` — fixed order per `state-matrix-template.md`.

Sub-states used:
- O2 has `memberCount ≥ 2` (IT1 + E2 accepted) and exactly one pending invite (E1). This is the only owner persona that exercises R4 with non-self rows AND R5 with a pending row simultaneously — it carries the weight of the defect flags.
- O3 has `memberCount = 1` (owner only) + one pending IT-exec invite. Exercises R5 but never R4 non-self rows.
- O1 has `memberCount = 1`, zero pending invites. Exercises only R3 + empty R5.

---

## Matrix

Legend: `—` = region not rendered for this persona. `⚠ DEFECT` = today's code diverges from intended; `PDF #XX` points at Stefan's 2026-04-14 report.

### R1 — Header + transient success banner

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A — redirected to `/login` by `useWorkspace` | INV-workspace-auth-boundary | N/A — persona cannot reach this page |
| O1 | `<h1>"Team"</h1>`; no banner on first load; green banner after successful invite/remove/revoke | INV-state-pure-of-navigation | OK |
| O2 | As O1 | INV-state-pure-of-navigation | OK |
| O3 | As O1 | INV-state-pure-of-navigation | OK |
| IT1 | N/A — R2 renders instead (access restricted) | INV-role-page-access | N/A — persona cannot reach this page |
| E1 | N/A — not authenticated as a member; reaches `/accept-invite`, not this page | INV-workspace-auth-boundary | N/A — persona cannot reach this page |
| E2 | N/A — R2 renders instead (access restricted) | INV-role-page-access | N/A — persona cannot reach this page |

### R2 — Access-restricted fallback

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A — redirected before this render path | INV-workspace-auth-boundary | N/A |
| O1 / O2 / O3 | Hidden — admin only (`isAdmin === true`) | INV-role-page-access | OK |
| IT1 | Rendered: `"Access restricted"` + subtitle `"Only the organisation owner can manage the team."` No page chrome beyond the shell. No privileged API calls issued. | INV-role-page-access | OK |
| E1 | N/A — not authenticated | INV-workspace-auth-boundary | N/A |
| E2 | As IT1 | INV-role-page-access | OK |

### R3 — Invite form

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | INV-workspace-auth-boundary | N/A |
| O1 | Email input (required, type=email), IT-executor checkbox (unchecked default — owner already handles IT, checkbox legitimately bookmarks reassignment intent), "Send invite" button. Submit with existing-member email shows non-leaky error (generic "Already invited / already a member"), NOT raw Postgres unique-violation string. | INV-no-raw-db-errors | OK |
| O2 | As O1 but IT-executor checkbox default unchecked AND the form remains enabled even when `hasCurrentExec === true` — caller can still invite a second IT-exec-flagged person. UX note: Settings' dropdown is the reassignment path; R3's checkbox is for initial assignment. No on-page hint currently clarifies which path to use (candidate for future F-049-adjacent copy work — not in scope now). | INV-home-exec-parity, INV-no-raw-db-errors | OK |
| O3 | As O1. Submitting a new invite while an IT-exec invite is already pending must not create a second pending IT-exec invite silently (server-side one-at-a-time rule); on violation the banner must be non-leaky. | INV-no-raw-db-errors, INV-home-exec-parity | OK (server enforced; copy non-jargon) |
| IT1 | N/A — R2 renders instead | INV-role-page-access | N/A |
| E1 | N/A | INV-workspace-auth-boundary | N/A |
| E2 | N/A — R2 renders instead | INV-role-page-access | N/A |

### R4 — Team members list

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | INV-workspace-auth-boundary | N/A |
| O1 | List contains exactly one row: the owner. Self row shows `"Owner · IT Executor"` sub-label (owner handles IT). No Remove button on self row (line 304: `!isSelf && m.email`). Role label uses `"Owner"` not `"org admin"` (line 296). | INV-home-exec-parity, INV-destructive-action-double-confirm | OK |
| O2 | Three rows: O2 (Owner, no IT-exec tag), IT1 (Employee · IT Executor), E2 (Employee). Remove button on IT1 and E2, not on self. Clicking Remove opens R8 dialog with typed-confirm. `INV-gdpr-delete-coherent`: after successful remove, row disappears AND the same identity is absent from Dashboard / Report on next load. | INV-home-exec-parity, INV-destructive-action-double-confirm, INV-gdpr-delete-coherent, INV-advertised-deletion-actually-deletes, INV-email-case-normalised-on-delete | OK (class-tested by F-033 e2e; matrix locks the contract) |
| O3 | One row: the owner. No IT-exec tag on self (O3 preconditions — `is_it_executor = false`). Label reads `"Owner"` only. | INV-home-exec-parity | OK |
| IT1 | N/A — R2 | INV-role-page-access | N/A |
| E1 | N/A | INV-workspace-auth-boundary | N/A |
| E2 | N/A — R2 | INV-role-page-access | N/A |

### R5 — Pending invites list (per-row actions)

This is the region PDF #45 and #46 both land on. Each row has three buttons: Copy link, Revoke, Revoke + delete data. The matrix enumerates expected behaviour of each button per persona.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | INV-workspace-auth-boundary | N/A |
| O1 | List empty (no pending invites in preconditions) → R6 renders | — | OK |
| O2 | One row: E1 (`smbsec1_2emp1@…`, Employee, expires …). Buttons: <br/>• **Copy link** — copies `/accept-invite?token=…` to clipboard; toast-flip `"Copied!"` for 2s then reverts. No network call. <br/>• **Revoke** — silent DELETE; row disappears; failure surfaces in a browser `alert()` (line 114 — ⚠ NOTE: `alert()` is legacy UX, not a banner; candidate cleanup. Does NOT leak raw DB strings because errors from `/api/invites/[id]` pass through `apiFetch` which wraps errors — verify.). <br/>• **Revoke + delete data** — opens R8 dialog (kind=`invite`), one-click confirm (no typed-confirm required per line 153). On confirm: deletes invite row AND any audit-log PII for that invitee AND any stray `org_members` row if somehow created. | INV-team-pending-invite-actions-safe, INV-no-raw-db-errors, INV-advertised-deletion-actually-deletes, INV-audit-log-pii-hashed, INV-email-case-normalised-on-delete, INV-destructive-action-double-confirm | See R8 for the defect cells — R5 itself is correctly structured. |
| O3 | One row: the pending IT-exec invite. Sub-label must include `"IT Executor"` tag (line 344) so R8 can show the "IT Executor removal" amber warning. Same three buttons as O2. | INV-team-pending-invite-actions-safe, INV-home-exec-parity (row is one of the two sources of IT-exec truth — Settings is the other) | OK (row markup); dependent cells in R8 |
| IT1 | N/A — R2 | INV-role-page-access | N/A |
| E1 | N/A — E1 is the *subject* of a row on O2/O3's page, never the viewer | INV-audit-log-pii-hashed (protects E1's email from being stored unhashed in audit logs when O2/O3 revokes) | N/A (as viewer) |
| E2 | N/A — R2 | INV-role-page-access | N/A |

### R6 — Pending invites empty state

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | `"No pending invites."` plain paragraph. No CTA (invite form is directly above). | INV-state-pure-of-navigation | OK |
| O2 | Hidden (at least one pending invite) | — | Hidden |
| O3 | Hidden | — | Hidden |
| IT1 / E1 / E2 | N/A | INV-role-page-access / INV-workspace-auth-boundary | N/A |

### R7 — Load error banner

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 | When invites fetch fails: red banner with message from `apiFetch` error (expected to be a mapped app error, not raw Postgres text). Never shows `SQLSTATE`, `relation "`, `function …does not exist`. | INV-no-raw-db-errors | OK (class-tested by invariant spec; matrix locks the contract). Note that `loadData` catches member-fetch errors silently (line 67) — this is intentional (non-admins who somehow reach a loader can't see members) but means an invite-fetch failure is the only path into R7. |
| IT1 / E1 / E2 | N/A | INV-role-page-access / INV-workspace-auth-boundary | N/A |

### R8 — Remove-member / revoke dialog (MOST DEFECT-DENSE REGION)

Two modes: `kind = "member"` (typed-confirm required) and `kind = "invite"` (one-click confirm). The matrix covers both.

#### R8a — Mode `member` (invoked from R4 Remove button)

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Hidden — R4 has no non-self rows to trigger it | — | Hidden |
| O2 | Triggered by clicking Remove on IT1 or E2. Dialog title: `"Remove {email} from the team?"`. Body: `"This cannot be undone."` + bulleted plain-language categories (F-049 AC-3 shipped): assessment responses this person submitted, campaign records referencing this person, invites sent to this email, all references to this person in the audit log (name and email replaced with an anonymous identifier). Confirm button disabled until user types the subject email (case-insensitive per line 154 — satisfies `INV-email-case-normalised-on-delete` at UX layer; RPC must also normalise). "IT Executor removal" amber warning visible when target is IT1 (satisfies handoff continuity for F-041). On RPC success: row removed from R4, green actionSuccess banner, and if target was IT-exec, auto-redirect to `/workspace` after 400ms so "Invite your IT Executor" guided step re-appears. On migration_pending: non-jargon error `"Member deletion is temporarily unavailable — an administrator must apply a pending database migration. The member is unchanged; retry once the migration is applied."` — satisfies `INV-advertised-deletion-actually-deletes` because the user is clearly told deletion DID NOT happen. | INV-destructive-action-double-confirm, INV-audit-log-pii-hashed, INV-advertised-deletion-actually-deletes, INV-email-case-normalised-on-delete, INV-gdpr-delete-coherent, INV-no-raw-db-errors | **Fixed in F-049** (PDF #45): bullet copy rewritten to plain language (no "audit log PII"). Fixed in `frontend/app/workspace/team/page.tsx` (dialog body). |
| O3 | Hidden — R4 has no non-self rows | — | Hidden |
| IT1 / E1 / E2 | N/A | INV-role-page-access / INV-workspace-auth-boundary | N/A |

#### R8b — Mode `invite` (invoked from R5 Revoke+delete data button)

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Hidden — R5 empty | — | Hidden |
| O2 | Triggered by clicking Revoke + delete data on E1's pending row. Dialog title: `"Revoke invitation for {email}?"`. Body (F-049 AC-3 shipped): `"This cannot be undone."` + `"This will permanently delete the pending invite AND every record the invitee's email appears in (audit log entries, any partial assessment responses). The invitee cannot join using the existing link."` — plain language, no "audit log PII". No typed-confirm (`canConfirmTyped` short-circuits to `true` for invite kind, line 153) — invariant `INV-destructive-action-double-confirm` is satisfied via "distinct red button" rather than typed input. On RPC success: row disappears from R5, green actionSuccess banner. On RPC failure classified as `migration_pending` (missing RPC OR missing `digest()` inside the RPC chain → SQLSTATE `42883`): non-jargon banner `"Revoke + delete data is temporarily unavailable — an administrator must apply a pending database migration. The invite is unchanged; retry once the migration is applied."`. On other 5xx or raw-DB-shaped error bodies: generic `"Revoke + delete data failed — please retry. If the problem persists contact support. The invite is unchanged."` — never leaks raw Postgres strings. Row stays visible in both error paths; button re-enables for retry. | INV-destructive-action-double-confirm, INV-audit-log-pii-hashed, INV-team-pending-invite-actions-safe, INV-advertised-deletion-actually-deletes, INV-no-raw-db-errors, INV-email-case-normalised-on-delete | **Fixed in F-049**: PDF #45 (AC-3) — body copy rewritten to plain language; fixed in `frontend/app/workspace/team/page.tsx`. PDF #46 (AC-2 + AC-5) — server `/api/orgs/members` now returns `{ status: 503, error: "migration_pending" }` for SQLSTATE `42883` / any `function … does not exist` inside the RPC chain; client maps unknown 5xx / raw-DB-shaped bodies to a safe message; fixed in `frontend/app/api/orgs/members/route.ts` + team page. |
| O3 | Same structure as O2. Additional expectation: if the pending invite being revoked is the IT-exec one, the amber "IT Executor removal" warning MUST render — today it checks `targetIsItExec(removeTarget)` which reads from `invite.is_it_executor`, so the warning renders correctly. On success: Home "Get started" IT-exec step reverts to "pending invite not yet sent" empty state (`INV-home-exec-parity`). | INV-home-exec-parity, INV-destructive-action-double-confirm, INV-audit-log-pii-hashed, INV-advertised-deletion-actually-deletes, INV-no-raw-db-errors | **Fixed in F-049** — same fix as O2 for PDF #45 + #46. |
| IT1 / E1 / E2 | N/A | INV-role-page-access / INV-workspace-auth-boundary | N/A |

---

## Invariants referenced (summary)

| ID | Cells |
|---|---|
| INV-no-raw-db-errors | R3, R7, R8a, R8b — all error-surface cells |
| INV-team-pending-invite-actions-safe | R5 all O-rows; R8b |
| INV-audit-log-pii-hashed | R8a, R8b copy (**PDF #45** anchor) |
| INV-advertised-deletion-actually-deletes | R8a, R8b (**PDF #46** anchor) |
| INV-destructive-action-double-confirm | R8a typed-confirm, R8b distinct-red-button |
| INV-email-case-normalised-on-delete | R8a typed-confirm comparison + underlying RPC |
| INV-role-page-access | R2 for IT1/E2; N/A columns for same |
| INV-workspace-auth-boundary | ANON row, all regions |
| INV-home-exec-parity | R5/R8 IT-exec invite rows + R4 IT-exec tag (must agree with Settings) |
| INV-gdpr-delete-coherent | R8a success path (removed member absent from Dashboard/Report) |
| INV-state-pure-of-navigation | R1 transient banner + R6 empty state |

---

## Defect summary (feeds F-049 fix scope)

All three F-049 cells below were fixed in this same commit. Status column tracks Stefan sign-off after BA walkthrough on PROD.

| Cell | PDF # | One-liner | Fix AC | Status |
|---|---|---|---|---|
| R8a × O2 bullets | #45 | Bullet wording "All audit log PII (entries anonymised)" is jargon | F-049 AC-3 | Fixed in F-049 (code) |
| R8b × O2/O3 body | #45 | Body wording "any audit log PII" is jargon | F-049 AC-3 | Fixed in F-049 (code) |
| R8b × O2/O3 error path | #46 | Raw Postgres `digest(…) does not exist` leaks into red banner when migration 024 missing; paired with invite row persisting, user reads as "broken, no retry" | F-049 AC-2 (server classify) + AC-5 (client copy) | Fixed in F-049 (code). AC-1 (migration applied in Supabase) = Stefan action. |

---

## Notes to coordinator

1. **R5 Revoke (middle button) uses `alert()`** (line 114). This is a legacy UX pattern that violates `INV-no-raw-db-errors` by *convention* (alert() bypasses the app's banner styling and is impossible to style for non-leak). Not flagged as a PDF defect — recommend promoting to a small follow-up feature in PI-17.
2. **`invite.role` label on R5 prints lowercase `"employee"` via `capitalize`** (line 343) — renders as `"Employee"`. Consistent with R4. OK.
3. **No invariant today covers "invite form does not allow a 2nd IT-exec invite while one is pending"**. Architect note: either the server enforces this (in which case R3 cell on O3 depends on the server copy being non-leaky, already covered by `INV-no-raw-db-errors`) or it should become `INV-single-it-exec-pending`. Recommend we add after Phase B when F-049 lands, rather than in this matrix — flagged here for traceability.

## Invariant gaps (this matrix wants an invariant that does not exist yet)

- **`INV-single-it-exec-pending`** (candidate): "At any time, at most one pending invite with `is_it_executor = true` exists per org." Not yet in `invariants.md`. The matrix treats it as server-enforced. Propose adding in Phase A closeout.
