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
