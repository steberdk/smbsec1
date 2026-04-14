-- Migration 028: F-060 AC-3 — Fix NULL-handling bug in smbsec1.reassign_it_executor.
--
-- Problem. Migration 025 validates that the new assignee is an org member via:
--
--   SELECT true INTO v_new_in_org
--   FROM smbsec1.org_members
--   WHERE org_id = p_org_id AND user_id = p_new_user_id
--   LIMIT 1;
--
--   IF NOT v_new_in_org THEN ... RETURN new_assignee_not_in_org ...
--
-- `v_new_in_org boolean := false;` is declared with a default, but PL/pgSQL
-- `SELECT ... INTO` on no-match sets the variable to NULL (not the default).
-- `NOT NULL` evaluates to NULL in three-valued logic, and PL/pgSQL's `IF`
-- treats NULL as false — so the rejection branch NEVER fires. Effect: the RPC
-- accepts any `p_new_user_id` (even a total stranger not in org_members) and
-- returns success.
--
-- Surfaced by PI 17 Iter 1 E2E-REASSIGN-02 once F-057 unblocked the spec path.
-- CI: commit 8ddf3e9 on 2026-04-14, expected 400 got 200.
--
-- Fix. Use `EXISTS` — it always returns true/false, never NULL. Same contract,
-- idiom-safe. Full `CREATE OR REPLACE` to keep the function in one place.
--
-- Apply in Supabase SQL editor after migration 025 (or 027 — order between
-- the two does not matter).

CREATE OR REPLACE FUNCTION smbsec1.reassign_it_executor(
  p_org_id        uuid,
  p_new_user_id   uuid,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = smbsec1, public
AS $$
DECLARE
  v_prev_user_id     uuid;
  v_active_id        uuid;
  v_resp_count       int := 0;
BEGIN
  -- 1. Verify new assignee is an accepted member of this org. Using EXISTS
  --    instead of `SELECT true INTO var` — EXISTS cannot return NULL, so the
  --    IF below is safe under three-valued logic.
  IF NOT EXISTS (
    SELECT 1
    FROM smbsec1.org_members
    WHERE org_id = p_org_id
      AND user_id = p_new_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'new_assignee_not_in_org'
    );
  END IF;

  -- 2. Find current IT Executor (if any).
  SELECT user_id INTO v_prev_user_id
  FROM smbsec1.org_members
  WHERE org_id = p_org_id
    AND is_it_executor = true
  LIMIT 1;

  -- 3. No-op if same user — return success early without an audit row.
  IF v_prev_user_id IS NOT NULL AND v_prev_user_id = p_new_user_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'response_count_transferred', 0,
      'previous_it_executor_user_id', v_prev_user_id,
      'noop', true
    );
  END IF;

  -- 4. Find active assessment (may be NULL — that's fine).
  SELECT id INTO v_active_id
  FROM smbsec1.assessments
  WHERE org_id = p_org_id
    AND status = 'active'
  LIMIT 1;

  -- 5. Count existing IT Baseline responses authored by the previous IT Exec.
  IF v_active_id IS NOT NULL AND v_prev_user_id IS NOT NULL THEN
    SELECT count(*) INTO v_resp_count
    FROM smbsec1.assessment_responses r
    JOIN smbsec1.assessment_items i
      ON i.id = r.assessment_item_id
    WHERE r.assessment_id = v_active_id
      AND r.user_id = v_prev_user_id
      AND i.track = 'it_baseline';
  END IF;

  -- 6. Atomic flip: unset old FIRST, then set new.
  IF v_prev_user_id IS NOT NULL THEN
    UPDATE smbsec1.org_members
    SET is_it_executor = false
    WHERE org_id = p_org_id
      AND user_id = v_prev_user_id;
  END IF;

  UPDATE smbsec1.org_members
  SET is_it_executor = true
  WHERE org_id = p_org_id
    AND user_id = p_new_user_id;

  -- 7. Audit row — one, inside the same transaction.
  INSERT INTO smbsec1.audit_logs (
    org_id,
    actor_user_id,
    actor_email,
    event_type,
    details
  ) VALUES (
    p_org_id,
    p_actor_user_id,
    NULL,
    'it_executor_reassigned',
    jsonb_build_object(
      'previous_it_executor_user_id', v_prev_user_id,
      'new_it_executor_user_id', p_new_user_id,
      'active_assessment_id', v_active_id,
      'response_count_transferred', v_resp_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'response_count_transferred', v_resp_count,
    'previous_it_executor_user_id', v_prev_user_id,
    'new_it_executor_user_id', p_new_user_id,
    'active_assessment_id', v_active_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

REVOKE ALL ON FUNCTION smbsec1.reassign_it_executor(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION smbsec1.reassign_it_executor(uuid, uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION smbsec1.reassign_it_executor(uuid, uuid, uuid) TO service_role;
