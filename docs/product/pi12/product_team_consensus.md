# PI 12 — Product Team Consensus

**Date:** 2026-04-07
**Participants:** Product Manager, UX Designer, Security Expert, Architect, Business Analyst
**Rounds:** 3

---

## Problem Statement

Stefan (Product Owner) discovered during PROD testing that the invite/onboarding flow is fundamentally broken:

1. Owner creates org, invites employees
2. Invited employee logs in via magic link / OTP
3. After auth, `WorkspaceProvider` calls `GET /api/orgs/me` → 404 (no org_members row yet)
4. Employee is redirected to `/onboarding` → creates a NEW org instead of joining owner's org
5. Result: duplicate orgs, data integrity failure, broken team model

**Root cause:** `useWorkspace.tsx` lines 58-71 redirect to `/onboarding` on 404 without checking for pending invites.

Additionally, the "Manager" role is still offered in the invite form but adds complexity without delivering value for SMBs at this stage.

---

## Agreed Decisions

### 1. Invite Flow Fix — Architect's A+B Approach (Unanimous)

**Option A (primary):** WorkspaceProvider checks for pending invite before redirecting to onboarding.
- New `GET /api/invites/pending` endpoint: authenticated, looks up unaccepted/unexpired invite by user's email
- Returns redirect info (org name, role, accept path) — NOT the raw token (security: avoid re-exposing tokens in API responses)
- If pending invite found → redirect to `/accept-invite`
- If no pending invite → redirect to `/onboarding`

**Option B (safety net):** Onboarding page also checks for pending invite on mount. If found, redirects to accept-invite before rendering the form.

**sessionStorage hint:** Store invite token in sessionStorage (not localStorage — tab-scoped, cleared on close) before login redirect. Used as fast-path hint while API confirms. Cleared immediately after consumption.

### 2. Simplified Onboarding (Revised per Stefan feedback)

Reduce onboarding form — remove email system and computers fields, but **keep** IT handler question:
- Organisation name (required)
- Your name (required)
- Company size (optional)
- Who handles IT? (required): "I do" / "Staff member" / "External IT" / "Not sure"
  - If "Staff member": IT person email (required) + name (optional)
  - If "External IT": IT person email (optional)

**Stefan's reasoning:** The IT handler question serves as an awareness prompt — the owner should know someone needs to be appointed. The "Not sure" option lets them postpone without blocking. IT handler also remains editable in `/workspace/settings`.

### 3. Accept-Invite Page Redesign (Revised per Stefan feedback)

Simple confirmation card:
- Shows: "You've been invited to join **[Org Name]** as **[Role]**"
- **Accept** button (primary CTA)
- **No Decline button** — Stefan's decision. Reasoning: in some orgs a Decline option could be seen as inappropriate; if owner sends to wrong email, owner can revoke the invite from the Team page.
- Name field: conditional — shown only if user has no display name in Supabase `user_metadata.full_name`; pre-filled if available

**Vote tally on name field:** PM conditional, UX conditional, Security no (data minimisation), Architect conditional, BA no. Majority (3-2) for conditional field.

### 4. Manager Role — Full Removal in PI 12 (Stefan override)

**Stefan overrides team's 4-1 vote.** Full migration now. Reason: keep things simple/clean/synchronized and avoid confusion later.

- Remove "Manager" from invite form dropdown (only "Employee" remains)
- Add **server-side guard** in invite/membership API: reject `manager` role assignment
- **DB migration in PI 12:** reassign existing `manager` rows to `employee`, update CHECK constraints on `org_members.role` and `invites.role`, drop `manager_user_id` column
- Update all code referencing manager role (~10 files): types, RLS, API routes, UI components
- Remove subtree assessment logic (manager-scoped assessments)

### 5. Self-Role-Assignment Prevention (Unanimous)

- API route for role changes: verify `requesting_user.id !== target_user.id` AND `requesting_user.role === org_admin`
- RLS policy on `org_members`: prevent UPDATE where `user_id = auth.uid()` unless org_admin
- Low effort, high trust value. Ships in PI 12.

### 6. Login Page Context-Awareness (Unanimous)

Three states:
1. **No context (new owner):** "Create your free security workspace — no payment needed."
2. **Invite context (`?context=invite`):** "You've been invited to join [Org Name]. Sign in below to accept."
3. **Return user:** Skip login, redirect to workspace.

### 7. Token Expiry UX (Unanimous)

Expired/used token → dedicated error card (not generic 404, not onboarding redirect):
- "This invite link has expired."
- "Invite links are valid for 7 days."
- "Request a new invite from your organisation admin."

---

## PI 12 Scope (updated after Stefan dialogue)

| Priority | Feature | Status |
|---|---|---|
| P0 | F-021: Fix invite/onboarding routing (A+B approach) | Funnel |
| P0 | F-020: Reduce invite friction + onboarding cleanup | Funnel |
| P1 | F-022: Remove Manager role (full: UI + server guard + DB migration) | Funnel |
| P1 | Self-role-assignment prevention | Included in F-021/F-022 scope |
| P2 | F-014: Fix inconsistencies from PI 11 BA review | Funnel |
| P2 | F-019: Privacy title + login email retention | Funnel |
| P2 | F-015: Fix flaky E2E tests | Funnel |

**Stefan additions vs Product Team proposal:**
- F-022 upgraded from UI-only to full DB migration (Stefan override)
- F-014 pulled into PI 12 (Stefan request — clean interface for first users)
- Decline button removed from accept-invite (Stefan decision)
- IT handler question kept on onboarding (Stefan decision)

---

## Acceptance Criteria (F-021 — Invite Flow Fix)

**AC-1:** Invited user clicking email invite link → login → lands on `/accept-invite`, NOT `/onboarding`
**AC-2:** User with pending invite who navigates to `/workspace` is intercepted and shown accept-invite flow
**AC-3:** Accepting invite creates `org_members` row with correct org_id, role, and IT executor flag — no new org created
**AC-4:** Only users with NO pending invite and NO org membership can reach `/onboarding`
**AC-5:** Role enforcement post-join: employee cannot access team/campaigns/settings pages (consistent with F-018)
**AC-6:** Expired token → clear error page with "request new invite" guidance; user NOT routed to onboarding
**AC-7:** Already-accepted token → graceful handling, no duplicate org_members row
**AC-8:** Token for different email than logged-in user → 403 error, not silent acceptance

---

## Required Test Scenarios

1. Happy path: new invited employee → email → login → accept → workspace (correct org)
2. Happy path: new invited IT person → same flow, IT executor flag set correctly
3. Duplicate org prevention: invited user manually navigates to `/onboarding` → redirected to accept-invite
4. Token expiry: expired token → error page, no org created
5. Already-accepted token: second click → graceful error
6. Wrong email: token for different email → 403
7. Owner path: fresh user with no invite → onboarding → org created → workspace
8. Regression (F-018): after joining via invite, employee cannot reach restricted pages
9. Manager role hidden: invite form only shows "Employee" option
10. Self-role-assignment: API rejects user changing own role

---

## Team Process Improvement (step 1f)

The Product Team agrees on one process improvement for future sessions:

**New rule:** When a critical UX flow is broken (like onboarding), the Product Team must start by mapping the ACTUAL flow (browser-verified, not documented) before proposing solutions. The Architect should provide a code-traced flow diagram as input to Round 1, so all agents reason from verified reality rather than assumed state.

*Rationale:* In this session, the Architect's code analysis was the most valuable Round 1 input because it traced the actual redirect chain. Other agents initially reasoned from the documented flow (user-flows.md), which described the intended behavior — not the broken reality.
