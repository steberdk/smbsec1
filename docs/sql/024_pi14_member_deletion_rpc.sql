-- F-033 PI 14 Iter 3 — GDPR member deletion with full cascade.
--
-- Implements smbsec1.delete_member_with_data(p_org_id, p_target_email, p_actor_user_id)
-- as a SECURITY DEFINER function inside a single transaction. Hard-deletes the
-- target's data in FK-safe order, anonymises residual audit rows, and appends a
-- single `member_removed` audit row with SHA-256 hashed identifiers (NO plain PII
-- in audit_logs). See docs/product/pi14/product_team_consensus.md "Refined ACs"
-- F-033 AC-7 and docs/product/pi14/round2_security_expert.md §2/§8 for rationale.
--
-- Idempotent: safe to re-run. Apply in Supabase SQL editor before deploying the
-- PI 14 Iter 3 code that relies on it (DELETE /api/orgs/members).

-- ---------------------------------------------------------------------------
-- 0. Required extension — pgcrypto for digest()
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. smbsec1.delete_member_with_data RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION smbsec1.delete_member_with_data(
  p_org_id        uuid,
  p_target_email  text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = smbsec1, public
AS $$
DECLARE
  v_target_email_lc text := lower(trim(p_target_email));
  v_target_user_id  uuid;
  v_was_it_exec     boolean := false;
  v_owner_count     int;
  v_email_sha       text;
  v_user_sha        text;
  v_resp_count      int := 0;
  v_camp_count      int := 0;
  v_inv_count       int := 0;
  v_assessment_ids  uuid[];
  v_item_ids        uuid[];
BEGIN
  -- 1. Look up target member (joined OR pending invite path).
  SELECT user_id, COALESCE(is_it_executor, false)
    INTO v_target_user_id, v_was_it_exec
  FROM smbsec1.org_members
  WHERE org_id = p_org_id
    AND lower(email) = v_target_email_lc
  LIMIT 1;

  -- 2. Reject self-removal via this RPC.
  IF v_target_user_id IS NOT NULL AND v_target_user_id = p_actor_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'cannot_remove_self'
    );
  END IF;

  -- 3. Reject removing the only owner.
  IF v_target_user_id IS NOT NULL THEN
    SELECT count(*) INTO v_owner_count
    FROM smbsec1.org_members
    WHERE org_id = p_org_id AND role = 'org_admin';

    IF v_owner_count <= 1 THEN
      -- Only block if the target is actually an owner.
      IF EXISTS (
        SELECT 1 FROM smbsec1.org_members
        WHERE org_id = p_org_id
          AND user_id = v_target_user_id
          AND role = 'org_admin'
      ) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'cannot_remove_last_owner'
        );
      END IF;
    END IF;
  END IF;

  -- 4. Compute hashes.
  v_email_sha := encode(digest(v_target_email_lc, 'sha256'), 'hex');
  IF v_target_user_id IS NOT NULL THEN
    v_user_sha := encode(digest(v_target_user_id::text, 'sha256'), 'hex');
  ELSE
    v_user_sha := NULL;
  END IF;

  -- 5. Cascade deletes inside the implicit transaction.
  --    Errors raise → PostgreSQL rolls back all prior writes.

  -- 5a. assessment_responses: target user's rows scoped to THIS org's assessments.
  IF v_target_user_id IS NOT NULL THEN
    SELECT array_agg(id) INTO v_assessment_ids
    FROM smbsec1.assessments
    WHERE org_id = p_org_id;

    IF v_assessment_ids IS NOT NULL AND array_length(v_assessment_ids, 1) > 0 THEN
      SELECT array_agg(id) INTO v_item_ids
      FROM smbsec1.assessment_items
      WHERE assessment_id = ANY(v_assessment_ids);

      IF v_item_ids IS NOT NULL AND array_length(v_item_ids, 1) > 0 THEN
        WITH del AS (
          DELETE FROM smbsec1.assessment_responses
          WHERE user_id = v_target_user_id
            AND assessment_item_id = ANY(v_item_ids)
          RETURNING 1
        )
        SELECT count(*) INTO v_resp_count FROM del;
      END IF;
    END IF;
  END IF;

  -- 5b. campaign_recipients: target's rows scoped to THIS org's campaigns.
  WITH del AS (
    DELETE FROM smbsec1.campaign_recipients
    WHERE campaign_id IN (
        SELECT id FROM smbsec1.campaigns WHERE org_id = p_org_id
      )
      AND (
        (v_target_user_id IS NOT NULL AND user_id = v_target_user_id)
        OR lower(email) = v_target_email_lc
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_camp_count FROM del;

  -- 5c. invites: pending/expired invites for this email in this org.
  WITH del AS (
    DELETE FROM smbsec1.invites
    WHERE org_id = p_org_id
      AND lower(email) = v_target_email_lc
    RETURNING 1
  )
  SELECT count(*) INTO v_inv_count FROM del;

  -- 5d. Legacy user_checklists (per-user, not per-org). Soft cascade.
  IF v_target_user_id IS NOT NULL THEN
    BEGIN
      DELETE FROM smbsec1.user_checklists
      WHERE user_id = v_target_user_id;
    EXCEPTION
      WHEN undefined_table THEN
        NULL; -- legacy table absent — ignore
      WHEN OTHERS THEN
        NULL; -- never block deletion on legacy table
    END;
  END IF;

  -- 5e. org_members row (frees is_it_executor slot automatically).
  IF v_target_user_id IS NOT NULL THEN
    DELETE FROM smbsec1.org_members
    WHERE org_id = p_org_id AND user_id = v_target_user_id;
  END IF;

  -- 6. Anonymise residual audit_logs rows whose actor was the removed user.
  --    Strip PII payload keys via `details - 'key'` (JSONB minus operator).
  IF v_target_user_id IS NOT NULL THEN
    UPDATE smbsec1.audit_logs
    SET actor_user_id = NULL,
        actor_email = NULL,
        details = COALESCE(details, '{}'::jsonb)
                  - 'email'
                  - 'removed_email'
                  - 'invited_email'
    WHERE org_id = p_org_id
      AND (
        actor_user_id = v_target_user_id
        OR lower(COALESCE(actor_email, '')) = v_target_email_lc
      );
  ELSE
    -- Pending invite: still strip any email matches in actor_email column.
    UPDATE smbsec1.audit_logs
    SET actor_email = NULL,
        details = COALESCE(details, '{}'::jsonb)
                  - 'email'
                  - 'removed_email'
                  - 'invited_email'
    WHERE org_id = p_org_id
      AND lower(COALESCE(actor_email, '')) = v_target_email_lc;
  END IF;

  -- 7. Insert ONE new member_removed audit row (hashed identifiers only).
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
    'member_removed',
    jsonb_build_object(
      'removed_email_sha256', v_email_sha,
      'removed_user_id_sha256', v_user_sha,
      'was_it_executor', v_was_it_exec,
      'responses_deleted', v_resp_count,
      'campaigns_deleted', v_camp_count,
      'invites_deleted', v_inv_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'responses_deleted', v_resp_count,
    'campaigns_deleted', v_camp_count,
    'invites_deleted', v_inv_count,
    'was_it_executor', v_was_it_exec,
    'target_was_member', v_target_user_id IS NOT NULL
  );
EXCEPTION WHEN OTHERS THEN
  -- Implicit rollback: any RAISE above this point rolls back all writes.
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

REVOKE ALL ON FUNCTION smbsec1.delete_member_with_data(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION smbsec1.delete_member_with_data(uuid, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION smbsec1.delete_member_with_data(uuid, text, uuid) TO service_role;
