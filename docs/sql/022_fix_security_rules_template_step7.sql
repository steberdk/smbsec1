-- Migration 022: F-037 — Reword "1-page security rules" template, section 7
--
-- The seeded checklist item `human-1-page-rules` has a `steps.default` array
-- whose 7th entry reads:
--   "Keep it to one page. Print it for onboarding. Save a digital copy in the shared drive."
-- F-037 locked wording requires the note to mention printing physical copies
-- for use during IT attacks. Reword to:
--   "Keep it to one page. Print for onboarding and physical copies to use in case of IT attacks. Save a digital copy in the shared drive."
--
-- NOTE: Existing active assessments snapshot their items at start time, so they
-- retain the old wording. Only assessments started AFTER this migration runs
-- will pick up the new wording.
--
-- Idempotent: the UPDATE's WHERE clause requires the OLD wording to be present,
-- so re-running the migration after it has already been applied is a no-op.

UPDATE smbsec1.checklist_items
SET steps = jsonb_set(
  steps,
  '{default}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem = to_jsonb('Keep it to one page. Print it for onboarding. Save a digital copy in the shared drive.'::text)
          THEN to_jsonb('Keep it to one page. Print for onboarding and physical copies to use in case of IT attacks. Save a digital copy in the shared drive.'::text)
        ELSE elem
      END
    )
    FROM jsonb_array_elements(steps -> 'default') AS elem
  )
)
WHERE id = 'human-1-page-rules'
  AND (steps -> 'default') @> to_jsonb(
    ARRAY['Keep it to one page. Print it for onboarding. Save a digital copy in the shared drive.']
  );

-- Verification (optional — run manually):
-- SELECT id, steps -> 'default' FROM smbsec1.checklist_items WHERE id = 'human-1-page-rules';
