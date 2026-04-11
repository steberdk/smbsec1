# Round 2 — Product Manager (convergence)

**Author:** Product Manager
**Round:** 2 of 3
**Date:** 2026-04-11
**Purpose:** Decide. Everyone's Round 1 is read. We converge here so the Architect can refine for IT Dev.

---

## 1. PI count — decision: **TWO PIs, not three, not one**

Round 1 positions: PM=3, UX=2, Security=2, BA=2 (3 stacked = PI 14/15/16), Architect=1 PI / 2 iterations. The Architect's "1 PI" reading is technically correct (the work fits) but ignores the Business-Test gate (step 3 of CLAUDE.md development process): every PI must close with a BA browser sweep, and bundling F-031/F-033/F-009 into the same PI as F-038 dashboard math triples the BA surface and reopens the phantom-Done risk.

**Decision: PI 14 + PI 15. PI 16 is NOT pre-allocated** — it only exists if the Business-Test sweep at end of PI 15 finds High/Medium defects, per CLAUDE.md §3d.

Rationale: PI 14 is data-correctness + harness + copy leftovers (homogeneous, one BA mental model: "numbers tell the truth"). PI 15 is new surface area (AI chat, GDPR deletion, IT Exec reassignment, mobile, guardrails) — heterogeneous, needs its own BA sweep. Forcing them into one PI loses the checkpoint and we already know from F-023/24/25 that losing checkpoints equals phantom-Done.

---

## 2. F-038 AC-7 denominator — **LOCKED: option (b), unique checklist items**

Architect confirmed in A.1.3 the 18/36 ↔ 18/47 flicker is a server/client disagreement: API computes `percent` against `totalPossible=47` (per-member sum) but returns `stats.total=36` (unique items). UX Round 1 §2 recommends (b) with "responses" framing. Security treats this as a P1 trust bug. Stefan's mental model in the PDF says 36.

**The denominator, in one sentence:**
> The denominator is the number of unique checklist items in scope for the active assessment for the caller's viewing context — i.e. the union of items any in-scope member can answer (IT Baseline ∪ Awareness if any in-scope member is an IT Executor, else Awareness only); pending invitees do NOT expand the denominator.

Consequences locked:
- Top-line, per-track bar, My checklist, report all use `(done + skipped) / denominator`. Unsure is explicitly NOT in the numerator.
- `stats.me` (per F-039, Architect A.2 Option C): uses the caller's own item set (full if IT Exec, awareness-only otherwise). Same formula.
- Server returns `stats.denominator` as the single authoritative field. The client MUST NOT compute its own denominator. `stats.total` is deprecated — delete the legacy field so no one reintroduces the flicker.
- The "responses across members" number UX proposed labelling separately is DROPPED from PI 14 scope. One number, one label — "X of Y items". We can add a secondary "responses" sub-label in PI 15 if Stefan asks for it.

F-035 (pending invitees) thereby contributes **zero** to the denominator. This is more intuitive (sending an invite does not make the org suddenly "less secure") and avoids the cross-feature coupling Architect flagged in E.2.

---

## 3. F-041 AC-1 reassignment behaviour — **LOCKED: responses belong to the assessment, keyed by item**

Current DB: `assessment_responses (assessment_id, assessment_item_id, user_id)` — user-keyed. Locked product decision:

> On IT Executor reassignment, existing IT Baseline responses for the active assessment are **preserved** and **rebound** to the new IT Executor's user_id. The former IT Executor no longer sees the IT Baseline section. Dashboard totals are unchanged before vs after the reassignment. Awareness responses are never touched (they belong to whoever authored them, regardless of IT Exec role).

