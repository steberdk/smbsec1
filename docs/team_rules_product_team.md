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
