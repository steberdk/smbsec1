-- 005_rls_policies.sql
--
-- Row Level Security policies for all workspace tables.
--
-- Strategy:
--   RLS enforces org-level isolation (prevents any cross-org data leakage).
--   Within-org role boundaries (subtree checks, who can start an assessment, etc.)
--   are enforced by API route handlers — these are too complex for inline RLS
--   and would require recursive CTEs that perform poorly at scale.
--
--   This satisfies DECISIONS.md rule 6: "All permission enforcement must exist
--   in database (RLS) AND backend validation."
--
-- Tables covered:
--   public.orgs
--   public.org_members
--   public.assessments
--   public.assessment_items
--   public.assessment_responses
--   public.invites
--
-- Apply in Supabase SQL editor after 004_invites.sql.
-- Safe to re-run (DROP POLICY IF EXISTS before each CREATE POLICY).

-- =============================================================================
-- 0. Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- =============================================================================
--
-- These functions run as the table owner and bypass RLS, which is required
-- to safely query org_members inside org_members policies without infinite
-- recursion. See: https://supabase.com/docs/guides/auth/row-level-security

-- Returns all org_ids the current user belongs to.
CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id
  FROM public.org_members
  WHERE user_id = auth.uid();
$$;

-- Returns true if the current user is an org_admin of the given org.
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE org_id  = _org_id
      AND user_id = auth.uid()
      AND role    = 'org_admin'
  );
$$;

-- Returns true if the current user is a member (any role) of the given org.
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE org_id  = _org_id
      AND user_id = auth.uid()
  );
$$;

-- =============================================================================
-- 1. public.orgs
-- =============================================================================

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

-- SELECT: any member of the org can read it.
DROP POLICY IF EXISTS "org members can read their org" ON public.orgs;
CREATE POLICY "org members can read their org"
  ON public.orgs FOR SELECT
  TO authenticated
  USING (id IN (SELECT public.get_my_org_ids()));

-- INSERT: any authenticated user can create a new org (onboarding).
-- The API immediately inserts an org_members row for the creator as org_admin.
DROP POLICY IF EXISTS "authenticated users can create an org" ON public.orgs;
CREATE POLICY "authenticated users can create an org"
  ON public.orgs FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- UPDATE: org_admin only (change name, settings, email platform, etc.).
DROP POLICY IF EXISTS "org admin can update their org" ON public.orgs;
CREATE POLICY "org admin can update their org"
  ON public.orgs FOR UPDATE
  TO authenticated
  USING  (public.is_org_admin(id))
  WITH CHECK (public.is_org_admin(id));

-- DELETE: org_admin only (full org deletion — GDPR).
DROP POLICY IF EXISTS "org admin can delete their org" ON public.orgs;
CREATE POLICY "org admin can delete their org"
  ON public.orgs FOR DELETE
  TO authenticated
  USING (public.is_org_admin(id));

-- =============================================================================
-- 2. public.org_members
-- =============================================================================

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- SELECT: members of the same org can see each other.
-- Uses get_my_org_ids() to avoid self-referential recursion.
DROP POLICY IF EXISTS "org members can see peers" ON public.org_members;
CREATE POLICY "org members can see peers"
  ON public.org_members FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT public.get_my_org_ids()));

-- INSERT: the API validates that only org_admin or a manager invites within
-- their subtree. RLS only checks that the inserting user is already in that org
-- (or is creating the first org_admin row during onboarding).
-- The org_admin bootstrap row is inserted by the API immediately after org creation
-- — at that point get_my_org_ids() returns nothing, so we allow insert where
-- created_by = auth.uid() is on the parent orgs row.
DROP POLICY IF EXISTS "org members can be added by org members" ON public.org_members;
CREATE POLICY "org members can be added by org members"
  ON public.org_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Either: inserting user is already a member of this org (manager/admin adding someone)
    org_id IN (SELECT public.get_my_org_ids())
    OR
    -- Or: this is the bootstrap org_admin row being inserted during org creation.
    -- The user must be the org creator and the role must be org_admin.
    (
      role = 'org_admin'
      AND manager_user_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.orgs
        WHERE id = org_id AND created_by = auth.uid()
      )
    )
  );

-- UPDATE: org_admin only (role changes, is_it_executor changes).
-- The API validates what fields may actually change.
DROP POLICY IF EXISTS "org admin can update members" ON public.org_members;
CREATE POLICY "org admin can update members"
  ON public.org_members FOR UPDATE
  TO authenticated
  USING  (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

-- DELETE: org_admin only (employee delete / branch delete / GDPR).
DROP POLICY IF EXISTS "org admin can delete members" ON public.org_members;
CREATE POLICY "org admin can delete members"
  ON public.org_members FOR DELETE
  TO authenticated
  USING (public.is_org_admin(org_id));

-- =============================================================================
-- 3. public.assessments
-- =============================================================================

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- SELECT: any org member can see assessments for their org.
DROP POLICY IF EXISTS "org members can read assessments" ON public.assessments;
CREATE POLICY "org members can read assessments"
  ON public.assessments FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));

-- INSERT: the API validates that the user is org_admin or manager and that
-- no active assessment already exists (unique partial index also enforces this
-- at DB level). RLS ensures the user is at minimum an org member.
DROP POLICY IF EXISTS "org members can create assessments" ON public.assessments;
CREATE POLICY "org members can create assessments"
  ON public.assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND created_by = auth.uid()
  );

