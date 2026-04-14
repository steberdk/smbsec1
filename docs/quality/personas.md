# Personas — SMBSec quality baseline

Owned by Business Analyst (per `docs/agents/roles.md`, sharpened in F-047).
Used by:
- `docs/quality/state-matrix-template.md` and every page matrix under `docs/quality/matrices/` (rows = personas)
- `docs/quality/invariants.md` (each invariant lists which personas it applies to)
- `frontend/tests/smoke/personas.spec.ts` (F-046) — one walkthrough per persona
- Business Test Team scripts (Phase C of PI-16) — one journey per persona

Personas are **org-state + auth-state combinations** that the app must serve correctly. They are NOT a marketing segmentation. A persona exists if and only if the app must show different content/behaviour for it on at least one page.

The user-type list in `docs/user-flows.md` §1 (Anonymous, Owner, Manager, Employee, IT Executor) is the role taxonomy. Personas are concrete instantiations of those roles **in a specific org state** (no IT executor assigned vs. assigned vs. invited; new org vs. active assessment; etc.). One role can produce several personas; one persona maps to exactly one role.

> Note: `Manager` is no longer assignable as of PI 12 (`project_pi12_progress.md`). It is still a permitted DB value, so we do not seed a Manager persona by default — but if a future PI re-introduces manager assignment, add `M1 Manager (regular team lead)` here and update every matrix.

---

## How to add a new persona

1. The trigger is a **page matrix cell that cannot be expressed for any existing persona**. If you reach for "depends on whether the user has X" inside a cell, X is a missing persona axis.
2. Give it a 2-character ID: role letter (`O`, `E`, `IT`, `ANON`) + sequence digit. Use the next free number in the role family.
3. Fill every field in the template below — in particular **Setup steps**, so a BA agent or `personas.spec.ts` can recreate the persona deterministically from a clean DB.
4. Add the persona as a new row to **every** `docs/quality/matrices/*.md` file. If a page is unreachable for the persona, the cell is `N/A — persona cannot reach this page` (see `state-matrix-template.md`).
5. Update `frontend/tests/smoke/personas.spec.ts` to include the new persona in the walkthrough loop.
6. Cross-reference any invariants in `invariants.md` that newly apply (or restrict their `Personas affected` list).

---

## Persona sub-states

Some pages behave differently within a single persona based on a **secondary axis** — typically org-state that cannot be captured by changing the persona ID alone without exploding the list. Sub-states are documented on the persona itself and referenced by matrix cells using the syntax `O1(memberCount=0)` vs `O1(memberCount≥1)`.

Current sub-state axes:

- `memberCount` — applied to O1, O2, O3. Home "Get started" step 1 ("Invite a team member") is ticked iff `memberCount ≥ 1`. Values: `0` (solo owner, no team yet) and `≥1` (at least one other member). Default for a matrix row that does not qualify: `memberCount = 0` (i.e. the fresh owner case).
- `hasActiveAssessment` — applied to all owner personas. O2 defaults to `true` (so Dashboard/Report have data); O1 and O3 default to `false` (so Home shows the initial "Get started" state). Override in cells that need the other branch.

Add a sub-state axis only when at least one page matrix cannot express a cell without it. Adding an axis requires updating every affected persona plus `state-matrix-template.md`'s worked example.

---

## Persona template

```
## <ID> — <one-line summary>

- Role: owner | regular member | IT executor | none
- Auth state: signed out | signed in
- Org state preconditions:
  - ...
- Test email: <addr>@bertramconsulting.dk
- Reachable pages: <list>
- Not reachable: <list>
- Setup steps:
  1. ...
  2. ...
```

---

## Test email allocation

Source: `docs/test_user_emails.md` (3 owner sets at `bertramconsulting.dk`, single shared password). One persona uses one email. Where seeding requires a *fresh* org (e.g. O1 vs. O2 differ only in IT-executor assignment), the BA agent must delete prior data in Supabase between runs — these personas can reuse the same email serially, not in parallel.

| Persona | Email | Notes |
|---|---|---|
| ANON | (none — no auth) | |
| O1 | `smbsec1_1owner@bertramconsulting.dk` | Org = "SMBsec1 Test Company 1". Owner handles IT themselves. |
| O2 | `smbsec1_2owner@bertramconsulting.dk` | Org = "SMBsec1 Test Company 2". Owner delegates IT to `smbsec1_2it`. |
| O3 | `smbsec1_3owner@bertramconsulting.dk` | Org = "SMBsec1 Test Company 3". Owner has invited `smbsec1_3it` as IT exec, invite still pending. |
| IT1 | `smbsec1_2it@bertramconsulting.dk` | IT executor in O2's org (not owner). |
| E1 | `smbsec1_2emp1@bertramconsulting.dk` | Invited by O2; **invite link not yet clicked**. Persona only meaningful from O2/IT1 viewpoint (Team page) plus the `/accept-invite` route. |
| E2 | `smbsec1_2emp2@bertramconsulting.dk` | Invited by O2 and accepted. Regular employee, not IT executor. |

