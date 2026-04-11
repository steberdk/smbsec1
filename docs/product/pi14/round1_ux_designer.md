# PI 14 Roadmap — Round 1: UX Designer

**Author:** UX Designer (agent)
**Round:** 1 of 3
**Date:** 2026-04-11
**Scope:** PI 14+ planning for F-009, F-012, F-023, F-024, F-025, F-031, F-033, F-034–F-043.

This is my independent Round-1 input. I have not seen Round 1 of PM, Security, Architect, or BA yet.

---

## 1. F-038 — Dashboard math & pill layout

### What I saw in code
`frontend/app/workspace/dashboard/page.tsx` lines 194–197 currently render pills in the order:
`Resolved | Done | Unsure | Not applicable`
That is exactly the order Stefan calls out as broken. Stefan's requested order is:
`Resolved | Done | Not applicable | Unsure / Not yet`

`Resolved` is currently computed as `stats.done + stats.skipped` — which IS "Done + N/A", so the math is already right; the layout is what lies to the eye. Put `Done` and `Not applicable` adjacent and the sum becomes visually obvious ("these two teal/green things add up to the left one").

### Recommended visual layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ 18 / 36 responses                                               50%  │
│ ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                                                      │
│   Resolved          Done        Not applicable    Unsure / Not yet  │
│      15              12                3                 3          │
│   (teal-700,      (green-600)      (green-600,        (amber-600)   │
│   bold, larger    underline, or    lighter weight     normal)       │
│   = "headline")   square chip)     or outline chip                  │
└──────────────────────────────────────────────────────────────────────┘
```

Grouping cues (subtle, not loud):
- Put a thin separator `│` between the `Resolved` pill and the `Done | Not applicable` pair, and another thin separator before `Unsure / Not yet`. Three visual groups: **summary | decided | undecided**.
- Resolved pill is the "headline" — 1.25× type, bold, teal-700.
- `Done` and `Not applicable` share a **green family** (green-700 solid for Done, green-600 outline / lighter for Not applicable). This telegraphs "both count as progress".
- `Unsure / Not yet` stays amber-600. Amber reads as "needs attention" per our design system (`10_design-system.md`: "yellow/orange only for needs attention") — which is exactly right: these are the items the owner still has to close out.

### Should "Not applicable" sit with Done or stay grey?

**Recommendation: green family, not grey.**

Rationale:
1. The whole point of the relabel is that Resolved = Done + N/A. If N/A is grey, users read grey = "nothing" and the Done+NA = Resolved equation is obscured again.
2. Grey in our design system means "disabled / inactive". N/A items are neither — they're an explicit decision.
3. BUT use a *lighter* green (outline chip, green-600 border, green-50 fill, green-700 text) so it's still visually subordinate to solid green `Done`. Same family, different weight = "decided, but slightly different kind of decided".
4. The drill-down and per-item status badge can keep grey for N/A (that's where grey means "not counted toward completion") — the pills are the one place where green is important to reinforce the summary math.

Colour tokens (concrete):
- Resolved pill: `text-teal-700` bold, `bg-teal-50` chip
- Done pill: `text-green-700` bold, `bg-green-100` chip
- Not applicable pill: `text-green-700` normal, `bg-white border-green-300` chip
- Unsure / Not yet pill: `text-amber-700` bold, `bg-amber-50` chip

---

## 2. F-038 AC-7 — Denominator semantics choice

**Two options in the AC:**
(a) Sum of per-member item totals (IT execs contribute IT+awareness, others contribute awareness only) — bigger number.
(b) Unique checklist items where ANY scoped member has answered — smaller number.

Stefan's PDF thinks **36**, not 47. With Stefan's example (IT Baseline=25, Awareness=11), 25 + 11 = 36 matches option... neither exactly, but **(b)** is the one that produces a number close to 36 ("the checklist has 36 items, period"). Option (a) produces the 47 that flickered onto his screen (25 + 11 + 11 = 47 when an extra person is in the assessment).

**Recommendation: option (b) with a refinement.**

Use **"Responses: X answered of Y items × Z people"** at the top-line, and internally the denominator is:
- **Per-person tile:** `(done + na) / applicable-to-this-person` — always stable, always matches what the person sees on their checklist.
- **Dashboard top-line:** `(total responses across org) / (sum of (items applicable to each member))`. This IS option (a), but we *label it clearly* as "responses" (plural across people) — so Stefan does not read it as "items in my checklist".
- **"My checklist" card (F-039):** `(my done + my na) / (my applicable items)` — this is the 36-denominator that matches Stefan's mental model of "my personal checklist".

So: Stefan sees 36 on his *personal* progress (as he expects), and sees 47 on the *team* dashboard with the label "responses" not "items". Two numbers, two labels, neither lies.

If the team picks exactly one: pick **(b) — unique checklist items, counted once** — because Stefan's mental model IS "how many items are in the checklist, how many are done" and that is what his PDF shows. Option (a) was the flicker source; keeping it hidden is safer.

---

## 3. F-031 — AI chat UX inside the per-item expand panel

### Current state
The existing `AiGuidancePanel` returns a single block of Markdown. It lives inside the expanded item body below the Steps list.

### Proposed chat layout (desktop)

```
┌────────────────────────────────────────────────────────────────┐
│ [Item title]                                    [Status chip]  │
│ [Description]                                                  │
│ Steps: 1. … 2. … 3. …                                          │
│ ─────────────────────────────────────────────────────────────  │
│  ▸ Help me with this item                            [Clear]   │
│ ┌────────────────────────────────────────────────────────────┐│
│ │ AI — auto-first message                                    ││
│ │ Here's how to approach [item title]…                       ││
│ │                                                            ││
│ │ You — "we use Google Workspace, does MFA work there?"      ││
│ │                                                            ││
│ │ AI — "Yes, in Google Workspace…"                           ││
│ └────────────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────┬─────────┐│
│ │ Ask about this item…                             │  Send   ││
│ └──────────────────────────────────────────────────┴─────────┘│
│ AI-generated — verify with your IT provider. 17/20 left today. │
└────────────────────────────────────────────────────────────────┘
```

### Interaction decisions

- **First AI message appears automatically on panel expand**, not on click — same latency budget as today's one-shot, so users who don't want to chat get value immediately (AC-2). If the user never types anything, this looks identical to today.
- **Chat history area is scrollable, capped at ~320px height on desktop and ~400px on mobile** to prevent the page from jumping when the panel grows. A "Scroll to latest" appears when new message off-screen.
- **Input** is a single-line textarea that auto-grows to max 4 lines. Enter submits; Shift+Enter newlines.
- **Clear chat** is a text-link button **top-right of the chat panel** next to the "Help me with this item" header, labelled `Clear` (or `Start over`). Not a red destructive button — this is low-stakes.
- **Rate limit display** ("17/20 left today") — subtle, bottom-right footer, only shown when ≤ 5 left. At 0, input disables with "Daily limit reached — comes back tomorrow."
- **Loading** — typing indicator (3 dots) shown as a pseudo-message from AI while streaming.
- **Error** — inline red notice inside the chat area with a `Retry` link, never a full-page error.

### Mobile (F-009 constraint)

- Chat area takes full width of expanded card.
- Input field becomes sticky at the bottom of the expanded card (not the viewport — still inside the card) when typing, so keyboard doesn't cover it.
- Max height of message history 50vh so there's always the input visible.
- `Clear` moves to a small icon button (⟲) to save header space.
- Don't collapse the Steps list — keep it above the chat, scrollable.

### Item-scope reinforcement
The **first AI message begins with a bold line**: `About: [item title]`. This sets expectation that the chat is scoped. If the user asks about something else, the AI refuses politely AND the refusal shows an inline `Why?` link that reveals "I can only help with [item title]. Want help with a different item? Close this and expand another."

---

## 4. F-035 — Dashboard team list with pending invitees (visual treatment)

Joined member row (today):
```
[Avatar/initial]  Jane Doe              [role chip]   ████████░░ 80%   ▸
                  jane@acme.com
