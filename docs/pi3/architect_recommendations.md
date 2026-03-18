# PI 3 Architect Recommendations

**Date:** 2026-03-18
**Author:** Architect (Product Team)
**Inputs:** Stefan walkthrough PDF, BA walkthrough reports (Companies 1-3), current codebase analysis

---

## 1. Bug Fixes (Root Cause Analysis)

### Bug 1: Dashboard response count shows 108 instead of 58

**Symptom:** The dashboard displays "X / 108 responses" (36 items x 3 members) when the correct total should be 58 (36 for IT executor + 11 for each of 2 non-IT members).

**Root cause:** In `frontend/app/api/dashboard/route.ts` line 135, the total is calculated as:
```
const totalPossible = totalItems * scopeSize;
```
This multiplies 36 total items by 3 members, ignoring the fact that non-IT-executor members only see awareness items (11). The per-member breakdown on line 183 correctly uses `isItExecutor ? totalItems : awarenessCount` but the overall total does not.

The frontend then renders this on `frontend/app/workspace/dashboard/page.tsx` line 138:
```
{stats.done + stats.unsure + stats.skipped} / {stats.total * Math.max(members.length, 1)} responses
```
This doubles down on the error by multiplying `stats.total` (which is already total items) by member count again on the client side, even though the API already returns a flat `total`.

**Proposed fix:**
1. In the API route (`route.ts`), compute `totalPossible` as the sum of each member's actual visible item count:
   ```
   const totalPossible = scopedUserIds.reduce((sum, uid) => {
     const member = allMembers.find(m => m.user_id === uid);
     return sum + (member?.is_it_executor ? totalItems : awarenessCount);
   }, 0);
   ```
2. Return this as `stats.totalExpectedResponses` in the API response.
3. In the dashboard frontend, use the API-provided total directly instead of recalculating.

**Files to change:**
- `frontend/app/api/dashboard/route.ts` (lines 134-139)
- `frontend/app/workspace/dashboard/page.tsx` (line 138)

**Effort:** S (Small) -- straightforward arithmetic fix in two files.

---

### Bug 2: Display names not shown on dashboard

**Symptom:** Dashboard team progress and settings IT executor dropdown show email addresses or UUID fragments instead of display names entered during invite acceptance.

**Root cause:** In `frontend/app/api/dashboard/route.ts` line 58, the Supabase select query does not include `display_name`:
```
.select("user_id, manager_user_id, role, is_it_executor, email")
```
Because of this, line 188 attempts to read it via an unsafe cast:
```
display_name: (memberMembership as Record<string, unknown>)?.display_name as string ?? null,
```
This always returns `null` since `display_name` was never fetched from the database.

**Proposed fix:** Add `display_name` to the select clause:
```
.select("user_id, manager_user_id, role, is_it_executor, email, display_name")
```

**Files to change:**
- `frontend/app/api/dashboard/route.ts` (line 58 -- add `display_name` to select)

**Effort:** S (Small) -- one-line fix.

---

### Bug 3: Stale auth token causes public /checklist to redirect to /login

**Symptom:** A user with an expired Supabase session in localStorage cannot browse the public `/checklist` page. It enters a loading state and eventually redirects to `/login`.

**Root cause:** In `frontend/app/checklist/page.tsx` line 44-46, the auth check calls `supabase.auth.getSession()`. If a stale/expired token exists in localStorage, Supabase attempts a silent refresh which can fail. The catch block on line 63 sets `viewMode` to `"readonly"`, but the `getSession()` call may trigger Supabase's internal `onAuthStateChange` listener that interferes with the page lifecycle before the catch fires. The page stays in `"loading"` state and the Supabase SDK may redirect.

**Proposed fix:**
1. Wrap the auth check in a more defensive try/catch.
2. If `getSession()` returns a session but the token is expired (check `session.expires_at`), treat it as no session (readonly mode).
3. Add a timeout: if the auth check takes longer than 2 seconds, fall through to readonly mode.
4. Consider calling `supabase.auth.signOut()` when the session is clearly expired and stale, to clean up localStorage.

