# Business Test Team Rules

Rules agreed by the Business Test Team through retrospectives. Must not contradict CLAUDE.md.

---

## Rule 1 (PI 12 Business Test, 2026-04-07)

**Prepare test data before testing auth flows — don't rely on stale invites or shared accounts.**

When testing invite/onboarding flows on PROD, always start with a fresh invite from the owner, not a stale one from previous test sessions. Expired tokens and already-accepted invites will block the test. If the owner hasn't sent a fresh invite yet, coordinate with the owner test agent or use the Supabase SQL editor to reset invite state before testing.

**Why:** In PI 12 Business Test, the employee flow test was blocked because the invite token from a previous session was expired. The BA agent spent significant time navigating webmail only to discover the token was unusable. Starting with verified-fresh test data would have saved ~10 minutes.