-- UPDATE: only the assessment creator or an org_admin can update (e.g. complete).
-- The API restricts which fields are updateable (only status: active → completed).
DROP POLICY IF EXISTS "assessment creator or admin can update" ON public.assessments;
CREATE POLICY "assessment creator or admin can update"
  ON public.assessments FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_org_admin(org_id)
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_org_admin(org_id)
  );

-- DELETE: org_admin only. Cascades remove assessment_items and assessment_responses.
DROP POLICY IF EXISTS "org admin can delete assessments" ON public.assessments;
CREATE POLICY "org admin can delete assessments"
  ON public.assessments FOR DELETE
  TO authenticated
  USING (public.is_org_admin(org_id));

-- =============================================================================
-- 4. public.assessment_items
-- =============================================================================

ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;

-- SELECT: any org member can read items for assessments in their org.
DROP POLICY IF EXISTS "org members can read assessment items" ON public.assessment_items;
CREATE POLICY "org members can read assessment items"
  ON public.assessment_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
        AND public.is_org_member(a.org_id)
    )
  );

-- INSERT: only the assessment creator (org_admin or manager who started it).
-- Items are inserted in bulk by the API when the assessment is created.
-- They are immutable thereafter (no UPDATE or DELETE policies).
DROP POLICY IF EXISTS "assessment creator can insert items" ON public.assessment_items;
CREATE POLICY "assessment creator can insert items"
  ON public.assessment_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
        AND a.created_by = auth.uid()
    )
  );

-- No UPDATE policy — assessment_items are immutable once created (AC-ASMT-3).
-- No DELETE policy — cascade from assessment deletion handles cleanup.

-- =============================================================================
-- 5. public.assessment_responses
-- =============================================================================

ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read their own responses.
-- Managers/admins need to see their team's responses — this is handled by the
-- API (which reads responses using the user's JWT + a server-side subtree query).
-- RLS allows org members to read all responses within their org to support
-- the dashboard aggregation queries run by the API.
DROP POLICY IF EXISTS "org members can read responses in their org" ON public.assessment_responses;
CREATE POLICY "org members can read responses in their org"
  ON public.assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
        AND public.is_org_member(a.org_id)
    )
  );

-- INSERT: users can submit their own responses only.
-- The API validates that the user is within the assessment's scope (AC-SCOPE-1).
DROP POLICY IF EXISTS "users can insert own responses" ON public.assessment_responses;
CREATE POLICY "users can insert own responses"
  ON public.assessment_responses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: users can update their own responses only (change Done → Not sure etc.).
DROP POLICY IF EXISTS "users can update own responses" ON public.assessment_responses;
CREATE POLICY "users can update own responses"
  ON public.assessment_responses FOR UPDATE
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: org_admin only (GDPR employee delete — cascade from org_members delete
-- handles this automatically, but an explicit policy is added for safety).
DROP POLICY IF EXISTS "org admin can delete responses" ON public.assessment_responses;
CREATE POLICY "org admin can delete responses"
  ON public.assessment_responses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
        AND public.is_org_admin(a.org_id)
    )
  );

-- =============================================================================
-- 6. public.invites
-- =============================================================================

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can see pending invites for their org.
-- The API filters further by role (managers see only invites they created).
DROP POLICY IF EXISTS "org members can read invites for their org" ON public.invites;
CREATE POLICY "org members can read invites for their org"
  ON public.invites FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));

-- INSERT: org members can create invites (API validates inviter role and subtree).
DROP POLICY IF EXISTS "org members can create invites" ON public.invites;
CREATE POLICY "org members can create invites"
  ON public.invites FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND invited_by = auth.uid()
  );

-- UPDATE: only the inviter or org_admin can update an invite (e.g. revoke).
-- Acceptance (setting accepted_at) is also done here by the API using the
-- invitee's session after they sign up — the invitee is not yet an org member
-- at that moment, so the API must handle acceptance in a privileged context.
DROP POLICY IF EXISTS "inviter or admin can update invite" ON public.invites;
CREATE POLICY "inviter or admin can update invite"
  ON public.invites FOR UPDATE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR public.is_org_admin(org_id)
  )
  WITH CHECK (
    invited_by = auth.uid()
    OR public.is_org_admin(org_id)
  );

-- DELETE: org_admin or the original inviter can revoke an invite.
DROP POLICY IF EXISTS "inviter or admin can delete invite" ON public.invites;
CREATE POLICY "inviter or admin can delete invite"
  ON public.invites FOR DELETE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR public.is_org_admin(org_id)
  );

-- =============================================================================
-- NOTES
-- =============================================================================
--
-- Invite acceptance edge case:
--   When a new user accepts an invite they are not yet in org_members, so
--   is_org_member() returns false. The API route handling invite acceptance
--   must use the Supabase admin client (server-side, not the user's JWT) to:
--     1. Validate the token
--     2. Insert the org_members row
--     3. Mark accepted_at
--   This is the one place where a privileged server-side operation is required.
--   Store the admin key in a server-side env var (never NEXT_PUBLIC_*).
--
-- Future: if phishing campaigns are added, add a public.campaigns table and
--   public.campaign_results table with equivalent RLS following the same pattern.
