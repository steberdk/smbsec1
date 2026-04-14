# IT Dev Team Rules

Rules agreed by the IT Dev Team (or installed by ROADMAP session) through retrospectives. Must not contradict CLAUDE.md.

---

## Rule 1 — Anti-Phantom-Done gate (added 2026-04-11, PI 14 ROADMAP)

**Problem this solves.** In PI 13, features F-023, F-024, F-025 were marked Done in features.md and the PI 13 close-out note, but NO code shipped for any of them. The Architect Round 2 §11 root-caused this to a desync: the bulk status-flip commit be6db93 swept three features into Done even though they were never in scope for the PI 13 fix commit fee865e. The gate between "CI green" and "feature Done" was vibes, and vibes failed.

**Rule.** No feature in this project moves to status `Developed` unless ALL FOUR of the following appear in the Pull Request description that ships it:

1. **CI evidence.** Link to the GitHub Actions run showing the mandatory regression pack green: `auth`, `smoke`, `public`, `roles`, `onboarding`, `invite`, `dashboard`, `checklist`, `delete`, `gdpr`, `awareness`, `assessment`, `campaigns`. If any of those are skipped or filtered, the PR is rejected regardless of the reason. "Tests not in scope for this feature" is not an accepted reason — that is the phantom-Done path.

2. **Browser screenshot.** At least one dated screenshot of the feature's acceptance criterion observable in a real browser, taken by the implementing dev against local `npm run dev` or the Vercel preview URL. For copy fixes, a screenshot of the changed string in place. For math fixes (F-038 class), a screenshot showing the canonical fixture numbers from the feature's test table.

3. **Feature ID in PR title.** Format `F-nnn: <short summary>`. Enables automated traceability between PR, feature doc, and test file.

4. **Link to the new/changed test.** Every PR that lands a feature lands its tests in the same PR. No "tests will follow in the next iteration" — that is exactly how PI 13 produced phantom-Done.

**Who enforces.** The dev opens the PR. The coordinator (Claude) refuses to merge unless 1-4 are present. features.md and backlog.md status transitions happen AFTER merge, not before.

**What happens if a feature is flagged Done but later found not delivered.** Reopen the feature, set status back to Ready, treat as a P1 incident, add a mandatory retro entry to this file explaining which of the four gates was bypassed and how the process will prevent a recurrence.

---

## Rule 2 — Quality-baseline gates (added 2026-04-14, PI 16)

**Problem this solves.** Stefan's PDF #42–#47 found defects that the existing gates (lint / build / E2E / CI) did not catch: cross-page inconsistencies (Home ↔ Settings ↔ Team) and a missing-migration runtime error (`digest()` on Revoke+delete) that no test hit because no persona walked the path. The existing gates verify feature-scoped correctness, not app-wide coherence.

**Rule.** Two new mandatory gates sit in front of Business Test:

1. **Invariants suite green.** `frontend/tests/invariants.spec.ts` (F-046) encodes every invariant ID in `docs/quality/invariants.md` as an assertion. It runs on every CI build. A failing invariant blocks the PR regardless of the feature's scope — the invariant exists precisely because the failing case affects more than one feature.

2. **Persona smoke green post-deploy.** `frontend/tests/smoke/personas.spec.ts` (F-046) walks each persona in `docs/quality/personas.md` across every reachable page. Runs against the Vercel preview/production URL after every deploy. A Red post-deploy smoke run blocks the PI from entering Business Test (§3 in CLAUDE.md).

**Same-commit matrix update.** Any PR that modifies a user-facing page MUST update the corresponding `docs/quality/matrices/<page>.md` file in the same commit. The dev checks the matrix's `Linked invariants:` rows; if the change introduces a new cross-page truth, the dev proposes an invariant (or asks BA to) instead of hiding it in code comments.

**Who enforces.** The dev opens the PR. The coordinator (Claude) refuses to merge unless invariants suite is green AND the matrix diff is present. Post-deploy smoke is a separate check before PI advances to Business Test.

**What happens on Red.** Same reopen/retro mechanic as Rule 1.
