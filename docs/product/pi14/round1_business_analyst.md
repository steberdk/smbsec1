# Round 1 — Business Analyst

**Session:** PI 14 ROADMAP
**Role:** Business Analyst
**Author:** BA agent (Round 1 of 3, independent input)
**Date:** 2026-04-11

Focus: testability, acceptance-criteria quality, verification approach. I have read `features.md` (F-009, F-012, F-023-25, F-031, F-033, F-034-F-043), `backlog.md`, `test-strategy.md`, `test_user_emails.md`, `team_rules_test_team.md`, `team_rules_product_team.md`, and spot-checked `frontend/tests/helpers/fixtures.ts`.

---

## 1. AC Quality Review

Rule 2 benchmark: "concrete observable outcomes (URL, element, HTTP status)". Flagging worst offenders first.

### Worst offenders — must fix before refinement closes

**F-038 AC-7 (denominator semantics).** Text says *"Product Team to choose one definition during refinement: either (a) ... OR (b) ..."*. This is a design decision masquerading as an AC. It cannot be verified until someone picks. **Action for Round 2/3:** Product Team (PM + Architect) to lock in ONE option in this round, then I rewrite AC-7 as:
> AC-7: `/api/dashboard` returns `totalItems = [chosen formula]` and the response shape includes `denominatorDefinition: "per_member_sum" | "union_of_answered_items"` so the frontend and tests can assert on it. Identical value appears in `/api/report` and in `/workspace` "My checklist" progress widget. Documented in a code comment on the helper and in `docs/user-flows.md § dashboard math`.

**F-041 AC-1 (IT Exec reassignment behaviour).** Same problem: *"Product Team chooses ONE behaviour during refinement"*. Untestable until chosen. Recommend locking the "preserve-responses, rebind to assessment not to user" option in Round 2 and rewriting as:
> AC-1: Given owner-as-IT-exec has answered N IT Baseline items on the active assessment, when owner reassigns IT Executor to user B via Settings, then: B's `/workspace/checklist` IT Baseline section shows exactly those N items as already answered with the prior values; the IT Baseline items disappear from the former IT Exec's `/workspace/checklist`; `/api/dashboard` track totals for IT Baseline are unchanged before vs after reassignment (no double-count, no loss).

### Implementation-flavoured language (tighten — not critical)

- **F-034 AC-1:** "or similar" — pick the exact string so the test can assert it. Recommend the exact copy: *"No assessments yet — your owner will start one."*
- **F-035 AC-4:** "the row replaces seamlessly with their joined-member row" — observable rule: after accept-invite, `GET /api/dashboard` returns exactly one row for that email, either `pending:true` or `pending:false`, never both; rendered team list length equals org member count + pending invite count with no duplicates.
- **F-036 AC-2:** "explains: this section is the personal security awareness items..." — pick the exact banner copy.
- **F-037 AC-1:** "or equivalent improved wording" — pick the exact string.
- **F-042 AC-3:** "minimal form ... Product Team decides" — another open decision. Decide in Round 2 to keep Round-3 ACs testable.
- **F-033 AC-3:** list of cascades is good, but add: *AC-3b: after removal, `/api/audit-logs` contains exactly one `member_removed` entry for that email, and `/api/orgs/[id]/members` returns 0 rows for that email, and `/api/dashboard` `team[]` no longer contains that email.*
- **F-031 AC-5:** "rate-limited ... 20 messages/item/day" — lock the number. Testable as: 21st POST returns `HTTP 429` with specific error key.
- **F-031 AC-7:** "output filter" — "basic keyword + length filter" is vague; define the filter rule set concretely or drop AC-7 as "built into AC-4 system prompt" (safer — output filters on LLM text are famously brittle to test).

### Acceptable as-written (observable outcomes)