**Files to change:**
- `frontend/app/checklist/page.tsx` (Effect 1, lines 39-70)

**Effort:** S (Small) -- defensive timeout and stale-token cleanup.

---

### Bug 4: Browser autofill contamination on /onboarding form

**Symptom:** When a user reuses a browser that previously completed onboarding for a different account, the browser autofill pre-populates fields with stale data (org name, email platform, radio selections).

**Root cause:** In `frontend/app/onboarding/page.tsx`, form inputs use standard names and types (e.g., `type="text"` for org name, standard `<select>` elements) without any autofill suppression. The radio buttons use `name="it_handling"` which browsers may cache.

**Proposed fix:**
1. Add `autoComplete="off"` to the `<form>` element.
2. Add `autoComplete="off"` to each input and select individually (some browsers ignore form-level `autoComplete`).
3. Use randomized or prefixed `name` attributes (e.g., `name="smbsec_it_handling"`) to reduce autofill matching.
4. Consider adding a confirmation step before org creation: show a summary of the entered data and require explicit "Create" click.

**Files to change:**
- `frontend/app/onboarding/page.tsx` (form element and individual inputs)

**Effort:** S (Small) -- attribute additions; M (Medium) if adding confirmation step.

---

### Bug 5: Auth session 5-second timeout sometimes too short

**Symptom:** The auth callback page has a 5-second timeout. If the Supabase session is not established within that window (slow network, rate limiting, cold start), the user is redirected to `/login` and must request a new magic link.

**Root cause:** In `frontend/app/auth/callback/page.tsx` lines 43-50, a hard `setTimeout` of 5000ms fires and redirects to `/login` if `onAuthStateChange` has not yet fired with a valid session.

**Proposed fix:**
1. Increase the timeout to 10 seconds.
2. Add a visual countdown or "Still working..." message after 3 seconds to set expectations.
3. If the timeout fires, show an error message with a "Try again" button (link to `/login`) instead of silently redirecting. This way the user knows something went wrong.
4. Consider adding retry logic: if `onAuthStateChange` fires with `TOKEN_REFRESHED` failure, attempt `getSession()` once manually from the URL hash.

**Files to change:**
- `frontend/app/auth/callback/page.tsx` (timeout logic, lines 43-56)

**Effort:** S (Small)

---

### Bug 6: Org name truncated in nav bar

**Symptom:** Long org names like "SMBsec1 Test Compa..." are cut off at 160px in the workspace navigation bar.

**Root cause:** In `frontend/app/workspace/layout.tsx` line 43:
```
className="text-sm font-semibold text-gray-900 truncate max-w-[160px]"
```

**Proposed fix:**
1. Increase `max-w` to `max-w-[240px]` or use `max-w-xs` (320px).
2. Add a `title` attribute with the full org name so users can hover to see the complete name.
3. On mobile, consider allowing the name to wrap to a second line or use an even smaller truncation width with title tooltip.

**Files to change:**
- `frontend/app/workspace/layout.tsx` (line 43)

**Effort:** S (Small) -- CSS change + title attribute.

---

## 2. Data Model Changes

### Current Schema Assessment

The current schema is adequate for the basic checklist-and-respond workflow but has gaps that will block the features Stefan and the BA walkthroughs identified.

### Required Migration: Fix response count calculation

No schema change needed -- this is a query-logic fix in the API route (see Bug 1). However, consider adding a `visible_item_count` column to `org_members` or computing it as a view. This avoids recalculating it per request.

**Recommendation:** Keep it in application logic for now. The org sizes are small (SMBs), so the computation cost is negligible.

### Proposed Migration: Item categories (grouping)

**Current state:** `assessment_items` already has a `group_id` column that references `checklist_groups`. The `checklist_groups` table exists with `title`, `description`, `track`, `order_index`. However, the workspace checklist page (`workspace/checklist/page.tsx`) does NOT fetch or use group information -- it only splits by `track` ("IT Baseline" vs "Security Awareness").