```

Pending invitee row (new):
```
[dashed circle]   jane@acme.com                        [░░░░░░░░░░]    ·
(outlined, no    "Invite pending — not yet joined"    0%, greyed out
 fill)           [Resend] [Revoke]
```

Concrete rules:
1. **Dashed avatar outline** (no filled background, 1px dashed border, same size) — instantly reads as "placeholder person".
2. **Email as the row title** (there's no display name yet).
3. **Sub-label** `Invite pending — not yet joined` in grey-500 italic.
4. **Progress bar rendered but entirely grey-200**, no teal fill, 0% number.
5. **No chevron** (`▸`) — clicking does nothing. Use a middle-dot `·` or nothing. Row is not interactive.
6. **Action buttons inline right-aligned**: `Resend invite` (text-link) and `Revoke` (text-link in red-600). This also partially services F-033 (AC-2) without an extra round-trip.
7. **Sort order per AC-6:** joined members alphabetically, then a thin divider, then pending invitees alphabetically. Divider reads `Pending invitations (3)`.
8. **Counter in section header:** `Team progress — 4 joined, 3 pending`.

When an invitee accepts, the row smoothly converts in-place (fade to joined-member styling). Must not be a jarring remove-and-re-add.

---

## 5. F-036 — Awareness banner wording

Single sentence, conversational, dismissible, same blue/teal styling as the IT Baseline banner:

> **"Now your personal security habits — every person in your organisation gets this same awareness section, including you."**

Variation (shorter, if space is tight):

> **"Your personal awareness section — same questions everyone in your team answers."**

I prefer the first: it explains *why* they're seeing it (not only what) and uses "personal" to contrast with the IT Baseline they just finished.

Icon: `👤` or the same "person" icon we use for team/members, not a shield.

---

## 6. F-041 — IT Executor reassignment confirmation dialog

### Dialog copy (recommended default = "preserve existing answers")

**Title:** `Transfer IT checklist to Jane Doe?`

**Body:**
> The IT Baseline checklist will move from **Stefan Bertram** to **Jane Doe**.
>
> - Jane will see the **12 answers** Stefan already gave — she can review and change them.
> - Stefan's personal checklist will drop the IT Baseline section. He'll keep the Security Awareness section like every other employee.
> - Dashboard totals stay the same; no answers are lost.
>
> This cannot be undone automatically — but you can transfer it back later.

**Fields shown:**
1. Current IT Executor name + email (read-only).
2. New IT Executor — **dropdown of eligible members**. Eligibility rule: org member, accepted, not the current IT Executor, not another owner who has declined IT. Include the owner themselves as a valid option.
3. Count of existing IT Baseline answers (so owner knows what's being transferred).
4. Checkbox: `I understand Jane will see Stefan's existing IT Baseline answers.` (explicit consent to data handover).
5. Buttons: `Cancel` (outline) and `Transfer IT checklist` (primary teal).

