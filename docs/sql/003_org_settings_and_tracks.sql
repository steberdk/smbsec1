-- 003_org_settings_and_tracks.sql
--
-- Extends existing tables with:
--   1. Org-level settings (email platform, OS, company size) — drives platform-specific
--      checklist step content and AI context (AC-ONBOARD-5, AC-TRACK-4)
--   2. IT Executor flag on org_members — determines who gets the IT Baseline track
--      (AC-ONBOARD-2, AC-TRACK-1, AC-TRACK-2)
--   3. Track + impact/effort columns on assessment_items — needed to distinguish
--      IT Baseline from Awareness items in snapshots (AC-TRACK-1, AC-AWARE-1)
--
-- Apply in Supabase SQL editor after 002_workspaces.sql.
-- Safe to re-run (IF NOT EXISTS / IF column does not exist guards).

-- =============================================================================
-- 1. Org settings columns
-- =============================================================================

ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS email_platform text
    CHECK (email_platform IN ('google_workspace', 'microsoft_365', 'gmail_personal', 'other')),

  ADD COLUMN IF NOT EXISTS primary_os text
    CHECK (primary_os IN ('windows', 'mac', 'mixed')),

  ADD COLUMN IF NOT EXISTS company_size text
    CHECK (company_size IN ('1-5', '6-20', '21-50', '50+'));

COMMENT ON COLUMN public.orgs.email_platform IS
  'Collected at onboarding. Drives platform-specific step content on checklist items.';

COMMENT ON COLUMN public.orgs.primary_os IS
  'Collected at onboarding. Used for OS-specific guidance in checklist steps.';

COMMENT ON COLUMN public.orgs.company_size IS
  'Collected at onboarding. Used for AI context and future analytics.';

-- =============================================================================
-- 2. IT Executor flag on org_members
-- =============================================================================
--
-- The IT Executor is the person responsible for working through the IT Baseline
-- checklist. Exactly one member per org can hold this flag at a time.
-- This is a UI/assignment concept, not a permission role — the DB role
-- (manager / employee) is separate. See DECISIONS.md.

ALTER TABLE public.org_members
  ADD COLUMN IF NOT EXISTS is_it_executor boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.org_members.is_it_executor IS
  'True for the one person assigned to complete the IT Baseline checklist.
   Set at org onboarding (step "Who handles IT?") or changed via Team Settings.
   Enforced to one per org by the unique partial index below.';

-- Only one IT executor per org at a time.
CREATE UNIQUE INDEX IF NOT EXISTS ux_one_it_executor_per_org
  ON public.org_members (org_id)
  WHERE is_it_executor = true;

-- =============================================================================
-- 3. Track, impact, and effort columns on assessment_items
-- =============================================================================
--
-- track: which checklist track the item belongs to.
--   'it_baseline'  — technical configuration tasks (IT Executor only)
--   'awareness'    — behaviour/recognition tasks (all staff)
--
-- impact/effort: snapshotted from items.ts at assessment creation time so
--   historical assessments show the original metadata even if items.ts changes.
--
-- DEFAULT 'it_baseline' covers any rows inserted before this migration.
-- New inserts from the API must always supply the track explicitly.

ALTER TABLE public.assessment_items
  ADD COLUMN IF NOT EXISTS track text NOT NULL DEFAULT 'it_baseline'
    CHECK (track IN ('it_baseline', 'awareness')),

  ADD COLUMN IF NOT EXISTS impact text
    CHECK (impact IN ('high', 'medium', 'low')),

  ADD COLUMN IF NOT EXISTS effort text
    CHECK (effort IN ('minutes', 'hour', 'day'));

COMMENT ON COLUMN public.assessment_items.track IS
  'Checklist track: it_baseline (IT Executor only) or awareness (all staff).
   Snapshotted from items.ts at assessment creation and immutable thereafter.';

COMMENT ON COLUMN public.assessment_items.impact IS
  'Impact level snapshotted from items.ts. high | medium | low.';

COMMENT ON COLUMN public.assessment_items.effort IS
  'Effort estimate snapshotted from items.ts. minutes | hour | day.';

-- Index to quickly filter items by track within an assessment.
CREATE INDEX IF NOT EXISTS idx_assessment_items_track
  ON public.assessment_items (assessment_id, track);
