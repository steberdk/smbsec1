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

## 6. No Hidden Authority

All permission enforcement must:
- Exist in database (RLS)
- Exist in backend validation
- Not rely solely on frontend logic
