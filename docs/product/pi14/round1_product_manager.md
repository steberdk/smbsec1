# Round 1 — Product Manager input for PI 14+ ROADMAP

**Author:** Product Manager
**Round:** 1 of 3 (independent input)
**Date:** 2026-04-11
**Scope:** F-009, F-012, F-023, F-024, F-025, F-031, F-033, F-034–F-043

---

## TL;DR

- **Three PIs**: PI 14 = trust & correctness (data + test harness), PI 15 = AI chat + mobile + GDPR member deletion, PI 16 = polish & leftovers.
- **F-043 (multi-user test harness) ships in PI 14 Iteration 1, before anything touches dashboard math.** Without it, F-038/F-039/F-040/F-041 will regress the same way F-023/F-024/F-025 regressed in PI 13 (claimed Done, not actually delivered).
- **F-038 is the single most important item on the list.** A security tool whose dashboard shows inflated, unstable numbers is worse than no dashboard — Stefan's trust is already cracked. This fix is non-negotiable for PI 14.
- **F-023/F-024/F-025 must be re-verified with browser screenshots before Done**, not just code-green. PI 13 already claimed them Done once.

---

## 1. Recommended PI structure

### PI 14 — "Numbers you can trust" (~2 weeks, 3 iterations)

**Theme:** Fix data correctness and put a multi-user test harness in place so we can't keep regressing on the same findings.

**Iteration 1 — Foundation (test harness + quick wins)**
- **F-043** — Multi-user E2E test harness. **Ships first.** Used by every other feature in this PI.
- **F-034** — Remove "Start an assessment" CTA from employee empty-state dashboard. Small, uses F-043 as its first real customer.
- **F-037** — Reword 1-page security rules template section 7. Small content fix, zero risk.
- **F-042** — Fix/remove "contact us via the application" copy. Audit + copy sweep.
- **F-023** — Add navigation to expired/error invite pages. **Reopened from PI 13 — must be BA-verified in browser this time.**
- **F-024** — Login page heading mismatch. **Same note.**
- **F-025** — Minor copy inconsistencies. **Same note.**

**Iteration 2 — Dashboard math (the big one)**
- **F-038** — Fix dashboard math: pill order, track percentages, Resolved = Done + N/A, denominator stability. Uses F-043 harness.
- **F-039** — Workspace home "My checklist" uses OWN progress. Ships WITH F-038 (shares helper).
- **F-040** — Security report uses corrected math. Ships WITH F-038 (extract shared helper; one source of truth).
- **F-035** — Dashboard team list shows pending invitees. Coupled to F-038 denominator decision.

**Iteration 3 — IT Executor clarity**
- **F-041** — Define + implement IT Executor reassignment behaviour. Product Team must choose ONE behaviour during refinement and document in user-flows.md.
- **F-036** — IT Executor awareness-section banner. Small.

**PI 14 exit gate:** Stefan re-runs his 2026-04-11 test script. Every finding 31–41 must be visibly fixed in a live browser session.

---

### PI 15 — "Finish the user promises" (~2 weeks, 3 iterations)

**Theme:** Ship the AI chat Stefan asked for, make it work on a phone, and close the GDPR gap.

**Iteration 1**
- **F-012** — Tighten AI guidance guardrails (persistent rate limiting, input cap, hardened system prompt, output filter). **Must ship before F-031 exposes the API to multi-turn.**
- **F-009** — Mobile responsiveness audit (scope, document, fix top-3 offenders). Sets baseline for F-031 chat UX.

**Iteration 2**
- **F-031** — Interactive AI chat per checklist item. Builds on F-012.
- **F-033** — Owner can remove team member (GDPR member deletion) — the cascade logic is intricate; F-038's corrected math must already be shipped so we can verify "after removal, dashboard recomputes correctly" (F-033 AC-6).

**Iteration 3**
- Buffer for F-031 hardening (prompt injection attempts, token cost, mobile layout).
- Buffer for F-009 visual regressions found during F-031 mobile testing.

---

### PI 16 — "Polish & Business Test sweep"

- Business Test Team full walkthrough across PI 14 + PI 15 scope.
- Any Medium/High defects found → IT Dev fixes inside PI 16.
- Any Low defects → new features, defer to post-PI-16 backlog.
- **If PI 16 finds Medium/High defects on items Stefan flagged twice (F-023/F-024/F-025 or dashboard math), escalate to Stefan — we have a systemic problem.**

---

## 2. Sequencing / dependencies (explicit)

```
F-043 (harness) ──┬── F-034 ──┐
                  ├── F-038 ──┼── F-039 ──┬── F-035
                  │           │           │
                  │           └── F-040 ──┘
                  └── F-041

F-012 ── F-031
F-009 ── F-031 (mobile layout depends on mobile baseline)
F-038 ── F-033 (member removal must trigger correct recompute)
```

**Hard blockers:**
- F-043 ships before F-034/F-035/F-038/F-039/F-040/F-041 — otherwise we can't prove they work.
- F-038 + F-039 + F-040 ship in the **same iteration** using a **shared helper** — they're one feature wearing three hats.
- F-012 ships before F-031 — unguarded multi-turn Anthropic API is a cost and abuse risk.

