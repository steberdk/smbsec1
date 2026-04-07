-- reset_user_data.sql
-- Deletes all organisation/user data for a fresh test start.
-- KEEPS: checklist_items, checklist_groups, campaign_templates (system templates), platform_steps
-- Run in Supabase SQL Editor with service_role.

BEGIN;

-- ============================================================
-- 1. Campaign data (depends on orgs + users)
-- ============================================================
TRUNCATE smbsec1.campaign_recipients CASCADE;
TRUNCATE smbsec1.campaigns CASCADE;

-- Delete only custom (org-owned) templates, keep system templates
DELETE FROM smbsec1.campaign_templates WHERE custom = true;

-- ============================================================
-- 2. Assessment data (depends on orgs + users)
-- ============================================================
TRUNCATE smbsec1.assessment_responses CASCADE;
TRUNCATE smbsec1.assessment_items CASCADE;
TRUNCATE smbsec1.assessments CASCADE;

-- ============================================================
-- 3. Invites
-- ============================================================
TRUNCATE smbsec1.invites CASCADE;

-- ============================================================
-- 4. Org members (before orgs, due to self-referencing FK)
-- ============================================================
TRUNCATE smbsec1.org_members CASCADE;

-- ============================================================
-- 5. Organisations
-- ============================================================
TRUNCATE smbsec1.orgs CASCADE;

-- ============================================================
-- 6. User checklists (personal checklist progress)
-- ============================================================
TRUNCATE smbsec1.user_checklists CASCADE;

-- ============================================================
-- 7. Audit logs (optional — uncomment to clear audit trail too)
-- ============================================================
-- TRUNCATE smbsec1.audit_logs;

-- ============================================================
-- 8. Supabase auth users (deletes all login accounts)
-- ============================================================
-- This removes all users from auth.users, which cascades to
-- any remaining FK references.
DELETE FROM auth.users;

COMMIT;

-- ============================================================
-- WHAT IS PRESERVED:
--   - smbsec1.checklist_items      (master checklist definitions)
--   - smbsec1.checklist_groups     (checklist group definitions)
--   - smbsec1.campaign_templates   (system phishing/knowledge templates, EN + DA)
--   - smbsec1.platform_steps       (if exists)
--   - smbsec1.audit_logs           (kept by default — uncomment above to clear)
-- ============================================================
