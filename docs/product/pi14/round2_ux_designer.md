# PI 14 Roadmap — Round 2: UX Designer

**Author:** UX Designer (agent)
**Round:** 2 of 3 — converge on decisions
**Date:** 2026-04-11

I've read PM, Security, Architect, BA Round 1. This is my decisions pass. No options; commitments.

---

## 1. F-038 — "Not applicable" pill colour — LOCKED

**Decision:** green family, lighter weight. Tailwind class:

```
text-green-700 bg-white border border-green-300
```

(Done pill stays `text-green-800 bg-green-100 border border-green-200`; Resolved headline pill stays `text-teal-800 bg-teal-50`; Unsure/Not yet stays `text-amber-800 bg-amber-50`.)

Rationale: Resolved = Done + N/A is the headline claim. If N/A is grey, the visual math breaks again. Same hue, lighter fill = "decided, different flavour of decided". Grey stays reserved for genuinely-disabled UI elsewhere. Security and PM didn't push back — this is settled.

---

## 2. F-038 AC-7 denominator — LOCKED on Architect's Option C

Architect's trace (A.1.3) proves the flicker is the server returning **two inconsistent numbers in the same payload**: `stats.percent` computed against 47 (per-member-sum) and `stats.total` = 36 (unique items). The client then picks one or the other based on whether `members` has loaded. That's not a semantics choice; it's a bug. Both numbers are legitimate — they mean different things.

**Decision — ship both, label both, use each in the right place:**

- **API returns:** `stats.denominator` (= per-member-sum, 47 in Stefan's example) **and** `stats.me.denominator` (= caller's own items, 36 for an IT-exec-owner, 11 for an employee).
- **`/workspace/dashboard` top bar** (team view) uses `stats.denominator`. Label: **"18 of 47 answered across the team"** (not "responses" — "responses" reads as technical jargon to SMBs; "answered" is plain-English and matches the pill language).
- **`/workspace` home "My checklist" card** (F-039) uses `stats.me.denominator`. Label: **"18 of 36 in your checklist"**.
- **Per-track bars on dashboard** use per-track per-member-sum denominator, label `"10 of 25 in IT Baseline"`.
- **Security report (F-040)** uses `stats.denominator` and says `"as of {date}"` per Security's request.

This matches Architect's Option C (`stats` + `stats.me` sibling) and kills BA's AC-7 blocker. Stefan sees 36 on his personal widget (as his PDF expects) and sees 47 on the team dashboard with a label that makes the "across the team" meaning unambiguous. Neither number lies; neither flickers; neither requires Stefan to relearn anything.

---

## 3. F-024 login heading — LOCKED: context-aware, two variants

**Decision:** context-aware via `?next=` / a new `?intent=signup` query param appended by the landing "Sign up free" CTA.

- **Default `/login`:** `<h1>Welcome back</h1>` with sub `<p>Enter your email — we'll send you a sign-in link.</p>`
- **`/login?intent=signup`:** `<h1>Create your free account</h1>` with sub `<p>Enter your email — we'll send you a link to get started. No password needed.</p>`

Stefan's complaint is specifically the jarring transition from "Sign up free" to a page titled "Log in". Fixing only the default (option a "Welcome") leaves the bait-and-switch; the word "Welcome" on a signup-intent page is bland. Option (b) "Sign in or sign up" is accurate but wordy and hides the call to action. Context-aware is 10 lines of code and is the one that actually answers the complaint.

Implementation is trivial: landing CTA links to `/login?intent=signup`; login page reads `searchParams.intent === "signup"` and swaps the two strings. No duplicated page.

---

## 4. F-031 chat — auto-first-message vs cold start — LOCKED: FOLD

**Decision:** fold to Security. **No auto-first-message on panel expand.** Chat panel opens with a compact prompt card:

```
┌─────────────────────────────────────────────────┐
│ Need help with this item?                       │
│ Ask the AI assistant anything about             │
│ "[item title]".                                 │
│                                                 │
│   [ Start chat ]   Examples: "we use Google     │
│                    Workspace, does MFA work?"   │
└─────────────────────────────────────────────────┘
```

