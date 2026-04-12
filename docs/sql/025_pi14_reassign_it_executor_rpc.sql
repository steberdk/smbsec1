-- F-041 PI 14 Iter 3 — Atomic IT Executor reassignment.
--
-- Implements smbsec1.reassign_it_executor(p_org_id, p_new_user_id, p_actor_user_id)
-- as a SECURITY DEFINER function inside a single transaction. Unsets the old
-- executor FIRST (partial unique index ux_one_it_executor_per_org requires this
-- order), sets the new one, writes ONE audit row, and returns the count of
-- transferred IT Baseline responses. See F-041 locked AC-1 in
-- docs/product/pi14/product_team_consensus.md.
--
-- Idempotent: safe to re-run. Apply in Supabase SQL editor before deploying the
-- PI 14 Iter 3 code that relies on it (PUT /api/orgs/executor).

-- ---------------------------------------------------------------------------
-- 1. smbsec1.reassign_it_executor RPC
-- ---------------------------------------------------------------------------

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
  v_new_in_org       boolean := false;
  v_prev_user_id     uuid;
  v_active_id        uuid;
  v_resp_count       int := 0;
BEGIN
  -- 1. Verify new assignee is a member of this org.
  --    Note: `org_members` only contains ACCEPTED members — the invite flow
  --    inserts the row on accept, so an existing row is proof of acceptance.
  --    Pending invitees live in `smbsec1.invites` (where accepted_at IS NULL)
  --    and do NOT appear in org_members, so they are naturally rejected here.
  SELECT true
    INTO v_new_in_org
  FROM smbsec1.org_members
  WHERE org_id = p_org_id
    AND user_id = p_new_user_id
  LIMIT 1;

  IF NOT v_new_in_org THEN
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

  -- 5. Count existing IT Baseline responses authored by the previous IT Exec
  --    under the active assessment. Zero if no previous or no active assessment.
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
  --    Ordering is CRITICAL — the partial unique index
  --    `ux_one_it_executor_per_org` would reject the inverse order.
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
