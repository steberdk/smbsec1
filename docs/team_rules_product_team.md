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

---

## Rule 4 (PI 16 ROADMAP session, 2026-04-14)

**Any PI touching a user-facing page must review and update that page's matrix in `docs/quality/matrices/<page>.md` at step 2b, before handing to IT Dev refinement.**

The matrix enumerates every persona from `docs/quality/personas.md` × every page region × the expected content/behavior, and links the cells to invariant IDs from `docs/quality/invariants.md`. Cells flagged ⚠ DEFECT are the feature's fix scope; cells that cannot link to any invariant are either wrong or propose a new invariant (which BA adds).

UX Designer reviews for cross-page visual/flow coherence. Architect signs off that cell behaviors are implementable without new shared state. BA owns authoring.

**Why:** Stefan's 2026-04-14 test report (PDF #42–#47) surfaced four cross-feature inconsistencies (Home subtitle ↔ Settings IT-executor; Home step strikethrough not deterministic; "Invite your IT Executor" shown after reassignment) that no feature owner saw because each feature was verified in isolation. The per-page matrix forces every persona's view of a page to be considered on every PI that changes the page, regardless of which feature is the "owner" of the change. Without this rule, the same class of defect recurs — features pass individual verification, the combination leaks contradictions, and the product owner becomes the de-facto integration tester.

**How to apply.**
- On PI-start (§2b refinement): for each feature's "Pages touched" list, open the matrix. Read every cell. Update any cell the feature changes. Flag ⚠ DEFECT for any cell whose intended behavior now differs from deployed reality and feed those into the same PI's fix scope (High/Medium) or a deferred feature (Low).
- On feature completion: the PR that ships the code includes the matrix diff in the same commit (matches IT Dev Rule 2).
- When adding a new invariant, reference it in every affected matrix cell's `Linked invariants:` row.
