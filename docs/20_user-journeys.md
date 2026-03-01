# User Journeys — smbsec1 (v0)

This document defines the core user journeys and constraints for MVP and early iterations.

## Core concepts

### Roles (capabilities, not “persona”)
We model “primary user” as **capabilities** rather than a single persona, because the org is recursive: an Owner behaves like a Manager, and Managers are also Employees.

**Role types**
- **Org Admin (Owner / Executive Sponsor)**: top-level administrator for the organization.
- **Manager**: can invite/manage their direct reports and run assessments for their subtree.
- **Employee**: completes assigned assessments; may also be a Manager.

**Key rule**
- Every user is an **Employee** of someone (except the Org Admin who is the root). A Manager is simply an Employee with direct reports.

### Org structure (recursive)
- An organization is a **tree**.
- Each node is a **member** (user), with optional direct reports.
- Management is **local**: each manager is responsible for inviting and managing only their direct reports.

### Assessment lifecycle
- **One assessment active at a time per org.**
- Reassessments create a **full copy** of checklist items into an assessment-scoped table for easy querying and historical comparison.
- Assessments can be scoped:
  - Org-wide (Org Admin)
  - Subtree-only (Manager)

### Privacy / GDPR
- We support **hard delete** (no soft-delete) for employees, branches, and organizations.
- Deletions are guarded by **warnings and confirmations** (including escalation email).

### Aggregation strategy
- **Option A — Dynamic aggregation**: compute subtree progress at query time.
- Assumption: SMB orgs are small enough that this is efficient. We can optimize later if needed.

---

## Journey 0 — Public (no login): Learn + Decide
**Goal**: explain impact and guide the user toward starting.

1. User visits landing page
2. Reads “high-impact steps”
3. Runs checklist unauthenticated (optional)
4. Sees value and is prompted to log in to save progress & manage org
5. Clicks “Log in / Create account”

Success criteria:
- User understands value
- User reaches a “first win” moment (e.g., completed a few checklist items)

---

## Journey 1 — Org Admin creates org and invites only direct reports
**Goal**: Owner sets up the top level without building the full org.

1. Org Admin signs up / logs in
2. Creates org (name, basic settings)
3. Sees “Your org is ready”
4. Invites **direct reports only** by email:
   - May invite Managers and/or Employees
   - Each invite assigns: role + who they report to (Org Admin)
5. Org Admin can stop here; org grows organically through managers.

Success criteria:
- Org exists
- At least one direct report invited
- Org Admin is not blocked by needing full org mapping

Constraints:
- Org Admin can invite anyone who reports **directly to Org Admin**.
- Org Admin does not need to know the full tree.

---

## Journey 2 — Manager joins and invites their direct reports
**Goal**: grow the org tree by delegation.

1. Manager receives invite email
2. Accepts invite, creates account (or logs in)
3. Lands in “My team”
4. Invites their own **direct reports** by email:
   - assigns role (Manager/Employee)
5. Manager can see status/progress of their subtree only

Success criteria:
- Manager successfully expands org by inviting direct reports
- Manager can view team progress and trigger reassessment for their subtree

Constraints:
- Managers can only manage invites for their branch.
- Managers cannot edit or invite outside their subtree.

---

## Journey 3 — Employee joins and completes assessment
**Goal**: employees do the work; progress is measurable.

1. Employee receives invite
2. Accepts invite and logs in
3. Sees “My current assessment”
4. Completes checklist items (Done / Not sure / Skip / Reset)
5. Progress saves to backend under that assessment (and user)

Success criteria:
- Employee can complete tasks without understanding org structure
- Progress is saved & visible to their manager

---

## Journey 4 — Start an org-wide assessment (Org Admin)
**Goal**: create and activate exactly one org assessment.

1. Org Admin goes to Assessments
2. Clicks “Start new org assessment”
3. Chooses scope = Org-wide
4. System creates:
   - Assessment record (active)
   - **Full copy of checklist items** into assessment_items
   - Per-user assignment rows (optional, or implicit by scope)
