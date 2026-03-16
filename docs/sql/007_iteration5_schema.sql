-- 007_iteration5_schema.sql
--
-- Iteration 5 schema changes:
--   1. Add `why_it_matters` (text) and `steps` (jsonb) to assessment_items
--      so snapshots carry guidance content.
--   2. Transform checklist_items.steps from flat array to keyed object
--      { "default": [...], "google_workspace": [...], ... } for platform-specific steps.
--   3. Add `email` (text, nullable) to org_members for named member display.
--
-- Apply in Supabase SQL editor or via pg connection.
-- Safe to re-run (IF NOT EXISTS / idempotent UPDATE guards).
--
-- IMPORTANT: Run this migration BEFORE deploying new app code.

-- =============================================================================
-- 1. assessment_items: add steps + why_it_matters columns
-- =============================================================================

ALTER TABLE public.assessment_items
  ADD COLUMN IF NOT EXISTS why_it_matters text,
  ADD COLUMN IF NOT EXISTS steps jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.assessment_items.why_it_matters IS
  'Snapshotted from checklist_items at assessment creation. Plain text explanation.';

COMMENT ON COLUMN public.assessment_items.steps IS
  'Snapshotted from checklist_items at assessment creation. Resolved for org platform.
   Stored as jsonb array of step strings (already platform-resolved at snapshot time).';

-- =============================================================================
-- 2. checklist_items.steps: transform flat arrays to keyed objects
-- =============================================================================
-- Before: ["Step 1", "Step 2"]
-- After:  { "default": ["Step 1", "Step 2"] }
--
-- Guard: only transform rows where steps is a JSON array (not already an object).

UPDATE public.checklist_items
SET steps = jsonb_build_object('default', steps)
WHERE jsonb_typeof(steps) = 'array';

COMMENT ON COLUMN public.checklist_items.steps IS
  'Platform-specific step instructions. Keyed jsonb object:
   { "default": ["..."], "google_workspace": ["..."], "microsoft_365": ["..."] }
   resolveSteps(steps, orgPlatform) picks the platform key or falls back to "default".';

-- =============================================================================
-- 3. org_members: add email column
-- =============================================================================

ALTER TABLE public.org_members
  ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN public.org_members.email IS
  'Stored at invite acceptance from invites.email. Nullable — existing rows
   and self-created org_admin rows remain null (fallback to truncated UUID).';
