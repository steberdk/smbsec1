-- Migration 021: F-022 — Remove Manager Role
-- Remove "manager" from org_members and invites role CHECK constraints,
-- reassign any existing manager members to employee, and drop manager_user_id columns.
-- Safe to re-run (uses IF EXISTS, idempotent guards).

-- =============================================================================
-- 1. Reassign any existing "manager" org_members rows to "employee"
-- =============================================================================
UPDATE smbsec1.org_members
SET role = 'employee'
WHERE role = 'manager';

-- =============================================================================
-- 2. Reassign any pending invites with role "manager" to "employee"
-- =============================================================================
UPDATE smbsec1.invites
SET role = 'employee'
WHERE role = 'manager';

-- =============================================================================
-- 3. Update CHECK constraint on org_members.role
--    Note: constraint name may vary from original migration. Use IF EXISTS.
--    Check actual names with:
--    SELECT conname FROM pg_constraint WHERE conrelid = 'smbsec1.org_members'::regclass;
-- =============================================================================
ALTER TABLE smbsec1.org_members
  DROP CONSTRAINT IF EXISTS org_members_role_check;

ALTER TABLE smbsec1.org_members
  ADD CONSTRAINT org_members_role_check
  CHECK (role IN ('org_admin', 'employee'));

-- =============================================================================
-- 4. Update CHECK constraint on invites.role
--    Check actual names with:
--    SELECT conname FROM pg_constraint WHERE conrelid = 'smbsec1.invites'::regclass;
-- =============================================================================
ALTER TABLE smbsec1.invites
  DROP CONSTRAINT IF EXISTS invites_role_check;

ALTER TABLE smbsec1.invites
  ADD CONSTRAINT invites_role_check
  CHECK (role IN ('employee'));

-- =============================================================================
-- 5. Drop manager_user_id from org_members
-- =============================================================================
ALTER TABLE smbsec1.org_members
  DROP CONSTRAINT IF EXISTS fk_manager;

ALTER TABLE smbsec1.org_members
  DROP COLUMN IF EXISTS manager_user_id;

-- =============================================================================
-- 6. Drop manager_user_id from invites
-- =============================================================================
ALTER TABLE smbsec1.invites
  DROP CONSTRAINT IF EXISTS invites_manager_user_id_fkey;

ALTER TABLE smbsec1.invites
  DROP COLUMN IF EXISTS manager_user_id;