Reuse rule: parallel test runs that need the same email (e.g. O1 in two CI shards) must be serialised, OR each shard must use a per-shard prefix in the org name and accept that the underlying auth user is shared. The F-043 harness (`createOrgWithMembers`) avoids this entirely by creating ephemeral `e2e-pi16-*` orgs via service-role; persona-smoke (F-046) should follow the same pattern wherever the persona is not pinned to a real `bertramconsulting.dk` mailbox (only ANON, and journeys that exercise email delivery, need real mailboxes).

---

## ANON — Anonymous visitor

- Role: none
- Auth state: signed out
- Org state preconditions: N/A (no org)
- Test email: N/A
- Reachable pages: `/`, `/login`, `/auth/callback` (transient), `/checklist` (read-only), `/summary` (teaser), `/privacy`, `/campaign/[token]`, `/campaign/[token]/report`, `/accept-invite` (redirected to `/login` then back)
- Not reachable: every `/workspace/*` route, `/onboarding` (auth gate redirects to `/login`)
- Setup steps:
  1. Open browser in clean (incognito) context — no Supabase session cookie.
  2. Navigate to `/`.

---

## O1 — Owner who handles IT themselves (no IT executor delegation)

- Role: owner (`org_admin`)
- Auth state: signed in
- Org state preconditions:
  - Owner is the only member.
  - `org_members.is_it_executor = true` for the owner.
  - No active assessment yet (so Home "Get started" is in initial state — required to exercise F-048 invariants).
  - No pending invites.
- Test email: `smbsec1_1owner@bertramconsulting.dk`
- Reachable pages: every page in `docs/user-flows.md` §2 except `/accept-invite` (no invite token applies).
- Not reachable: none meaningful — but `/accept-invite?token=...` for someone else's token shows the wrong-email error.
- Setup steps:
  1. Delete any prior org for this email in Supabase (`orgs`, `org_members`, `assessments`, `invites` — cascade).
  2. Sign in via magic link / OTP using the email.
  3. Onboarding form: org name = "SMBsec1 Test Company 1"; "Who handles IT?" = "I do".
  4. Submit → land on `/workspace`.
  5. Do NOT start an assessment yet.

---

## O2 — Owner who delegates IT to an accepted employee

- Role: owner (`org_admin`)
- Auth state: signed in
- Org state preconditions:
  - Owner is admin, `is_it_executor = false`.
  - One additional member (IT1) has accepted, `is_it_executor = true`, role = employee.
  - One regular employee (E2) has accepted, no IT-exec flag.
  - One pending invite outstanding (E1).
  - Active assessment exists (so dashboard, report, checklist progress are populated).
- Test email: `smbsec1_2owner@bertramconsulting.dk`
- Reachable pages: every page.
- Not reachable: none.
- Setup steps:
  1. Delete prior org data for this email family in Supabase.
  2. Sign in O2; create org "SMBsec1 Test Company 2"; "Who handles IT?" = "Staff member"; IT person email = `smbsec1_2it@bertramconsulting.dk`. This emits an invite to IT1.
  3. Sign in IT1 via the invite link → accepts onto org as employee + IT executor.
  4. Sign back in as O2. Invite `smbsec1_2emp2@bertramconsulting.dk` (E2) as employee, no IT-exec. E2 accepts.
  5. Sign back in as O2. Invite `smbsec1_2emp1@bertramconsulting.dk` (E1) as employee, no IT-exec. **Do not accept.**
  6. Sign back in as O2 → start org-wide assessment from `/workspace/assessments`.

---

## O3 — Owner with pending IT-executor invite (not yet accepted)

- Role: owner (`org_admin`)
- Auth state: signed in
- Org state preconditions:
  - Owner is admin, `is_it_executor = false`.
  - Pending invite exists with `is_it_executor = true` flag.
  - No accepted IT executor yet.
  - No active assessment (keeps Home in early Get-started state — most relevant for INV-home-exec-parity).
- Test email: `smbsec1_3owner@bertramconsulting.dk`
- Reachable pages: every page.
- Not reachable: none.
- Setup steps:
  1. Delete prior org data for this email family.
  2. Sign in O3; create org "SMBsec1 Test Company 3"; "Who handles IT?" = "Staff member"; IT person email = `smbsec1_3it@bertramconsulting.dk`. Invite is created.
  3. **Do not** sign in as `smbsec1_3it` — the invite must remain pending.
  4. Do not start an assessment.

