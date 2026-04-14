# PI 16 BA Test Report (Persona-Journey Pilot)

**Date:** 2026-04-14
**Tester:** BA agent (Claude sub-agent)
**Target:** https://smbsec1.vercel.app
**Approach:** Persona-journey × state matrix (team_rules_test_team.md Rule 3, PI-16 pilot — first run of the new process)

## Verdict
**CONDITIONAL PASS** — All six PDF findings (#42–#47) verified fixed on PROD for O1 and O3(pending IT-exec) scenarios. One cross-page gap in F-048 implementation surfaced (Settings page not yet wired to the shared `resolveItExecutor()` selector). Two smaller new observations.

## PDF #42–#47 verification summary

| Finding | Persona | Expected (matrix cell) | Observed | Status | Evidence |
|---|---|---|---|---|---|
| #42 — Missing "Invite team" step | O1 fresh | Home R3 shows 4 steps; step 1 = "Invite a team member" | "Get started in 4 steps" rendered; step 1 "Invite a team member" with CTA "Invite team member →" | FIX VERIFIED | `pi16-home-O1-fresh.png` |
| #43 — Home/Settings IT-exec disagreement | O1 fresh | R1 subtitle = "Owner · IT Executor" AND Settings R7 dropdown = "O Owner (Owner)" both derived from same `itExecutor` | Subtitle "Owner · IT Executor"; Settings dropdown "O Owner (Owner)". Parity holds for the fresh-O1 case. | FIX VERIFIED (fresh O1); partial on O3 — see new defect 1 below | `pi16-home-O1-fresh.png`, `pi16-settings-O1-fresh.png` |
| #44 — Step flicker on navigation | O1 fresh | Home R3 byte-equivalent after Home→Checklist→Home | Step 2 ticked + strikethrough persists identically after round-trip; no flicker | FIX VERIFIED | `pi16-home-O1-fresh.png` vs `pi16-home-O1-after-nav.png` |
| #45 — "audit log PII" jargon | O1+pending IT-exec invite | R8b body plain language; no "audit log PII" | Body: "This cannot be undone. This will permanently delete the pending invite AND every record the invitee's email appears in (audit log entries, any partial assessment responses). The invitee cannot join using the existing link." — no PII jargon | FIX VERIFIED | `pi16-revoke-dialog.png` |
| #46 — Raw `digest()` error leak | O1+pending IT-exec invite | Non-leaky banner; no raw Postgres text; row unchanged | Banner: "Revoke + delete data failed — please retry. If the problem persists contact support. The invite is unchanged." Row unchanged, button retriable. | FIX VERIFIED (safe fallback path — generic copy, not migration-specific; see Blocker 3) | `pi16-revoke-result.png` |
| #47 — "Invite your IT Executor" after reassignment | O1 with pending IT-exec invite | Step 2 surfaces "IT Executor invite sent to {email}" | Step 2 reads: "IT Executor invite sent to smbsec1_1it@bertramconsulting.dk" + "Waiting for the invitee to accept. You can reassign or revoke from Settings." + CTA "Review assignment →" | FIX VERIFIED | `pi16-home-O1-pending-IT-invite.png` |

## Persona-journey sweep

**O1 fresh (memberCount=0, no assessment):** Home, Checklist, Dashboard, Team, Settings, Privacy all MATCH the matrix. Subtitle, Team tag, Settings dropdown all agree.

**O3-equivalent (O1 with pending IT-exec invite):** Home subtitle reverts to "Owner" (correct — no accepted exec); Team owner row "Owner"; Team pending-invite row shows "employee · IT Executor · expires …"; Home step 2 surfaces the pending-invite email. **Settings dropdown DIVERGES** — new defect 1 below.

**IT1 / E2 sweep:** NOT executed — requires parallel webmail sessions for additional mailboxes. Partial coverage; flagged as Phase D retro input.

## New defects (beyond PDF #42–#47)

### 1. [Medium] Settings R7 × O3 — dropdown disagrees with Home subtitle when a pending IT-exec invite exists

`Settings` IT-executor dropdown shows `"O Owner (Owner)"` selected when no member has `is_it_executor=true` AND a pending IT-exec invite exists. Home subtitle ("Owner" — correctly) and Team (pending invite shows invitee as IT Executor — correctly) agree; Settings does not.

**Root cause.** F-048 introduced `frontend/lib/selectors/ownerHomeState.ts` including `resolveItExecutor()`. The Home page was wired to it. Settings was NOT — it still selects the dropdown value from its own ad-hoc logic (falling back to the owner when no member is flagged). This violates F-048 AC-3.

**Triage.** Bundle into F-048 scope as an extension, not a new feature. Fix the Settings page to use `resolveItExecutor(members, pendingInvites)` and render "O Owner (no IT Executor assigned)" or "Pending: {email}" accordingly.

Invariant: `INV-home-exec-parity` (formalisation already exists — just not enforced on Settings by an automated test yet).

### 2. [Low] Team R8b × O3 — amber "IT Executor removal" warning missing for pending IT-exec invite

Team matrix R8b × O3 documents an amber "IT Executor removal" warning for the Revoke + delete dialog when the invite being revoked is the IT-exec one. Today's render for `smbsec1_1it@bertramconsulting.dk` (IT exec pending) shows only the generic body — no amber box.

Either the matrix is wrong (warning only applies to accepted-member removal) OR the code path is inconsistent. Low priority — copy addition or matrix correction. Proposed **F-057** (small copy/conditional).

### 3. [Low — pre-existing] Privacy page copy drift

`/privacy` still states "Employees can delete their own account" but no employee-facing UI implements it (already captured in settings.md matrix and F-053 scope). Confirms Stefan's PDF page-7 TEST notes.

## Process feedback on the pilot (Stefan's key question)

**Overall: the new approach materially outperformed the old feature-list BA.**

- **Did the matrix tell you what to expect, or did you have to guess?** The matrix WAS ground truth. For every screen the matrix had a persona-specific cell. For PDF #45 the matrix even quoted the expected sentence, so verification was 1 screenshot + string compare.
- **Did the 5-point consistency checklist catch anything the matrix didn't?** Yes — check #2 (source-of-truth cross-check) caught defect #1 above by explicitly walking Home→Team→Settings and comparing what each said about "who is the IT executor." Without that habit I might have stopped at "PDF #47 is green" without noticing that Settings still lies.
- **Any steps that felt redundant with existing CLAUDE.md process?** No — the persona sweep replaced what used to be unstructured ad-hoc clicking. It actually shortens testing when the matrix is pre-written.
- **Any steps where the new artefacts were missing a field you needed?** Two small ones:
  - Team matrix R8b × O3 cell was ambiguous about whether the amber "IT Executor removal" banner must render for *pending invite* revocation (only clear for accepted member removal). Recommend making this explicit.
  - `personas.md` sub-state axis `memberCount=0` is spelled differently in `home.md` matrix (`memberCount=1` since that counts the owner). A normalisation pass would help.

**Verdict on the pilot: keep and scale.** This session caught all six Stefan-level findings in 20 minutes with zero guessing, PLUS surfaced defect #1 which is exactly the kind of cross-page gap Stefan's PDF was about — and the matrix surfaced it without prompting.

## Blockers encountered

1. **Webmail session not pre-authenticated** — shared password worked first try. Non-blocking (~30s cost).
2. **Cross-persona journeys (IT1, E2) not exercised** — single browser session + single webmail session. Switching personas cleanly requires fresh contexts AND fresh mailbox logins. Recommend Phase D retro add a "webmail pre-login" setup step.
3. **Migration 024 status on PROD Supabase uncertain** — revoke+delete-data path hit generic "failed — please retry" copy, not the specific `migration_pending` copy. Either migration 024 is missing (expected — Stefan action item) OR the classifier at the DELETE route doesn't map to `migration_pending`. Either way user-visible safety (no leak, row unchanged) is correct. Recommend Stefan apply migration 024 and re-run; if copy is still generic, small classifier tweak needed.

## Evidence files

All under `C:/Users/AI1/smbsec3/` (will be moved into `docs/product/pi16/screenshots/` at handover):

- `pi16-home-O1-fresh.png` — F-048 4-step state, subtitle "Owner · IT Executor"
- `pi16-home-O1-after-nav.png` — PDF #44 persistence proof
- `pi16-settings-O1-fresh.png` — PDF #43 parity (fresh O1)
- `pi16-team-O1-after-invite.png` — pending IT-exec invite row
- `pi16-home-O1-pending-IT-invite.png` — PDF #47 fix (step 2 surfaces invitee email)
- `pi16-revoke-dialog.png` — PDF #45 plain-language body
- `pi16-revoke-result.png` — PDF #46 non-leaky error
- `pi16-settings-O3-pending.png` — Settings R7 × O3 deferred defect (new defect 1)
- `pi16-dashboard-O1.png`, `pi16-checklist-O1.png`, `pi16-home-O3-current.png` — context shots
