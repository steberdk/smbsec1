# Business Test Team Rules

Rules agreed by the Business Test Team through retrospectives. Must not contradict CLAUDE.md.

---

## Rule 1 (PI 12 Business Test, 2026-04-07)

**Prepare test data before testing auth flows — don't rely on stale invites or shared accounts.**

When testing invite/onboarding flows on PROD, always start with a fresh invite from the owner, not a stale one from previous test sessions. Expired tokens and already-accepted invites will block the test. If the owner hasn't sent a fresh invite yet, coordinate with the owner test agent or use the Supabase SQL editor to reset invite state before testing.

**Why:** In PI 12 Business Test, the employee flow test was blocked because the invite token from a previous session was expired. The BA agent spent significant time navigating webmail only to discover the token was unusable. Starting with verified-fresh test data would have saved ~10 minutes.

---

## Rule 2 (PI 14 Business Test, 2026-04-11)

**Cross-check per-track numbers between Dashboard and Security Report — don't stop at the top-level totals.**

When verifying data-correctness features (F-038 class), the BA team must assert that EVERY number rendered on the Security Report matches the Dashboard — not just the top-level resolved/denominator/percent, but also per-track labels (IT Baseline X / Y items, Awareness X / Y items). Top-level parity can pass while per-track labels use different semantics for "Y" (per-member-sum vs unique-item count), creating a visual inconsistency.

**Why:** In PI 14 BA Test, the top-level 16/47/34% matched between Dashboard and Report, so F-040 was marked PASS. But the per-track awareness label showed "7 / 22 items" on the Dashboard and "11 items" on the Report — caught as D-01 Low defect only after the overall verdict was issued. If per-track parity had been in the BA checklist from the start, D-01 would have been caught before sign-off and fixed in Iter 3 instead of becoming a follow-up F-044.

---

## Rule 3 — Persona-journey testing driven by page matrices (added 2026-04-14, PI 16)

**Rule.** BA testing is **persona-journey driven**, not feature-list driven. For each persona in `docs/quality/personas.md`, walk every reachable page. For every page visited, open the corresponding `docs/quality/matrices/<page>.md` file and verify — cell by cell — that the displayed content matches the intended content for that persona. Features in the PI are the context, not the boundary.

On every screen, also run the consistency checklist:
1. Does the header / subtitle / active-nav indicator agree with the rest of the page? (catches PDF #43 class)
2. Does any visible value match its source of truth on other pages? (Settings ↔ Home ↔ Team)
3. Is any "Not set" / "Unknown" rendering actually missing data vs. a derivable value that was not wired? (`INV-no-not-set-when-derivable`)
4. Does any button trigger a leaked error string (Postgres, SQLSTATE, stack trace) on the error path? (`INV-no-raw-db-errors`, PDF #46 class)
5. Does any "delete" or "remove" label actually remove the advertised data on the happy path and report clearly on the unhappy path? (`INV-advertised-deletion-actually-deletes`, `INV-destructive-action-double-confirm`)

Any cell that does not match reality is a defect. Log with severity (High / Medium / Low), PDF-style numbering if the finding is a regression of a prior one, and link to the matrix cell.

**Why.** Stefan's 2026-04-14 PDF #42–#47 were cross-feature defects that the previous feature-scoped BA approach missed — the BA verified the features in the PI's scope, not the screens where the features interacted. Framing BA work as persona-journey × matrix closes that blind spot: the matrix makes "expected" concrete, the persona set makes "who reaches this" concrete, and the consistency checklist gives a fixed set of five checks that run on every screen regardless of which feature is in play. Stefan said: "the amount of spec I could do for all roles would be vast … but maybe I can leave it open to the Claude-smartness but also add few specific expectations." This rule is the minimum specific expectation.

**How to apply.**
- On PI start: re-read `docs/quality/personas.md` and `docs/quality/matrices/*.md` for the pages this PI touches.
- For each persona, prepare fresh test data (Rule 1) and walk every reachable page. Open the matrix file; check each cell.
- Run the 5-point consistency checklist on each page regardless of whether the PI changed it — regression surface expands as the app grows.
- Report deviations with severity. Use the page matrix as the single source of truth for "what the page should show." If the matrix is wrong, flag that too — the matrix is a working artefact, not scripture.

---

## Rule 4 (PI 16 Phase C retrospective, 2026-04-14)

**When a matrix cell is ambiguous, log the ambiguity — do NOT guess the intended behavior.**

If during testing a matrix cell could plausibly mean two or more behaviors (e.g. Team R8b × O3 "amber IT Executor removal warning" — does it apply to pending-invite revocation or only accepted-member removal?), the BA MUST log the ambiguity as a finding against the matrix itself, not against the code. Propose a clarifying wording. Do NOT silently pick one interpretation and pass/fail the code against that guess.

**Why.** The matrix is the spec. A BA who guesses becomes the decision-maker on spec ambiguity — defeating the purpose of the persona-journey approach, which is that intended behavior is authoritative *before* the BA starts. PI-16 Phase C surfaced exactly this case (amber-banner conditional in Team R8b) and the BA correctly logged it as a matrix-ambiguity defect rather than resolving it ad hoc.

**How to apply.** When reading a matrix cell for the persona you are walking, if the cell's statement leaves two implementations both reasonable, stop the walk, document the ambiguity (matrix file + cell coordinate + the two readings), and continue with other cells. The PI refinement BA owns clarifying the matrix before the next PI touches that page.
