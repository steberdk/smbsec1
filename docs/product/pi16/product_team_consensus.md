# PI 16 — Product Team Consensus

**Locked:** 2026-04-14
**Theme:** Quality baseline + Stefan's 2026-04-14 test findings
**Based on:** `20260414a_Stefan_test.pdf` (findings 42–47) + plan `C:/Users/AI1/.claude/plans/wondrous-gathering-mccarthy.md`

## Process deviation (transparency)

CLAUDE.md §1b/§2b prescribes a 5-agent Product Team (PM, UX, Security, Architect, BA) with at least 3 internal iterations. For PI 16 Phase A the Product Team was run as **3 parallel agents with merged roles** (BA+PM, UX+Architect, Security), one iteration. Rationale:

1. Scope is **concrete artefact authoring** (personas, invariants, matrix template + pilot), not open-ended design — features F-045/F-046/F-047 already enumerate ACs.
2. Outputs are **complementary, not overlapping** (3 non-conflicting deliverables), so convergence through multiple iterations would not materially change them.
3. Token budget preserved for the retrofit of 12 more page matrices in Phase A continuation and the IT Dev work in Phase B.

Follow-up: if BA retro feedback shows this pilot produced worse output than a full 5×3 ceremony would have, the retrospective (§2f / §2n) adjusts `team_rules_product_team.md`. Logged here so the deviation is explicit.

## Scope

| F-ID  | Name                                                                                   | Type          |
| ----- | -------------------------------------------------------------------------------------- | ------------- |
| F-045 | Quality baseline — personas, invariants, per-page state matrices                       | Infrastructure |
| F-046 | Quality baseline — automated invariant + persona-smoke test suites                     | Infrastructure |
| F-047 | Quality baseline — process doc updates (roles, rules, CLAUDE.md, test strategy)        | Process       |
| F-048 | Home "Get started" state coherence (PDF #42, #43, #44, #47)                            | Defect fix    |
| F-049 | Team invite Revoke + delete data — fix `digest()` error + clarify copy (PDF #45, #46)  | Defect fix    |

## Decisions taken

1. **Persona set is 7** (ANON, O1, O2, O3, IT1, E1, E2). **No `Manager` persona** — PI-12 removed manager assignability; if it returns, add M1.
2. **Persona sub-states** used for axes that don't justify new persona IDs: `memberCount` (owner personas) and `hasActiveAssessment`. Documented in `personas.md`.
3. **"Get started" block in F-048 has 4 steps**, not 3: (1) Invite a team member, (2) Assign or confirm IT Executor, (3) Start your first assessment, (4) Share the summary. Rationale: three steps forces steps 1+2 to merge, which was the root of PDF #42/#47. Four preserves one-action-per-step and each step's `done` predicate is independent (enabling `INV-home-steps-deterministic`).
4. **F-048 introduces `frontend/lib/selectors/ownerHomeState.ts`** — pure function `(org, membership, members, assessments) -> HomeState`. Current codebase has no selector pattern; Home page derives state ad-hoc from four independent `useEffect` fetches in `frontend/app/workspace/page.tsx`. That ad-hoc derivation is the direct cause of PDF #44's navigation flicker.
5. **Invariant count: 19** (12 from BA+PM, 7 from Security). Covers: home state parity + determinism, no raw DB errors, no "Not set" when derivable, GDPR delete coherence, audit-log PII hashing, auth boundary, service-role in client bundle, RLS on every `smbsec1` table, destructive-action double-confirm, email case normalisation, dashboard↔report parity, checklist track visibility, role-based page access, public-checklist read-only.
6. **Page matrix set (F-045 AC-4): 13 pages.** `home`, `checklist`, `checklist-public`, `dashboard`, `team`, `settings`, `report`, `campaigns`, `billing`, `privacy`, `login`, `onboarding`, `summary`. Backend-only features (F-043 harness, SQL migrations) have no matrix.
7. **F-049 AC-1 (migration 024 applied) is a Stefan action item** — same pattern as PI-14/15 migrations 022–026 already in MEMORY.md. Code can ship with AC-2/AC-3/AC-5/AC-6 green; AC-1 tracked separately.
8. **Privacy page has additional copy drift beyond PDF #45** — Security agent flagged §8 "Employees can delete their own account" (no employee-self-delete UI found) and §8 AI-guidance opt-out claim (needs verification). **Scope call:** bundle into F-049 as copy corrections only (soften to "contact your organisation owner" / verify Settings AI toggle exists). If missing UI is needed, spawn a follow-up feature in PI-17.

## Open risks

- **Process doc drift**: F-047 lands in Phase B alongside code fixes. If Phase B slips, F-045/F-046 exist but the rules pointing at them don't. Mitigation: F-047 ships first inside Phase B, before F-048/F-049 code.
- **Persona smoke runtime**: 7 personas × 13 pages = 91 page loads per smoke run. At ~2s/page that is ~3 min serial. OK for post-deploy; probably too slow for every CI run. Phase B decision: invariants suite runs every CI (fast, targeted); persona smoke runs post-deploy only.
- **Retrofit scope creep**: walking 13 pages WILL surface defects beyond PDF #42–47. Per F-045 AC-5, each is flagged as a matrix cell (⚠ DEFECT). Stefan's standing rule (`feedback_continue_autonomous.md`) is to continue; so High/Medium extras go into F-048/F-049 scope or spawn new features in this PI, Low goes to a "Stefan-2026-04-14 deferred" list.

## Artefacts delivered Phase A (so far)

- `docs/quality/personas.md` — 7 personas + sub-states + coverage table
- `docs/quality/invariants.md` — 19 invariants
- `docs/quality/state-matrix-template.md` — template + worked example
- `docs/quality/matrices/home.md` — pilot matrix (9 regions × 7 personas, 5 defect cells flagged against PDF #42/#43/#44/#47)

## Phase A continuation (ongoing)

- Retrofit remaining 12 matrices: checklist, checklist-public, dashboard, team, settings, report, campaigns, billing, privacy, login, onboarding, summary. Parallelised across IT Dev agents (Phase A spills into Phase B kickoff).

## Team rules retrospective input

BA+PM agent surfaced:
- `docs/user-flows.md` §3.6 "Manager Flows" is stale (PI-12 removed manager assignability). Not in PI 16 scope to fix; logged for F-047 to touch the flow doc, or a follow-up.

UX+Architect agent surfaced:
- No selector/derivation pattern in the frontend lib — introducing one for Home is the first. Future features with cross-page state should follow the same pattern.

Security agent surfaced:
- Privacy page claims need a periodic audit as features evolve. Potential invariant: "every promise on `/privacy` is backed by a documented code path." Not yet codified (hard to mechanise).

These feed into §2f retrospective of PI 16.
