-- Migration 011: PI 2 Iteration 1 — Foundation & Polish
-- - Add display_name to org_members
-- - Add performance index on assessment_responses
-- - Create analytics views (3 success metrics + funnel stages)

-- 1. Display name capture at invite acceptance
ALTER TABLE public.org_members
  ADD COLUMN IF NOT EXISTS display_name text;

-- 2. Performance index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_assessment_responses_assessment_user
  ON public.assessment_responses (assessment_id, user_id);

-- 3. Analytics views — queryable in Supabase SQL editor without external service

-- View: org_completion_summary — per-org completion rate for active assessment
CREATE OR REPLACE VIEW public.v_org_completion AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  a.id AS assessment_id,
  a.status AS assessment_status,
  COUNT(DISTINCT om.user_id) AS member_count,
  COUNT(DISTINCT ai.id) AS item_count,
  COUNT(ar.assessment_item_id) AS response_count,
  COUNT(ar.assessment_item_id) FILTER (WHERE ar.status = 'done') AS done_count,
  COUNT(ar.assessment_item_id) FILTER (WHERE ar.status = 'unsure') AS unsure_count,
  COUNT(ar.assessment_item_id) FILTER (WHERE ar.status = 'skipped') AS skipped_count,
  CASE
    WHEN COUNT(DISTINCT ai.id) * COUNT(DISTINCT om.user_id) = 0 THEN 0
    ELSE ROUND(
      100.0 * COUNT(ar.assessment_item_id)
      / (COUNT(DISTINCT ai.id) * COUNT(DISTINCT om.user_id)),
      1
    )
  END AS completion_percent
FROM public.orgs o
JOIN public.assessments a ON a.org_id = o.id
JOIN public.org_members om ON om.org_id = o.id
JOIN public.assessment_items ai ON ai.assessment_id = a.id
LEFT JOIN public.assessment_responses ar
  ON ar.assessment_id = a.id
  AND ar.assessment_item_id = ai.id
  AND ar.user_id = om.user_id
GROUP BY o.id, o.name, a.id, a.status;

-- View: cadence tracker — days since last completed assessment per org
CREATE OR REPLACE VIEW public.v_cadence AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  MAX(a.completed_at) AS last_completed_at,
  EXTRACT(DAY FROM now() - MAX(a.completed_at))::int AS days_since_completion,
  CASE
    WHEN MAX(a.completed_at) IS NULL THEN 'never'
    WHEN EXTRACT(DAY FROM now() - MAX(a.completed_at)) >= 90 THEN 'red'
    WHEN EXTRACT(DAY FROM now() - MAX(a.completed_at)) >= 76 THEN 'amber'
    ELSE 'green'
  END AS cadence_status
FROM public.orgs o
LEFT JOIN public.assessments a
  ON a.org_id = o.id AND a.status = 'completed'
GROUP BY o.id, o.name;

-- View: onboarding funnel — measures drop-off across key stages
CREATE OR REPLACE VIEW public.v_onboarding_funnel AS
SELECT
  'signed_up' AS stage,
  1 AS stage_order,
  COUNT(DISTINCT o.created_by) AS user_count
FROM public.orgs o
UNION ALL
SELECT
  'created_org' AS stage,
  2 AS stage_order,
  COUNT(DISTINCT o.id) AS user_count
FROM public.orgs o
UNION ALL
SELECT
  'started_assessment' AS stage,
  3 AS stage_order,
  COUNT(DISTINCT a.org_id) AS user_count
FROM public.assessments a
UNION ALL
SELECT
  'first_response' AS stage,
  4 AS stage_order,
  COUNT(DISTINCT ar.user_id) AS user_count
FROM public.assessment_responses ar
UNION ALL
SELECT
  'sent_invite' AS stage,
  5 AS stage_order,
  COUNT(DISTINCT i.org_id) AS user_count
FROM public.invites i
ORDER BY stage_order;
