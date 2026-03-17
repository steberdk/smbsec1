# Architecture & Product Decisions

This document contains canonical architectural and behavioral decisions.
Agents and contributors must follow these rules.

---

## Canonical checklist persistence (legacy phase)

Canonical (legacy):
`public.user_checklists` (jsonb `data` keyed by checklist item id).

Legacy (do not extend):
`public.checklist_progress` (checked_keys/percent).

NOTE:
The JSON-based checklist storage is transitional.
Future assessments use normalized assessment tables (see below).

---

# C2 — Organization & Assessment Model Decisions

## 1. Organization Model

- Organizations are hierarchical trees.
- Each member has exactly one manager (except Org Admin at root).
- Managers invite and manage only their direct reports.
- Org Admin is root of the tree.
- Managers cannot manage outside their subtree.

Aggregation strategy:
Option A — Dynamic aggregation (compute subtree at query time).

Rationale:
SMB orgs are small. Query-time recursion is acceptable.
Optimizations may be added later.

---

## 2. Roles & Authority

Roles are capability-based:

- Org Admin (Owner)
- Manager
- Employee

Rules:

- Org Admin can:
  - invite any direct reports
  - trigger org-wide assessment
  - delete any employee
  - delete entire org
  - export all org data

- Manager can:
  - invite/manage direct reports in their branch
  - trigger reassessment for their subtree
  - view subtree progress
  - NOT delete subtree
  - NOT delete org

- Employee can:
  - complete assigned assessments
  - view own progress only

---

## 3. Assessments

- Only ONE active assessment per organization at a time.
- Reassessment creates a FULL SNAPSHOT copy of checklist items.
- Snapshot stored in `assessment_items`.
- Assessment items are immutable once created.

Scope:
- Org Admin may run org-wide assessment.
- Manager may run reassessment limited to subtree.

Constraint:
A new assessment cannot start if one is already active.

---

## 4. GDPR / Data Deletion

Hard delete policy.

No soft-delete flags.

Deletion rules:

- Delete employee:
  - Hard delete membership node
  - Hard delete assessment responses
  - Cascade dependent records

- Delete branch:
  - Only Org Admin
  - Hard delete entire subtree

- Delete org:
  - Only Org Admin
  - Hard delete all data

Confirmation policy:
Deletion requires explicit confirmation.
Future enhancement:
Escalation email confirmation to manager’s manager.

---

## 5. Phishing Campaigns (Future)

Campaigns will:
- Belong to assessment cycle or independent
- Store per-user event results
- Be deletable via GDPR

Not MVP, but schema must allow extension.

---

## 6. Platform-Specific Steps Storage (Iteration 5)

Decision: `checklist_items.steps` uses a keyed jsonb object format.

Format:
```json
{
  "default": ["Step 1", "Step 2"],
  "google_workspace": ["Go to admin.google.com...", "..."],
  "microsoft_365": ["Go to security.microsoft.com...", "..."]
}
```

Resolution logic: `resolveSteps(stepsMap, orgPlatform)` picks the platform-specific
variant if it exists, otherwise falls back to `"default"`.

At assessment creation (snapshot time), steps are resolved for the org's
`email_platform` setting and stored as a flat array in `assessment_items.steps`.
This means historical snapshots reflect the platform choice at the time the
assessment was started.

Migration 007 transformed all existing flat arrays to `{ "default": [...] }`.

---

## 7. Named Members via Email in org_members (Iteration 5)

Decision: Store `email` in `org_members` at invite acceptance.

Rationale: The alternative (`supabase.auth.admin.listUsers()`) fetches all
project users on every dashboard load and would rate-limit at scale.

The `email` column is nullable — existing rows and self-created org_admin
accounts remain null (dashboard falls back to truncated UUID).

---

## 8. No Hidden Authority

All permission enforcement must:
- Exist in database (RLS)
- Exist in backend validation
- Not rely solely on frontend logic

---

## 9. Workspace Navigation Shell (PI 2, Iteration 1)

Decision: All workspace pages share a persistent layout via `workspace/layout.tsx`.

Architecture:
- `WorkspaceProvider` context (in `lib/hooks/useWorkspace.tsx`) fetches org/membership data once
- All workspace pages consume via `useWorkspace()` hook instead of individual fetches
- Role-aware nav links rendered in the layout header
- Individual page `PageShell` wrappers removed

Rationale: Eliminates duplicated auth/loading logic across 7 workspace pages.
Provides persistent navigation without "Back" links.

---

## 10. Display Name on org_members (PI 2, Iteration 1)

Decision: Add `display_name` (text, nullable) to `org_members`.

Captured at invite acceptance via a name prompt before the accept API call.
Shown on dashboard, settings, and member lists (falls back to email → UUID).

The column is nullable and the code handles its absence gracefully — if migration 011
hasn't been applied yet, queries omit it and the UI falls back to email.

---

## 11. Security Headers via next.config.ts (PI 2, Iteration 1)

Decision: Security headers (CSP, X-Frame-Options, etc.) are set in `next.config.ts`
`headers()` function rather than middleware or per-route.

CSP allows `connect-src` to self + Supabase URLs. `script-src` includes `unsafe-inline`
and `unsafe-eval` because Next.js requires them for client-side hydration.

---

## 12. In-Memory Rate Limiting (PI 2, Iteration 1)

Decision: Simple in-memory sliding-window rate limiter (60 req/min/user).

Not persistent across serverless cold starts — acceptable for SMB scale.
Applied selectively to high-risk routes (dashboard, invite accept).
Keyed by user_id (authenticated) or IP (unauthenticated).
