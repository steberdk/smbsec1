# Product Team Rules

Rules agreed by the Product Team through retrospectives. Must not contradict CLAUDE.md.

---

## Rule 1 (PI 12 ROADMAP session, 2026-04-07)

**Start from verified reality, not documented intent.**

When a critical UX flow is broken, the Product Team must start by mapping the ACTUAL flow (code-traced, browser-verified) before proposing solutions. The Architect should provide a code-traced flow diagram as input to Round 1, so all agents reason from verified reality rather than the documented flow in user-flows.md.

**Why:** In the PI 12 ROADMAP session, the Architect's code analysis of useWorkspace.tsx was the most valuable Round 1 input because it traced the actual redirect chain. Other agents initially reasoned from user-flows.md, which described intended behavior — not the broken reality. This wasted Round 1 cycles on solutions for the wrong problem.

---

## Rule 2 (PI 12 refinement, 2026-04-07)

**Define acceptance criteria with concrete test targets, not implementation descriptions.**

ACs must name specific observable outcomes (URL, page element, HTTP status code), not implementation approaches. "User lands on `/accept-invite`" is testable. "WorkspaceProvider checks pending invite" is not — it describes implementation, not outcome.

**Why:** During PI 12 refinement, several ACs mixed implementation notes with outcomes. BA had to rewrite them as test scenarios. Starting with testable outcomes avoids a translation step and keeps Product Team and IT Dev Team aligned on the same verification criteria.

---

## Rule 3 (PI 14 ROADMAP session, 2026-04-11)

**No "TBD / Product Team to choose later" punts in ACs that ship to IT Dev refinement.**

When the team is split between two technical or semantic options for an AC (e.g. F-038 AC-7 denominator semantics, F-041 AC-1 reassignment behaviour), the Product Team MUST lock one option before the consensus document hands off to IT Dev Team. "TBD — Product Team chooses during refinement" is not allowed in any AC that's leaving the ROADMAP session. Round 3 (synthesis) is the place to break ties.

**Why:** In PI 14 Round 1, both F-038 AC-7 and F-041 AC-1 were initially written as "Product Team to decide". BA's Round 1 §1 flagged them as the two blocking ACs. Locking them in Round 2 (and reconciling minor disagreements in Round 3) saved an entire IT Dev Team refinement loop that would otherwise have bounced back to the Product Team.
