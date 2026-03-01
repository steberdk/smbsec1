# Acceptance Criteria — C2 Frozen Specification

This document converts user journeys into testable, enforceable rules.

These criteria must be satisfied by:
- Backend logic
- Database constraints
- RLS policies
- E2E tests

---

# 1. Organization Creation

## AC-ORG-1
When a user creates an organization:
- A row must be inserted into `orgs`
- A corresponding `org_members` row must be created
  - role = 'org_admin'
  - manager_user_id = null

## AC-ORG-2
An organization must have exactly one root member:
- role = 'org_admin'
- manager_user_id IS NULL

---

# 2. Invite Flow

## AC-INV-1
Org Admin can invite direct reports.
- Invited member must reference inviter as manager_user_id.

## AC-INV-2
Manager can invite direct reports.
- Invited member must reference manager as manager_user_id.
- Manager cannot assign org_admin role.

## AC-INV-3
User cannot invite outside their subtree.

---

# 3. Role Boundaries

## AC-ROLE-1
Employee:
- Cannot invite users
- Cannot start assessment
- Cannot delete users

## AC-ROLE-2
Manager:
- Can invite/manage direct reports only
- Can trigger reassessment for subtree
- Cannot delete subtree
- Cannot delete organization

## AC-ROLE-3
Org Admin:
- Can start org-wide assessment
- Can delete any employee
- Can delete subtree
- Can delete organization

---

# 4. Assessment Lifecycle

## AC-ASMT-1
Only one assessment with status='active' per org.

Attempting to create another must return error (HTTP 409).

## AC-ASMT-2
Assessment states allowed:

active → completed

No other states permitted in MVP.

## AC-ASMT-3
Assessment snapshot:
When assessment is created:
- All checklist items must be copied into `assessment_items`.
- Snapshot must be immutable.

## AC-ASMT-4
If scope = 'subtree':
- root_user_id must be set.
- Only users within subtree can submit responses.

## AC-ASMT-5
If scope = 'org':
- All org members can submit responses.

---

# 5. Scope Enforcement

## AC-SCOPE-1
Assessment response creation must validate:
- User belongs to same org.
- User is within scope (org-wide or subtree).

If not, request must be rejected.

## AC-SCOPE-2
Manager triggering subtree assessment:
- root_user_id must equal manager’s user_id.

---

# 6. Dynamic Aggregation

## AC-AGG-1
Manager dashboard must only aggregate data from subtree.

## AC-AGG-2
Org Admin dashboard must aggregate entire org.

Aggregation must use recursive tree traversal.

---

# 7. Hard Delete — Employee

## AC-DEL-1
Deleting employee must:
- Remove org_members row.
- Remove assessment_responses rows for that user.
- Cascade dependent records.

## AC-DEL-2
Deletion must be irreversible.

---

# 8. Hard Delete — Subtree

## AC-DEL-3
Only Org Admin may delete subtree.

Deleting subtree must:
- Remove all descendants recursively.
- Remove related assessment data.

---

# 9. Hard Delete — Organization

## AC-DEL-4
Only Org Admin may delete organization.

Deletion must remove:
- org
- org_members
- assessments
- assessment_items
- assessment_responses

---

# 10. GDPR Export

## AC-GDPR-1
Org Admin can export:
- Org structure
- Assessment history
- Employee results

Export must include all personal data stored.