**After success:** toast `IT Baseline transferred to Jane Doe. She'll see it on her next checklist load.` and audit log entry.

---

## 7. F-033 — Remove member confirmation copy

**Title:** `Remove Jane Doe from Acme Ltd?`

**Body:**
> This **permanently deletes all of Jane's data in Acme Ltd**:
>
> - Membership removed — Jane loses access immediately.
> - **7 checklist answers** deleted (they no longer count toward your assessment).
> - Any phishing campaign records for Jane removed.
> - Audit log entries about Jane anonymised.
>
> **This cannot be undone.** If Jane rejoins later she'll start from scratch.
>
> Your dashboard totals and security report will update right away.

**Input confirmation:** to prevent mis-clicks, require typing `Jane Doe` (or email) to enable the red Delete button. (Standard GitHub/Stripe pattern.)

**Buttons:** `Cancel` (outline) and `Delete permanently` (red-600 solid).

**For pending invite variant:** simpler — no typed confirmation, just `Revoke invitation?` with one line `{email} will not be able to join. Any partial data tied to this invite will be removed.`

**Special case — removing IT Executor:** dialog adds a warning row `Jane is your current IT Executor. After removal, your workspace home will prompt you to invite a new IT Executor.` (ties to F-041 AC-9).

---

## 8. Recommended PI grouping from UX standpoint

The 20 features fall into three cohesive UX shipments:

### PI 14 — "Dashboard & math truth" (ships together, one mental change for Stefan)
**Cohesion reason:** if any of these ships without the others, Stefan sees contradictory numbers somewhere.