**What's needed:**
1. The `GET /api/assessments/[id]` endpoint already returns `group_id` per item. We need to also return the group metadata (title, order_index).
2. Options:
   - **Option A (recommended):** JOIN `checklist_groups` in the assessment items query and return `group_title` and `group_order` alongside each item. The frontend groups by `group_id` and renders section headers.
   - **Option B:** Add `group_title` and `group_order` columns to `assessment_items` (denormalized snapshot). This aligns with the immutable-snapshot design but requires a migration.

**Recommendation:** Option A for PI 3 -- no migration needed. Option B can be done later if we need historical group names.

**Effort:** S (Small)

### Proposed Migration: Notes/comments per response

Stefan's feedback emphasizes that employees and IT staff need a way to explain their responses (e.g., "I marked SPF/DKIM as Unsure because I need DNS access"). The BA reports confirm this gap.

**Migration:**
```sql
ALTER TABLE assessment_responses
  ADD COLUMN note text DEFAULT NULL;
```

**Impact:** Minimal -- the column is nullable. Existing rows unaffected. The PUT endpoint for responses needs to accept an optional `note` field. The dashboard API needs to optionally return notes (for manager/admin drill-down views).

**Effort:** S (Small) for migration + M (Medium) for UI.

### Proposed Migration: Verification type per item

Stefan suggested that awareness items like "Spot a phishing email" should not be self-assessed via "Done" but instead verified through email campaigns. This requires a new column to distinguish item types.

**Migration:**
```sql
ALTER TABLE checklist_items
  ADD COLUMN verification_type text NOT NULL DEFAULT 'self_assess'
  CHECK (verification_type IN ('self_assess', 'acknowledge', 'campaign_verified', 'it_verify'));
```

Also add to `assessment_items` snapshot:
```sql
ALTER TABLE assessment_items
  ADD COLUMN verification_type text NOT NULL DEFAULT 'self_assess';
```

**Impact:** This enables the frontend to render different interaction models per item type:
- `self_assess` -- current Done/Unsure/Skipped (for IT Baseline actions)
- `acknowledge` -- "I have read and understood this" (for awareness knowledge items)
- `campaign_verified` -- locked/disabled until verified by email campaign (future)
- `it_verify` -- requires IT executor to confirm (future)

**Effort:** S (Small) for migration, M (Medium) for frontend differentiation.

### Proposed Migration: Guidance text on workspace items

**Current state:** `checklist_items` already has `why_it_matters` (text) and `steps` (jsonb, keyed by platform). These are snapshotted into `assessment_items` when an assessment starts. The workspace checklist page already reads and renders `why_it_matters` and `steps` when an item is expanded (click title to toggle).

**Gap:** The BA walkthrough for Company 2 says "the workspace checklist shows ONLY the item title and Done/Unsure/Skipped buttons" but this contradicts the code -- the `ChecklistItem` component on line 414 DOES render `why_it_matters` and steps when `expanded` is true. The discrepancy may be due to:
1. Items lacking `why_it_matters` or `steps` data in the database for some items.
2. The expand affordance (clicking the title) being too subtle -- users don't realize they can click.

**Investigation needed:** Query the `assessment_items` table to check which items have null `why_it_matters` or empty `steps`. If the data is populated, the fix is UX (make the expand affordance more visible -- add a chevron icon or "Show guidance" link).

**Effort:** S (Small) if data exists, M (Medium) if data needs to be populated.

---

## 3. Workspace Checklist Architecture

### Guidance Content: Where does it come from?

The current data flow is:
1. **Master data:** `checklist_items` table holds `why_it_matters` (text) and `steps` (jsonb keyed by email platform, e.g., `{"google_workspace": [...], "microsoft_365": [...], "default": [...]}`).
2. **Snapshot:** When an assessment is created (`POST /api/assessments`), the API copies items from `checklist_items` into `assessment_items`, flattening the `steps` map to the org's configured email platform. The `why_it_matters` text is copied verbatim.
3. **Delivery:** `GET /api/assessments/[id]` returns items with `why_it_matters` and `steps` arrays.
4. **Rendering:** `ChecklistItem` component renders guidance in an expandable section.