Implementation contract for Architect:
- `UPDATE assessment_responses SET user_id = new_exec WHERE assessment_id = X AND assessment_item_id IN (IT_baseline_items) AND user_id = old_exec`.
- Collision case: if the new IT Exec already has an awareness response for an item (shouldn't happen — IT items are IT-only — but assert): fail the transaction.
- Wrapped in a single Postgres RPC (`reassign_it_executor`), atomic with the `is_it_executor` flag flip and the audit_log insert. Security §3 requires the audit entry; that's non-negotiable.
- UX §6 dialog copy is approved as drafted, with one edit: replace "Stefan's personal checklist will drop the IT Baseline section" with "The previous IT Executor's personal checklist will drop the IT Baseline section" (names are runtime-filled).

This moots Architect E.5 ("user-owned vs assessment-owned"): we stay user-keyed in the schema but treat reassignment as a rebind. No schema migration.

---

## 4. F-033 audit log email handling — **Security wins. Hash the email.**

Security §2 is right and I push back on my own F-033 AC-7 wording. "Compliance record-keeping" is not a cited legal duty for an SMB security tool — it was hedging. GDPR Art. 17 is about removing PII; a plain-text email in the audit log re-introduces it. In a 5-person org, a pseudonymised log with timestamps + org context is still re-identifiable, so pseudonymisation is not enough either. Hash wins.

Locked AC-7 rewrite:
> AC-7: Audit log entry `member_removed` contains `actor_user_id` (the admin who performed the deletion), `org_id`, `timestamp`, and `removed_email_sha256` (SHA-256 hex of lowercased email). No plain-text email anywhere in the `audit_logs` row or its `payload`.

Campaign_recipients (Architect E.4): delete the row fully. Historical campaign click-rate stats lose one recipient; that's acceptable. Anonymising rows that still tie to the same campaign + timestamps is not meaningfully less identifiable in small orgs. Delete.

---

## 5. Anthropic missing from privacy policy sub-processors — **PI 14, Iteration 1, part of F-012 scope**

Security §6.1 is correct. This is a pre-existing GDPR Art. 13 transparency gap that predates F-031. Adding F-031 makes it worse but does not create it. **We ship the fix in PI 14 Iteration 1** (not PI 15 where F-012 lands for chat hardening) because the gap exists today and is independent of the AI chat work.

Concretely: extend F-012 with a new AC (AC-X): `/privacy` Sub-processors table adds Anthropic (purpose: AI guidance generation; region: US; data retention: up to 30 days per Anthropic trust-and-safety). Section 4 (international transfers) updated. Section 8 (right to object) — out of scope for AC-X, tracked as a small Medium item for PI 15 if Security insists on org-level AI toggle. **Iteration 1 of PI 14 ships the privacy page update.** This is a 1-hour copy change and does not depend on any other work.

---

## 6. F-042 copy fix vs feedback form — **Copy fix only. No form.**

UX, Security, and BA all hedged. I decide: delete the "contact us via the application" copy and replace with "For questions, email {support email}". No form, no endpoint, no Resend integration. Rationale: we have no ticket infrastructure, the form would leak promises we can't keep, and every minute spent on a form is a minute not spent on F-038. If Stefan asks for a form at the end of PI 15 Business Test, we queue it then.

---

## 7. Phantom-Done prevention — **Combined process rule**

Combine my PR-screenshot proposal with BA's mandatory regression spec run. Both go into `team_rules_it_dev_team.md` at PI 14 retrospective (step 2n):

> **Rule X (Phantom-Done prevention):** No feature moves from status `Developed` to `Done` until BOTH of the following: (a) the PR description includes a dated screenshot of the feature working in a real browser on the relevant page, taken by the implementing dev on their own machine, AND (b) the iteration's mandatory regression pack (`roles`, `dashboard`, `invite`, `delete`, `checklist`, `gdpr`) passes green in CI on the merged main commit. If the regression pack is broken by the change and not restored before iteration close, the feature drops back to `Ready` and blocks PI closure.

This closes F-023/24/25's failure mode (claimed Done, not actually shipped) because the screenshot requirement catches "I forgot to wire the page" bugs, and the regression requirement catches "I broke an adjacent flow" bugs.

---

## 8. Final PI 14 / PI 15 scope — locked

### PI 14 — "Numbers you can trust" (3 iterations, ~2 weeks)

**Iteration 1 — Foundation + quick copy wins**
- F-043 (multi-user E2E harness) — ships FIRST, everything else depends on it
- F-012 (AI guardrails + persistent rate limit + **Anthropic in privacy page**) — partial scope: the persistent rate limit table + privacy page update; chat-specific hardening stays in PI 15
- F-023, F-024, F-025 — copy/nav fixes, reopened from PI 13
- F-034 — employee empty-state CTA removal
- F-037 — template section 7 rewording
- F-042 — "contact us" copy fix (no form)

**Iteration 2 — Dashboard math (the big one)**
- F-038 — dashboard math fix, pill order, denominator locked per §2
- F-039 — "My checklist" uses `stats.me` (Architect Option C)
- F-040 — report auto-follows (same API shape)
- F-035 — pending invitees on dashboard (zero denominator contribution)

**Iteration 3 — Buffer + BA prep**
- F-036 — IT Executor awareness banner
- Regression sweep, screenshot audit, BA prep
- Push-to-Vercel, Business Test Team full sweep per CLAUDE.md §2k

**PI 14 exit gate:** Stefan's 2026-04-11 test script re-run, every finding 31–38 visibly fixed in a live browser, BA sign-off with screenshots.

### PI 15 — "Finish the user promises" (3 iterations, ~2.5 weeks)

**Iteration 1 — GDPR + IT Exec**
- F-033 — remove team member (GDPR hard-delete, hashed audit email)
- F-041 — IT Executor reassignment (rebind, audit, atomic RPC)

**Iteration 2 — AI chat + mobile**
- F-012 (remainder) — chat-specific hardening: system prompt blocks, output filter logging, kill-switch env var, per-session max-turn cap
- F-031 — interactive AI chat (builds on F-012 remainder)
- F-009 — mobile audit scoped to `[360×640, 390×844, 768×1024]` × the 14 routes in CLAUDE.md; chat-on-mobile is the highest-value subset

**Iteration 3 — Buffer + Business Test**
- Hardening, prompt-injection corpus runs, mobile regression
- Vercel deploy, Business Test Team sweep

**PI 16 (contingent only):** Pre-allocated as a placeholder in backlog.md per CLAUDE.md §3c, triggered only if PI 15 Business Test finds High/Medium defects. No scope assigned upfront.

---

**End Round 2 — Product Manager. Over to Round 3 for team sign-off on the locked decisions.**
