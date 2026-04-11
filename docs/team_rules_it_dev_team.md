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