**Soft ordering:**
- F-041 after F-038 so the reassignment test can assert correct dashboard counts.
- F-033 after F-038 so the "dashboard recomputes after removal" AC is provable.

---

## 3. Open questions for Round 2 (team, please weigh in)

1. **[for Architect]** F-038 AC-7: there are two competing denominator definitions. (a) "sum of per-member item totals (IT execs contribute IT+awareness, others contribute awareness only)" — matches current code. (b) "unique checklist items where ANY scoped member has answered". Which does Stefan actually want? Current code uses (a). My read of Stefan's PDF finding 35-d is that he wants (a) but wants it to be **stable** — the 18/36 ↔ 18/47 flicker suggests a race between two different aggregations. Architect: please trace the flicker. I'm 80% sure it's a client-side re-fetch race, not a server disagreement.
2. **[for Architect]** F-043: can the harness run against our **single shared Supabase instance** without contaminating Stefan's data? I think org-name prefix + cleanup hook is enough but want a second opinion.
3. **[for UX]** F-024: do we replace "Log in" with a context-aware heading (two variants), or do we go neutral ("Welcome") for both the landing CTA and direct /login? Neutral is simpler and less likely to regress.
4. **[for UX]** F-031: where does the chat live in the checklist item UI? Inline expansion, side drawer, or modal? Impacts F-009 mobile scope materially.
5. **[for Security]** F-031 + F-012: is an output filter enough, or do we also need per-org daily token budget (hard cap, not per-item)?
6. **[for Security]** F-033: audit log entry on member removal — should we hash the removed user's email for the audit log so the org keeps a record of "who was removed" without keeping the PII? Or is storing the email itself GDPR-legitimate here (legitimate interest / compliance record-keeping)?
7. **[for BA]** F-023/F-024/F-025 were claimed Done in PI 13. How do we prevent another phantom-Done? My proposal: no feature in PI 14+ moves to Done without a BA screenshot in the PR description. Agree?
8. **[for everyone]** F-042: does anyone want an in-app feedback form (Settings → "Send feedback" → Resend → Stefan inbox), or should we just delete the misleading copy? I lean delete — scope creep risk, and the form won't have any support-ticket infrastructure behind it.

---

## 4. One key product-management opinion

**F-038 is the most important feature in this entire scope, and it has to be fixed correctly the first time.**

Here's why: SMBsec1's entire value proposition is "trust a checklist you can act on". The dashboard is the page the owner opens every week to see if their team is safer than last week. If the bar reads 48% one day and 38% the next day because we changed the denominator silently, the owner stops trusting the dashboard. If they stop trusting the dashboard, they stop opening it. If they stop opening it, the product has failed — regardless of how polished the AI chat or mobile layout is.

Everything else in this scope is cosmetic, additive, or compliance. F-038 is foundational. It gets the test harness built under it (F-043), ships with its two coupled siblings in the same iteration (F-039, F-040), and has a unit test covering all four edge cases **before** being merged. No "we'll add the test in the next iteration".

If the team has to cut scope to hit PI 14, cut F-036 and F-037 before touching F-038.

---

## 5. Risk flags

| Feature | Risk | Mitigation |
|---|---|---|
| **F-038** | Denominator semantics ambiguous; "right answer" is a product decision disguised as a bug fix. | Product Team chooses and documents definition in Round 2. Architect traces the 18/36↔18/47 flicker in code before coding. Unit tests cover all 4 scenarios. |
| **F-043** | Harness flakiness defeats its own purpose (see AC-5: "10 consecutive runs without flakiness"). | Build harness as Iteration 1 deliverable, not as a side effect of other features. Gate other features on 10-run green. |
| **F-031** | Token cost blow-up. Prompt injection. Chat UI on mobile. | F-012 ships first (rate limiting persistent, input cap, output filter). Hard per-item daily cap. Mobile layout reviewed by UX in Round 2. |
| **F-041** | "IT Executor reassignment" as currently written mixes a policy decision (who owns existing responses) with an implementation task. | Product Team picks the policy in Round 2, **before** IT Dev Team touches it. Default: preserve responses on assessment, not on user. |
| **F-023/F-024/F-025** | Already marked Done once; commit fee865e did not deliver them. Blast radius: Stefan loses faith in our "Done" status. | Mandatory BA screenshot check on every PR in PI 14. PI status doc updated only after BA verification in a real browser, not after CI green. |
| **F-033** | Cascade delete on multiple tables is irreversible; a bug here destroys real user data. | Write unit + integration tests BEFORE implementing the DELETE endpoint. Transaction wrapper. No "partial success" state. |
| **F-009** | "Mobile responsiveness audit" as written is vague. Scope could balloon. | In Round 2, define a fixed set of viewports and a fixed set of pages. Everything outside that list goes to a follow-up feature. |
| **F-035** | "Include pending invitees in dashboard counts" interacts with F-038 denominator. If we pick denominator semantics (a) in F-038, pending invitees contribute their track totals but zero responses — this needs to be explicitly decided. | F-038 and F-035 reviewed together in refinement. Document in the F-038 AC-7 code comment. |

---

**End of Round 1 Product Manager input. I'll review UX / Security / Architect / BA Round 1 inputs in Round 2 and respond to their dependencies on what I've proposed here.**