- **F-038** Dashboard math + pill order (the anchor)
- **F-039** "My checklist" progress bar (same formula)
- **F-040** Security report (same formula)
- **F-034** Employee empty state CTA fix (trivial, part of same page)
- **F-035** Dashboard team list with pending invitees (same page, same feel)
- **F-036** IT Executor awareness banner (small, same checklist page)
- **F-037** Section 7 rewording (trivial copy)
- **F-024** Login heading fix (trivial copy, 1 LOC)
- **F-023** Nav on expired invite pages (trivial layout — confirmed NOT actually done in `accept-invite/page.tsx`, lines 117–141 have bare `<main>` with no header)
- **F-025** Copy inconsistencies (catch-all, trivial)
- **F-042** "Contact us" copy fix (trivial copy)
- **F-043** Multi-user E2E harness (required to ship F-038/F-039 safely)

Ship all of the above together. That's one coherent "the dashboard finally tells the truth and the small copy nits are cleaned up" release. UX narrative: *"Accurate, honest numbers, less confusing copy."*

### PI 15 — "Governance & conversation"
**Cohesion reason:** these three are larger features that change how the product feels, not just what it shows. They deserve their own PI to test properly.

- **F-041** IT Executor reassignment (data handover + dialog)
- **F-033** Remove team member / GDPR deletion (sibling feature — same Team page, same destructive-action pattern)
- **F-031** AI chat interaction (biggest UX change; depends on F-012)
- **F-012** AI guardrails hardening (must ship with or before F-031)
- **F-009** Mobile responsiveness audit (must be done alongside F-031 because chat-on-mobile is where F-009 matters most)

UX narrative: *"The product now handles people-changes and has a real conversation about your items."*

### Deferred / parking
- **F-032** Reassessment period — deferred per features.md, no objection.

### Why this split
- PI 14 is **many small things, one big fix**. Low risk, clear Stefan-win, short iteration cycle.
- PI 15 is **three larger features** that need real test coverage and thoughtful UX (dialogs, destructive actions, chat interaction). Don't cram them into PI 14 or F-038's math fix will be buried under chat UX debates.
- F-009 (mobile audit) lands with F-031 because chat-on-mobile is both the hardest constraint and the highest-value test.

---

## 9. Open UX questions for Round 2

1. **Chat first-message latency.** If auto-first-message runs on every panel expand, that's N Claude API calls per page load. Do we lazy-trigger on first *focus* of the input instead? Loses AC-2 "immediate value". Trade-off to debate with Architect.
2. **"Resolved" pill — is the bigger headline styling over-selling it?** Some users may read Resolved = "I'm done" and stop. Should `Unsure / Not yet` also be a headline (same size as Resolved) to communicate "these still need work"? Ask Product Manager.
3. **Dashed-avatar placeholder for pending invitees.** Is this sufficient a11y contrast? Outlined avatars can disappear on white backgrounds. Need to check with real design tokens — may need grey-200 fill.
4. **Typed-confirmation for member removal.** Stefan may find `Type name to confirm` heavy-handed for 5-person orgs. Lighter alternative: checkbox `I understand this is permanent`. Which feels right for the SMB persona?
5. **Awareness banner — does dismissing it per-user make sense?** F-036 AC-6 says dismissible. But for a returning IT Executor, the banner on re-visit is noise. Should it auto-hide after first dismissal forever (localStorage), or re-show on each visit until first awareness answer is given? Prefer the first.
6. **Remove-member: orphaned responses in past assessments.** If we delete all assessment_responses for a removed member, past "closed" assessments become retroactively smaller. Does that break the historical security report? Security + Architect should weigh in.
7. **Denominator semantics** — I recommended option (b) unique items + label the team-level number as "responses". Want Product Manager and BA to stress-test whether Stefan reads "responses" as the right word or whether he still expects "items".
8. **IT Executor reassignment — what if the new IT Executor is a pending invitee (not yet joined)?** My dropdown excludes them, but that may be restrictive. Do we allow reassignment to a pending invite with a "takes effect when they accept" state?
9. **F-025 copy inconsistencies catch-all** — the feature is vague. I want to do a screen-by-screen walkthrough and list specific strings in Round 2 so we can actually scope it. Need BA's Round 1 list as input.
10. **Mobile priority order for F-009.** Which pages first? I'd rank: checklist > dashboard > workspace home > team > report. Confirm with PM.
