-- 010_responses_updated_at.sql
--
-- Add updated_at column to assessment_responses for analytics/diagnostics.
-- High diagnostic value: tells you when a user last interacted with a checklist item.
--
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE public.assessment_responses
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.assessment_responses.updated_at IS
  'Tracks when a response was last changed. Used for analytics (time-to-first-response, engagement patterns).';