**Recommendation:** This architecture is correct. The anonymous checklist (`/checklist`) uses static data from `lib/checklist/items.ts` (17 items) while the workspace checklist uses the database (36 items). They should remain separate -- the anonymous checklist is a marketing/teaser tool, while the workspace is the assessment engine.

### Making expand affordance visible

The current UX makes the item title clickable to expand, but there is no visual indicator (no chevron, no "show more" text). Users don't discover the guidance.

**Proposed approach:**
1. Add a subtle chevron icon (down arrow) next to the item title that rotates when expanded.
2. Add text "Show guidance" below the title in a muted style that changes to "Hide guidance" when expanded.
3. For items with `verification_type === 'acknowledge'`, auto-expand the guidance on first view so users read it before responding.

**Files to change:**
- `frontend/app/workspace/checklist/page.tsx` (`ChecklistItem` component, lines 373-457)

**Effort:** S (Small)

### Category grouping for IT Baseline items

Currently the workspace checklist splits items into two sections: "IT Baseline" and "Security Awareness." Within IT Baseline, all 25 items appear in a flat list sorted by `order_index`. The anonymous checklist groups items by topic (Passwords & Accounts, Email Security, etc.).

**Current data model support:** Each `assessment_item` has a `group_id` that references `checklist_groups`. The groups have `title` and `order_index`. This data is already in the database but not used by the frontend.

**Proposed implementation:**
1. Modify `GET /api/assessments/[id]` to also return group metadata (either via JOIN or a separate groups query).
2. In the workspace checklist page, within each track section, sub-group items by `group_id` and render group headers (e.g., "Passwords & Accounts", "Email Security").
3. Show a count per group (e.g., "2/4 answered") to give the IT executor a sense of progress within each category.

**Files to change:**
- `frontend/app/api/assessments/[id]/route.ts` (add group data to response)
- `frontend/app/workspace/checklist/page.tsx` (sub-group rendering within each track)

**Effort:** M (Medium) -- API change + frontend rendering logic.

---

## 4. Technical Debt

### 4.1 Inconsistent auth patterns on public pages

The public `/checklist` page (Bug 3) uses `supabase.auth.getSession()` to determine view mode. The public `/summary` page redirects logged-in users to `/workspace`. These should share a consistent pattern: public pages should never fail or redirect due to stale auth state. Extract a shared `useOptionalSession()` hook that gracefully handles expired tokens.

**Effort:** S

### 4.2 `OrgMemberRow` type has optional `display_name`

The `display_name` field is typed as optional (`display_name?: string | null`) in `frontend/lib/db/types.ts` line 50. Since migration 011 has been applied, it should be a regular nullable field (`display_name: string | null`). The `?` causes TypeScript to not enforce its presence in select queries -- which is exactly how Bug 2 slipped through.

**Effort:** S

### 4.3 Dashboard API does double-duty on member scope

The dashboard API route computes scoped user IDs, loads all responses, and aggregates stats in a single endpoint. As features grow (item-level drill-down, notes, filtering), this will become unwieldy. Consider splitting into:
- `GET /api/dashboard/summary` -- aggregate stats
- `GET /api/dashboard/members` -- per-member breakdown
- `GET /api/dashboard/members/[userId]` -- item-level detail for one member

**Effort:** M (not urgent for PI 3)

### 4.4 Hardcoded 5s timeout in auth callback

The magic number should be a constant or environment variable. The same timeout pattern appears in the public checklist auth check. Centralize it.

**Effort:** S

### 4.5 No loading/empty state for workspace home

The workspace home page `Getting Started` panel has inconsistent show/hide logic (reported in Company 3 walkthrough). The panel should be governed by a clear state machine: show until explicitly dismissed by the user, persist dismissal in the database (not just localStorage) so it works across devices.

**Effort:** S

### 4.6 Frontend client-side response total recalculation

The dashboard frontend on line 138 recalculates `stats.total * Math.max(members.length, 1)` which should be returned directly from the API. Remove client-side arithmetic that duplicates server logic.

**Effort:** S

---

## 5. Future-Proofing

### 5.1 AI/LLM Integration