F-023, F-024, F-025, F-034 (modulo exact copy), F-035 AC-1/2/3, F-038 AC-1..AC-6, AC-8 (well-scoped with Stefan's example numbers), F-039 AC-1..AC-5 (excellent — 2-user observable), F-040, F-043 AC-1..AC-7 (harness scope is unambiguous).

### Missing ACs to add

- **F-033:** no AC covers the "orphaned assessment_responses" negative case — add: *AC-10: After removal, SQL query `select count(*) from smbsec1.assessment_responses where user_id = <removed>` returns 0.*
- **F-038:** no AC for the 4-scenario unit test tabular inputs. Add expected values (table) in AC-9 so it's click-throughable.
- **F-009 (mobile audit):** ACs are one-liners. Add: viewport list `[360x640, 390x844, 768x1024]`, per-page list to sweep, explicit "no horizontal scroll" and "no element overflow" assertions. Otherwise it is untestable-by-convention.
- **F-012 (AI guardrails):** needs concrete injection test corpus (10-15 malicious prompts) so "guardrails tightened" can be asserted. Without corpus, we cannot declare success.

---

## 2. Test scenarios — high-risk features

### F-038 dashboard math (critical path)

Need parameterised test feeding Stefan's exact example:
1. **Empty org** (no responses): dashboard shows 0/total, no crash.
2. **Only owner-as-IT-exec answered** — 7 done, 3 unsure, 3 N/A in IT Baseline: bar shows 10/25, pill order = Resolved | Done | N/A | Unsure/Not yet.
3. **Only employee answered** 4 done, 1 not yet, 1 N/A awareness: Awareness bar 5/11.
4. **Both answered concurrently** — owner refreshes: top-line `X/Y` same on first load and on reload (denominator stable) — snapshot twice and diff.
5. **IT Executor reassigned mid-assessment** (depends on F-041): pre-reassign snapshot equals post-reassign snapshot for track totals.
6. **Mix of joined + pending invitees** (crosses F-035): pending rows show 0% and do not move bar up/down when invitee eventually answers their first item.

### F-039 My checklist isolation (2-user)

1. Owner+employee open `/workspace` in two Playwright contexts.
2. Employee answers 3 awareness items.
3. Owner reloads `/workspace`: My checklist bar unchanged at owner's baseline value.
4. Owner answers 2 items: owner's bar moves, employee's bar (on reload) does not move.
5. Regression tie-in with F-038: dashboard top-line reflects both users' contributions after each step.

### F-040 report ↔ dashboard parity

- Same org seeded via test harness → call `/api/dashboard` and `/api/report` → assert per-track `resolved/done/notApplicable/unsure` and percent are numerically identical (tolerance 0).
- Print view: Playwright `page.emulateMedia({ media: 'print' })` + snapshot assertion on the same numbers.

### F-041 IT Exec reassignment

1. Owner-as-IT-exec answers 5 IT Baseline items + 2 awareness items.
2. Owner invites employee B and reassigns IT Exec to B.
3. B logs in: `/workspace/checklist` shows 5 answered IT items with same values; owner's `/workspace/checklist` no longer shows IT Baseline section.
4. Dashboard track totals unchanged — assert delta = 0 using `expectDashboardCounts` from F-043.
5. Negative: reassignment to a user who is not yet a member → HTTP 400.
6. Atomicity: simulate failure mid-flip via killing the API mid-transaction → state unchanged (hard to test; at minimum assert single DB transaction wraps both updates).

### F-033 GDPR member deletion

1. Accepted employee with 5 responses + 1 campaign recipient row → remove → orphan-row query returns 0 everywhere.
2. Pending invite removal → `invites` row gone; no other rows touched.
3. Try-to-remove-self → HTTP 403.
4. Try-to-remove-last-owner → HTTP 403.
5. Removal while active assessment → dashboard counts recompute correctly, no double-counting.
6. Audit log entry exists and is the only new row created.
7. RLS: non-admin hits DELETE endpoint → HTTP 403.

### F-031 AI chat

1. Multi-turn happy path — initial message + 2 follow-ups stay on topic.
2. Prompt-injection corpus — the F-012 corpus, re-used here, should return refusal or stay on topic.
3. Rate-limit: 21st message in one day → 429.
4. Clear-chat → next message starts fresh (no history leaking).
5. Mobile viewport 360x640 → chat layout readable (F-009 intersection).
6. Token cost — assert `message.content.length` capped or paginated (prevents runaway history growth).

---

## 3. Regression risk map

| Feature | Could break |
|---|---|
| F-038 dashboard math | F-040 security report math (called out), campaign analytics (`/workspace/campaigns/*` — any analytics sharing dashboard helpers), `audit_logs` if counts are logged, any SQL in `docs/sql/` that reads aggregates (check migrations 014-020 for analytics views). |
| F-039 My checklist | Workspace home's `hasItExecutor` / onboarding-steps widget if they share the same fetch. Checklist page own progress number (PI 13 finding). |
| F-033 cascade delete | Audit log invariants (F-040 audit read may fail), campaign sent/clicked totals if recipients are hard-deleted (prefer anonymise — AC-3 hedges). Security report will show fewer responses — acceptable, but pin test. RLS on `assessment_responses` DELETE must be checked. |
| F-041 reassignment | F-038 math; checklist item visibility per role in `roles.spec.ts`; `is_it_executor` flag read across `/workspace` entry banner (F-036). |
| F-031 AI chat | F-012 rate limit (must move to persistent store first), current `/api/guidance` single-shot callers, token budget alerts. |
| F-035 pending invitees | Team page member count, onboarding flow "inviteMembers" completion detection on workspace home. |
| F-034 empty-state CTA | Role-permission tests (`roles.spec.ts`) — link removal must not regress owner happy path. |

**Mandatory regression pack for PI 14 end:** `roles.spec.ts`, `dashboard.spec.ts`, `invite.spec.ts`, `delete.spec.ts`, `checklist.spec.ts`, `gdpr.spec.ts` — all must pass on every iteration push, not just at end of PI.

---

## 4. Multi-user E2E harness (F-043) — v1 must-haves vs nice-to-haves

### Must-have (v1, blocking PI 14)

1. `createOrgWithMembers({ owner, employees: [...] })` returning `{ org, contexts: { owner: BrowserContext, empA: ..., itExec: ... } }` — use existing `createIsolatedOrg` + `addOrgMember` in `frontend/tests/helpers/fixtures.ts` as scaffold.
2. Org-name prefix isolation: `E2E-PI14-<uuid>-<name>` so parallel runs never collide, and a SQL query can cleanly find them.
3. PKCE-session injection per context (existing helper exists from PI 11).
4. `expectDashboardCounts(ctx, {...})` assertion with explicit labels matching F-038 (resolved / done / notApplicable / unsureNotYet).
5. **Teardown step** — non-negotiable. Without it, repeated CI runs leak orgs into Supabase and future counts drift. Delete-by-prefix at test end (Playwright `afterEach`) PLUS a nightly sweeper (cron or GitHub Action) that hard-deletes any `E2E-PI14-*` org older than 24h, as a safety net. Org-name-prefix isolation **is not enough on its own** — we still need an explicit teardown, because a crashing test leaves data behind and subsequent "deterministic math" tests then see inflated counts.
6. Deterministic seeding: helper to set specific answer states (done / unsure / skipped / not-applicable) via direct service-role inserts into `assessment_responses`, not clicking through the UI — 10x faster and avoids timing flakes in the multi-user scenarios.
7. AC-5 "pass 10 consecutive runs without flakiness" — keep this and gate PI closure on it.

### Nice-to-have (v1.1, push if time-boxed)

- Parameterised fixture factories (`given.orgWithOwnerAndItExecAnd3Employees()` etc).
- Visual diff snapshots of dashboard for the canonical Stefan example.
- Matrix harness running all 4 F-038 scenarios in one parameterised test.
- Per-run seed-dump to a file for manual replay.

### Question to resolve

F-043 AC-7 says "does NOT run against PROD". Confirm this means "tests run against a dedicated Supabase project (or same project but isolated via org-name prefix)" — I believe we use the same Supabase instance as PROD today (per `test-strategy.md` line 104). This is acceptable IF the teardown above is robust. **Needs explicit statement from Architect in Round 2.**

---

## 5. Recommended PI grouping (testability lens)

The goal: each PI ships a coherent set of features a single BA pass can verify end-to-end without needing to mock half-done work.

### PI 14 — "Dashboard truth + test harness" (bundle = mandatory)
- **F-043** (multi-user harness) — BLOCKING prerequisite. Ship first iteration of PI 14 so F-038/F-039/F-035 can actually be tested.
- **F-038** + **F-039** + **F-040** — *must ship together*. Splitting creates an inconsistent state (report vs dashboard disagree) that BA cannot rationally test. All three share the same helper; a shared helper is fine IF ACs have the same "Resolved" definition — which is my Round 2 ask.
- **F-035** — same pass. The pending-invitee denominator hangs off the same math; testing in isolation is pointless.
- **F-034** — trivial add; include in same pass to amortise BA time.

PI 14 acceptance = one BA test run can verify all of the above with a single 2-user harness scenario. Elegant.

### PI 15 — "Team lifecycle + IT Exec"
- **F-041** (IT Exec reassignment) — depends on F-038 math being stable.
- **F-033** (GDPR member deletion) — also depends on F-038 math being stable (deletion recomputes counts).
- **F-023** + **F-024** + **F-025** — low-effort PI 13 carryovers, easy to slot into PI 15.
- **F-042** — "contact us" copy fix (Medium).

Rationale: both F-033 and F-041 are data-mutation features with regression risk into dashboard math. They can share a BA test run that re-runs the harness against modified states.

### PI 16 — "Awareness + AI polish"
- **F-036** IT Exec awareness banner
- **F-037** template copy
- **F-012** AI guardrails (must precede F-031)
- **F-031** AI chat
- **F-009** mobile audit (last so mobile covers the finished UI, not half-built)

Rationale: F-012 must ship before F-031. Mobile audit benefits from coming last because the UI is finalised.

---

## 6. Test data prep (Rule 1)

### For F-035 (pending invitees)

Fresh fixtures needed each run (teardown after):
- 1 owner org (use `smbsec1_2owner@bertramconsulting.dk` — already has multiple employees available)
- Owner in "joined" state
- IT exec invited + accepted
- emp1 invited + accepted + 3 responses (verifies joined-members list)
- emp2 invited, NOT accepted (verifies pending row rendering)
- emp3 invited, NOT accepted, then REVOKED (verifies revoke disappears row)
- Reset invite tokens before each test run (per Rule 1).

SQL reset snippet to ship with the harness:
```sql
delete from smbsec1.invites where email like 'smbsec1_2emp%@bertramconsulting.dk' and accepted_at is null;
```

### For F-041 (IT Exec reassignment)

- 1 owner org (use `smbsec1_3owner` — currently clean / rarely used)
- Owner self-assigned as IT Exec
- Owner has answered 5 IT Baseline items on active assessment with known values (seed via service-role insert)
- Owner has answered 2 awareness items
- Employee B (`smbsec1_3it@bertramconsulting.dk`) invited + accepted, NOT yet IT exec
- Audit log baseline captured (row count) so we can assert exactly 1 new `it_executor_reassigned` entry after action
- Fixture must capture the `org_id`, `assessment_id`, and both user_ids for assertions

**Hard dependency:** F-041 cannot be BA-tested unless F-043 harness is live — direct UI-click seeding of 5 IT Baseline items takes ~90s of browser time and is flaky. Service-role seeding is non-negotiable.

---

## 7. Open BA questions for Round 2

1. **F-038 AC-7:** which denominator definition? (per-member sum vs union-of-answered.) Locked answer needed from PM+Architect to finalise AC.
2. **F-041 AC-1:** which reassignment behaviour? I recommend "preserve responses, rebind to assessment". Need PM confirmation.
3. **F-031 AC-5:** exact rate-limit number? 20/item/day feels fine but confirm token budget.
4. **F-031 AC-7:** keep output filter AC or drop it (too flaky to test deterministically)? I recommend drop.
5. **F-042 AC-3:** ship feedback form or copy-only? Copy-only is the safer PI 15 scope.
6. **F-009:** which exact viewports + which exact page list for the audit? I recommend `[360x640, 390x844, 768x1024]` × the 14 routes in CLAUDE.md "Key routes" table. Confirm.
7. **F-033 AC-3:** campaign_recipients — delete or anonymise? GDPR right-to-erasure likely requires delete, but breaks historical campaign analytics. Security + Architect input needed.
8. **F-043:** OK to run against PROD Supabase with strict teardown + org-name prefixes, or should we stand up a separate dev Supabase project? Answer determines harness architecture.
9. **Backlog PI-grouping:** do we need a 4th PI (PI 17) for regression fixes arising from the Business Test after PI 14-16? Worth pencilling into backlog.
10. **Deletion semantics F-033 + F-041 interaction:** what happens if owner removes a user who IS the current IT Executor (per AC-9)? Cascade triggers re-offer of "Invite your IT Executor"; but what happens to their IT Baseline responses? Delete? Preserve on assessment? Needs alignment with F-041.

---

**Bottom line from the BA chair:**

- F-038 AC-7 and F-041 AC-1 are the two blockers to exiting Round 2. Everything else is testable with minor copy tightening.
- F-043 MUST land in iteration 1 of PI 14 or nothing downstream is verifiable without pain.
- Bundle F-038 + F-039 + F-040 + F-035 into a single PI — they cannot honestly be tested separately.
- Teardown is required for the harness; org-name prefix alone is not enough.
- Regression pack for every iteration: `roles`, `dashboard`, `invite`, `delete`, `checklist`, `gdpr`.