Clicking **Start chat** triggers the first AI call (which behaves exactly like today's one-shot guidance — an "intro to the item" message) AND opens the input. Users who just want to read the item's Steps and move on never incur a Claude call.

Why I fold: Security's concern is correct. Auto-first-message means every panel expansion = a Claude call, even for users who scroll through the checklist without chatting. At 20 items × regular browsing = 20 needless calls per session. Multiplied by F-012's persistent rate limit, legitimate users will hit their daily cap just by browsing. The one-click "Start chat" cost is one extra click; the one-click *savings* is every user who doesn't chat at all.

AC-2 ("immediate value") is still satisfied because clicking Start chat delivers the same response today's one-shot delivers — the UX just makes the user signal intent first. Today's static description + Steps list remain visible above the chat, so the item is still immediately useful without any AI call.

---

## 5. F-041 reassignment dialog — FINAL COPY

Assuming PM locks "preserve responses, rebind to assessment not to user" (Architect, BA, Security all agree):

**Title:** `Transfer IT Baseline checklist`

**Body:**
> You're transferring the IT Baseline checklist from **{current_name}** to **{new_name}**.
>
> - **{new_name}** will see the **{N} answers** already given. They can review and change them.
> - **{current_name}**'s personal checklist will drop the IT Baseline section. They'll keep the Security Awareness section like every other team member.
> - Dashboard totals don't change. No answers are lost.
>
> You can transfer it back later.

**Form:**
- Read-only: `Current IT Executor: {name} ({email})`
- Required dropdown: `New IT Executor` — accepted org members only (excludes self, pending invites, current IT exec). Placeholder: `Choose a team member…`
- Required checkbox: `I understand {new_name} will see {current_name}'s existing IT Baseline answers.`
- Buttons: `Cancel` (outline grey) · `Transfer checklist` (primary teal, disabled until dropdown + checkbox)

**Success toast:** `IT Baseline transferred to {new_name}.`

No "cannot be undone" language — this is a reversible delegation, not destruction. Unlike F-033.

---

## 6. F-033 typed-confirmation text — LOCKED

**Decision:** user types the **email address** of the person being removed.

Rationale: emails are unique within an org; display names may collide ("Jane D."). Emails are what the owner sees in the team list next to the row they're about to delete — low friction to type. Avoids the "Jane Smith vs Jane smith" case-sensitivity trap.

**Dialog field:**
> Type `{email}` to confirm

Input is a single text field. Delete button is disabled until input === email (trimmed, case-insensitive compare, rendered in monospace to make character matching obvious).

**Button label:** `Delete permanently` (red-600 solid).

**Pending invite variant:** no typed confirmation. One-line confirm `Revoke invitation for {email}?` with `Cancel` / `Revoke` buttons. A pending invite has no data to lose; typed confirmation is overkill.

---

## 7. F-035 pending invitee row — LOCKED

Pending invitee rows render below joined members under a thin divider labelled **"Pending invitations (N)"**. Each row uses: a dashed-outline circle avatar (1px dashed border, grey-300, no fill — with a grey-100 fallback fill for a11y contrast on white backgrounds), the email address as the row title in grey-700, a grey-500 italic sub-label `"Invite pending — not yet joined"`, a 0% progress bar rendered in grey-200 with no teal fill, no chevron (row is non-interactive), and two right-aligned text-link actions: `Resend` (teal-700) and `Revoke` (red-600). Section header shows `"Team progress — {X} joined · {Y} pending"`. When an invitee accepts, the row animates in-place (fade dashed→solid avatar, email→display name, progress bar→live) — no remove-and-re-add jump. Sort: joined members alphabetically, then divider, then pending invitees alphabetically.

---

## 8. F-036 banner copy — LOCKED

**Final copy:**

> **Now your personal security habits.** Every person in your organisation — including you — answers the same awareness questions.

Icon: person silhouette (same icon used in team/member UI, not a shield). Background: teal-50 with teal-200 left border (same banner style as existing IT Baseline intro banner for consistency). Dismiss button `×` top-right; dismissal persists per-user in localStorage (key `smbsec1.banner.awarenessIntro.dismissed`) — once dismissed, never re-shown for that user.

---

## 9. F-009 mobile audit — SCOPED

**Viewports (3):** `360×640` (baseline small Android), `390×844` (iPhone 13/14), `768×1024` (iPad portrait).

**Pages (6):**
1. `/` (landing — anon conversion path)
2. `/login` (magic link + OTP entry, including `?intent=signup` variant)
3. `/workspace` (home hub post-login)
4. `/workspace/checklist` (the core interactive page with F-031 chat)
5. `/workspace/dashboard` (F-038 math surface)
6. `/workspace/team` (F-033/F-035 destructive-action + pending-invitee surfaces)

**Pass criteria per page per viewport:** no horizontal scroll; no element overflowing its container; all primary CTAs reachable without zoom; tap targets ≥ 44×44 px; chat input (F-031) sticky-within-card and not occluded by the mobile keyboard.

**Explicitly out of scope:** `/workspace/campaigns/*`, `/workspace/billing`, `/workspace/report`, `/workspace/settings`, `/checklist`, `/summary`, `/privacy`, `/auth/callback`, `/onboarding`. These get a follow-up F-009.1 ticket in the backlog if Business Test flags issues.

---

## 10. PI grouping — CONVERGE ON 2 PIs

**Lock 2 PIs.** PM's 3rd PI is a Business Test wash; it's already built into the process per CLAUDE.md §3. We don't need to pre-allocate a PI for regressions — that creates parkinsonian scope.

**PI 14 — "Numbers you can trust"**
F-043 (iter 1, blocking) · F-038 · F-039 · F-040 · F-035 · F-034 · F-023 · F-024 · F-025 · F-036 · F-037 · F-041 · F-042

**PI 15 — "Conversation, governance, mobile"**
F-012 (iter 1, blocking F-031) · F-031 · F-033 · F-009 · Anthropic sub-processor disclosure (part of F-012)

Business Test Team runs end-of-PI-14 and end-of-PI-15 per normal process. Any High/Medium findings go back into IT Dev within the same PI's retest, not a new PI. If PI 15 Business Test finds systemic defects, escalate to Stefan per CLAUDE.md §3d.

F-036 moves into PI 14 with me (not PI 15) — it's a 1-hour copy-and-banner task that shares the IT Executor + awareness UI surface with F-041. Cohesive.

---

**End Round 2 — UX Designer.**