Stefan explicitly requested in-page AI guidance: users click a help button on a checklist item and get contextual guidance from an LLM.

**Architectural decisions to make NOW:**
1. **API route structure:** Create a `POST /api/ai/guidance` endpoint that accepts `{ item_id, context }` and returns streaming text. Use a server-side API route (never expose API keys to the client).
2. **LLM provider abstraction:** Use an adapter pattern so we can swap providers (OpenAI, Anthropic, etc.). Define an interface in `frontend/lib/ai/provider.ts`.
3. **Context injection:** The LLM prompt should include the item's `why_it_matters`, `steps`, the org's `email_platform`, and the user's role. This is already available in the assessment_items data.
4. **Rate limiting:** AI calls are expensive. Add per-user rate limiting (e.g., 10 requests/day on free tier).
5. **Data isolation:** Never send org-identifiable data to the LLM. Strip org names, emails, and user IDs from the prompt context.

**What NOT to do:** Don't build the AI feature yet. But DO ensure the checklist item component has a clear extension point (e.g., a slot for an "Ask AI" button) and that the API route structure can accommodate it.

**Effort:** No code now. Architectural note only.

### 5.2 Email Campaigns (Phishing Simulation)

Stefan's vision: send simulated phishing/scam emails to employees and verify their response. This is the monetized feature.

**Architectural decisions to make NOW:**
1. **Separate schema:** Stefan explicitly said "into separate db schema." Create a `campaigns` schema in Supabase when the time comes. Keep it isolated from the `public` schema.
2. **Campaign tables (future):** `campaigns`, `campaign_emails`, `campaign_responses`, `campaign_templates`.
3. **Verification linkage:** The `verification_type` column proposed in Section 2 creates the bridge. Items with `verification_type = 'campaign_verified'` will have their status set by campaign results rather than self-assessment.
4. **Email infrastructure:** Resend is already integrated for invite emails. Campaign emails will need higher volume -- plan for a dedicated sending domain and sender reputation management.

**What to do NOW:** Add the `verification_type` column to `checklist_items` and `assessment_items`. This costs nothing and prevents schema changes later.

### 5.3 Internationalization (i18n)

Stefan mentioned "at least dk, but optimally en,dk language picker."

**Architectural decisions to make NOW:**
1. **Do NOT use `next-intl` or similar i18n libraries yet.** The app is too early-stage for full i18n.
2. **DO extract all user-facing strings into a constants file** rather than hardcoding them inline. This makes future extraction to translation files straightforward.
3. **Checklist content i18n** is different from UI i18n. The `checklist_items.steps` field already uses a map structure (keyed by platform). A similar pattern could work for language: `steps: { "en": { "google_workspace": [...] }, "da": { "google_workspace": [...] } }`. But do not implement this now.
4. **Database content:** `why_it_matters` and item `title` fields are currently single-language. When i18n is needed, options are: (a) separate rows per language with a `locale` column, or (b) jsonb fields with language keys. Option (b) is simpler for our scale.

**What to do NOW:** Nothing in code. But avoid hardcoding long user-facing strings directly in JSX -- prefer constants files that can later become translation sources.

### 5.4 GDPR Data Page

Stefan wants a public-accessible page explaining what data is stored and how users can view/delete their own data.

**Architectural decisions to make NOW:**
1. The existing `/workspace/settings/gdpr` page handles data export and deletion for logged-in admins. A public-facing privacy policy page is a separate concern (static content, not interactive).
2. Per-user data visibility (employee sees their own data, owner sees all org data) is already enforced by RLS and the API scope rules. No architectural change needed.
3. Consider adding a `GET /api/me/data` endpoint that returns all data associated with the calling user (org membership, assessment responses, display name). This supports both the GDPR page and potential future data portability requirements.

**What to do NOW:** Create a static `/privacy` page linked from the footer. The interactive GDPR features already exist.

**Effort:** S for static page.

---

## 6. PI 3 Technical Recommendations (Prioritized)

### Tier 1: Must-Fix (blocks usability)

