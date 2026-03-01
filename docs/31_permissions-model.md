# Permissions Model — smbsec1

This document defines role capabilities and enforcement boundaries.

Roles are capability-based, not persona-based.

---

# Role Definitions

## Org Admin

Root-level authority in organization.

Capabilities:

- Create organization
- Invite direct reports
- Assign Manager or Employee role
- Start org-wide assessment
- View all org data
- Delete any employee
- Delete any subtree
- Delete organization
- Export all org data (GDPR)

Cannot:
- Bypass “one active assessment per org” rule

---

## Manager

Manager is an Employee with direct reports.

Capabilities:

- Invite direct reports
- Assign role to direct reports
- View subtree progress
- Trigger reassessment for subtree
- Manage branch invites

Cannot:

- Delete subtree
- Delete organization
- View outside subtree
- Modify roles outside subtree
- Run assessment if another is active

---

## Employee

Capabilities:

- Complete assigned assessment items
- View own assessment results
- View own history

Cannot:

- View other employees
- Trigger assessments
- Manage org structure

---

# Subtree Definition

A subtree is:

- The manager node
- All descendants recursively

Enforcement:

- Must be enforced in DB using recursive queries or adjacency list traversal
- Backend must validate scope before action

---

# Enforcement Layers

Permissions must be enforced in:

1. Database (RLS)
2. Backend API
3. UI

Database is canonical source of truth.
