# GDPR Data Map — smbsec1

---

# 0. Data Residency

All data is stored in **Supabase (PostgreSQL), region: West EU — Ireland (AWS eu-west-1)**.
No personal data leaves the EU.

Infrastructure:
- Database: Supabase managed Postgres, eu-west-1
- Frontend/API: Vercel (serverless functions run in the region closest to the user; no persistent storage)
- Email delivery: Resend (transactional only; no personal data stored by Resend beyond the email address in transit)

---

This document defines what personal and organizational data is stored,
and how deletion/export is handled.

---

# 1. Personal Data Stored

## User-level

- Email
- User ID (UUID)
- Role
- Manager relationship
- Assessment responses
- Completion timestamps
- Login timestamps

Future:
- Phishing campaign events

---

# 2. Organization-level Data

- Organization name
- Created_at
- Assessment records
- Assessment item snapshots
- Reports generated

---

# 3. System-level Data

- Audit events (minimal, non-sensitive)
- Access logs

---

# 4. Export (Right of Access)

Org Admin can:

- Export organization structure
- Export assessments
- Export employee results

Export must include:
- All personal data stored
- In machine-readable format (JSON)

---

# 5. Hard Delete Policy

No soft delete flags.

Deletion must:

- Remove membership row
- Remove assessment responses
- Remove campaign results (future)
- Remove subtree if applicable

Deletion types:

## Delete Self (any user)

Any authenticated user can delete their own account.

Blockers (simple MVP rule):
- Org admin with other members → must delete the organisation first
- Manager with direct reports → must remove direct reports first

On success, hard delete:
- org_member row
- assessment_responses
- Supabase auth user record
- Redirect to /

Deferred (for later when real user volume warrants it):
- Migrate direct reports to another manager on self-deletion
- Transfer assessment history to another member

## Delete Employee (by org admin)

Hard delete:
- org_member row
- assessment_responses
- related artifacts

## Delete Branch

Only Org Admin.
Hard delete subtree recursively.

## Delete Organization

Only Org Admin.
Hard delete:
- org
- members
- assessments
- responses
- snapshots
- reports

---

# 6. Confirmation Flow

Deletion requires:

- Explicit confirmation action
- Future: email escalation confirmation
  - If manager deletes employee → confirmation sent to manager’s manager

---

# 7. No Data Resurrection

Deleted data cannot be restored.

Backups must not allow partial rehydration of deleted users.