| # | Item | Effort | Files |
|---|------|--------|-------|
| T1.1 | Fix dashboard response count (Bug 1) | S | `api/dashboard/route.ts`, `workspace/dashboard/page.tsx` |
| T1.2 | Fix display_name not shown (Bug 2) | S | `api/dashboard/route.ts` (add to select) |
| T1.3 | Fix stale auth token on public /checklist (Bug 3) | S | `app/checklist/page.tsx` |
| T1.4 | Fix browser autofill on /onboarding (Bug 4) | S | `app/onboarding/page.tsx` |
| T1.5 | Make checklist guidance expand affordance visible | S | `workspace/checklist/page.tsx` |
| T1.6 | Add category grouping to workspace checklist | M | `api/assessments/[id]/route.ts`, `workspace/checklist/page.tsx` |

### Tier 2: Should-Fix (improves experience significantly)

| # | Item | Effort | Files |
|---|------|--------|-------|
| T2.1 | Increase auth callback timeout + show error state (Bug 5) | S | `auth/callback/page.tsx` |
| T2.2 | Fix org name truncation + add tooltip (Bug 6) | S | `workspace/layout.tsx` |
| T2.3 | Add `verification_type` column to checklist_items + assessment_items | S | SQL migration + `api/assessments/route.ts` |
| T2.4 | Add `note` column to assessment_responses | S | SQL migration |
| T2.5 | Differentiate awareness items interaction model (acknowledge vs done) | M | `workspace/checklist/page.tsx`, API |
| T2.6 | Add notes/comment UI for checklist responses | M | `workspace/checklist/page.tsx`, `api/assessments/[id]/responses/route.ts` |
| T2.7 | Fix "Invite your IT lead" step when owner is IT executor | S | `workspace/page.tsx` |
| T2.8 | Add display name field to onboarding (for org creator) | S | `app/onboarding/page.tsx`, `api/orgs/route.ts` |

### Tier 3: Nice-to-Have (polish)

| # | Item | Effort | Files |
|---|------|--------|-------|
| T3.1 | Create `useOptionalSession` hook for public pages | S | `lib/hooks/` |
| T3.2 | Fix `OrgMemberRow` type -- make `display_name` non-optional | S | `lib/db/types.ts` |
| T3.3 | Remove client-side response total recalculation from dashboard | S | `workspace/dashboard/page.tsx` |
| T3.4 | Add public `/privacy` page linked from footer | S | New page + layout footer |
| T3.5 | Add welcome/onboarding message for employees on first visit | M | `workspace/page.tsx` |
| T3.6 | Show current team members on Team page (not just pending invites) | M | `workspace/team/page.tsx`, API |
| T3.7 | Add contextual back buttons / breadcrumbs in workspace | S | `workspace/layout.tsx` or per-page |
| T3.8 | Update landing page time claim ("Find" not "Fix") | S | `app/page.tsx` |

### Suggested PI 3 Iteration Split

**Iteration 1 (Foundation fixes):** T1.1-T1.6, T2.1-T2.2, T3.8 -- all bug fixes plus category grouping. Pure quality work.

**Iteration 2 (Response model improvements):** T2.3-T2.6, T2.7-T2.8, T3.2 -- verification types, notes, acknowledge model. This iteration transforms the checklist from "checkbox exercise" to "guided assessment."

**Iteration 3 (Polish and future-prep):** T3.1, T3.3-T3.7 -- public pages, team page, onboarding, privacy. Sets the stage for PI 4 (AI integration, i18n, campaigns).

---

## Summary

The app's core architecture is sound. The main issues are:
1. **Two arithmetic bugs** (response count, display name select) that undermine dashboard trust -- trivial to fix.
2. **A UX gap** where guidance content exists in the database but the expand affordance is invisible to users.
3. **A missing abstraction** for item verification types that will be needed for the email campaign feature.
4. **Category grouping data** already exists in the schema but is not surfaced in the workspace UI.

The biggest architectural risk for PI 3 is scope creep into AI/campaign features before the foundation is solid. The recommendation is to spend PI 3 entirely on fixing bugs, surfacing existing data, and adding the `verification_type` + `note` columns that future features will require.