5. System sends assessment email notifications (optional MVP: in-app only)

Success criteria:
- One active assessment exists
- Checklist snapshot is immutable for the assessment duration

Constraints:
- If an active assessment exists, org admin must **complete/close** it before creating a new one.

---

## Journey 5 — Start a subtree reassessment (Manager)
**Goal**: manager improves their branch without affecting the whole org.

1. Manager goes to Assessments
2. Clicks “Start reassessment for my team”
3. Confirms scope = their subtree
4. System validates:
   - Org has no other active assessment (global constraint)
5. System creates:
   - New active assessment (org-level uniqueness still holds)
   - Snapshot copy of checklist items into assessment_items
   - Assignments limited to manager’s subtree

Success criteria:
- Manager can run cadence independently (within the “one active per org” rule)
- Only subtree members are in scope

Constraints:
- Manager cannot start if another assessment is active in org
- Manager cannot expand scope beyond their subtree

---

## Journey 6 — View progress (dynamic aggregation)
**Goal**: show useful progress without precomputed rollups.

Views:
- Employee: “My progress”
- Manager: “My subtree progress”
- Org Admin: “Org-wide progress”

Aggregation:
- Compute subtree by querying the org tree at runtime
- Aggregate:
  - completion percent
  - counts by status (Done / Not sure / Skip)
  - completion by group

Success criteria:
- Progress is accurate and fast for SMB-sized orgs

---

## Journey 7 — Hard delete an employee (GDPR)
**Goal**: completely remove an employee and all traces.

Who can initiate:
- Org Admin can delete any employee
- Manager can request deletion of a direct report **only if policy allows** (MVP rule below)

MVP rule (as requested):
- **Managers cannot delete subtree** (and should not delete employees).
- Managers can only manage invites in their branch.
- Deletions are handled by Org Admin (or higher manager).

Flow:
1. Org Admin selects employee
2. Clicks “Delete employee (GDPR)”
3. Sees warning of permanent deletion
4. System sends confirmation email:
   - If deleter is a Manager (future option): confirmation goes to deleter’s manager (escalation)
   - For MVP: Org Admin confirms directly
5. After confirmation, system hard deletes:
   - employee membership node
   - assessment answers for that user
   - related artifacts
6. Audit entry is kept only if legally allowed (MVP: keep minimal, non-personal event log; otherwise delete too)

Success criteria:
- Employee and their assessment data removed
- Org tree remains consistent

---

## Journey 8 — Hard delete a branch (GDPR)
**Goal**: delete an entire manager subtree.

Who can:
- **Org Admin only** (per your constraint)

Flow:
1. Org Admin selects manager
2. Clicks “Delete branch”
3. Warning: X employees will be deleted
4. Confirmation email to Org Admin (or step-up confirmation)
5. Hard delete subtree:
   - membership nodes in subtree
   - all assessment answers for those users
   - related artifacts

Success criteria:
- Entire subtree deleted without orphan references

---

## Journey 9 — Hard delete organization (GDPR)
**Goal**: delete everything for the org.

Who can:
- **Org Admin only**

Flow:
1. Org Admin opens GDPR / Data Controls
2. Clicks “Delete organization”
3. Warning + strong confirmation
4. Confirmation email + final acknowledgement
5. Hard delete:
   - org record
   - membership tree
   - all assessments + assessment_items snapshots
   - all answers
   - all campaign records (later)
6. Verify deletion completed

Success criteria:
- No org data remains in DB

---

## Notes / MVP boundaries

### MVP now includes
- Recursive org tree (invite-your-direct-reports)
- One active assessment per org
- Assessment snapshot table
- Dynamic aggregation (no rollups)
- Hard delete flows (Org Admin)

### Later (not MVP)
- Managers initiating deletion with escalation approval
- Multiple parallel assessments per org
- Rollup tables for large orgs
- Phishing campaigns and training loops

---