---

## IT1 — IT executor who is not the owner

- Role: regular member (employee) with `is_it_executor = true`
- Auth state: signed in
- Org state preconditions: belongs to O2's org as set up above.
- Test email: `smbsec1_2it@bertramconsulting.dk`
- Reachable pages: `/`, `/login`, `/auth/callback`, `/checklist`, `/summary`, `/privacy`, `/workspace`, `/workspace/checklist` (sees both IT Baseline + Awareness tracks), `/workspace/dashboard`, `/workspace/settings/gdpr` (self only).
- Not reachable: `/workspace/team`, `/workspace/assessments`, `/workspace/campaigns/*`, `/workspace/report`, `/workspace/billing`, `/workspace/settings`, `/onboarding` (already has org).
- Setup steps:
  1. Provisioned via O2's setup (step 3 of O2). No additional steps needed.
  2. Sign in via magic link / OTP using the email.

---

## E1 — Invited employee, link not yet clicked

- Role: none yet (invite row only, no `org_members` row)
- Auth state: signed out (or signed in to a different/unrelated identity)
- Org state preconditions: row in `invites` with `accepted_at IS NULL` and `expires_at` in the future. No matching `org_members` row.
- Test email: `smbsec1_2emp1@bertramconsulting.dk`
- Reachable pages (from THIS persona's vantage point):
  - As anon: `/`, `/login`, `/checklist`, `/summary`, `/privacy`.
  - As invitee landing on `/accept-invite?token=...`: redirected to `/login?next=...` then back to `/accept-invite` (where they'd become E2 if they accepted).
- Not reachable: every `/workspace/*` route until acceptance.
- Persona surface area is mostly **on other personas' Team page** — O2/IT1 see this user as a "Pending invite" row. F-049's Revoke + delete data button operates on this persona. The matrix for `/workspace/team` must explicitly cover the "pending invite row" cell per persona who can see it.
- Setup steps:
  1. Provisioned via O2's setup (step 5). The invite row is the artefact.
  2. Do NOT click the invite link. To re-create after accidental acceptance, delete the `org_members` row for this email and re-issue the invite from O2's Team page.

---

## E2 — Employee, accepted, regular role

- Role: regular member (employee), `is_it_executor = false`
- Auth state: signed in
- Org state preconditions: belongs to O2's org; active assessment exists.
- Test email: `smbsec1_2emp2@bertramconsulting.dk`
- Reachable pages: `/`, `/login`, `/auth/callback`, `/checklist`, `/summary`, `/privacy`, `/workspace`, `/workspace/checklist` (Awareness only), `/workspace/dashboard` (no campaign summary), `/workspace/settings/gdpr` (self only).
- Not reachable: `/workspace/team`, `/workspace/assessments`, `/workspace/campaigns/*`, `/workspace/report`, `/workspace/billing`, `/workspace/settings`, `/onboarding`.
- Setup steps:
  1. Provisioned via O2's setup (step 4).
  2. Sign in via magic link / OTP using the email.

---

## Coverage summary

| Page | Personas exercising it |
|---|---|
| `/` | ANON, O1, O2, O3, IT1, E2 (E1 = anon vantage) |
| `/login` | ANON (and any signed-out persona returning) |
| `/auth/callback` | All authenticated personas (transient) |
| `/onboarding` | O1, O2, O3 during setup only — never reachable post-setup |
| `/checklist` (public) | All |
| `/summary` (public) | All |
| `/privacy` | All |
| `/accept-invite` | E1 (the invitee path) |
| `/workspace` | O1, O2, O3, IT1, E2 |
| `/workspace/checklist` | O1, O2, O3, IT1, E2 |
| `/workspace/dashboard` | O1, O2, O3, IT1, E2 |
| `/workspace/team` | O1, O2, O3 (admin only) |
| `/workspace/assessments` | O1, O2, O3 (admin only) |
| `/workspace/campaigns/*` | O1, O2, O3 (admin only) |
| `/workspace/report` | O1, O2, O3 (admin only) |
| `/workspace/billing` | O1, O2, O3 (admin only) |
| `/workspace/settings` | O1, O2, O3 (admin only) |
| `/workspace/settings/gdpr` | O1, O2, O3, IT1, E2 |
| `/campaign/[token]` | E2 / IT1 as recipients in O2 (any team member) |
| `/campaign/[token]/report` | E2 / IT1 as recipients in O2 |

This table is the source of truth for the `Reachable pages` rows above and for the `N/A` cells in every page matrix. If it ever drifts from `docs/user-flows.md`, fix `user-flows.md` first, then update here.
