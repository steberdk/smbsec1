-- F-012 PI 15 Iter 1 — AI guidance output filter flag log.
--
-- Stores hashed (not plain) request/response fingerprints for any response
-- the output filter rejected or flagged, so abuse forensics can be done
-- without ever persisting user-generated content or AI-generated content.
--
-- Idempotent: safe to re-run. Apply in Supabase SQL editor before deploying
-- the PI 15 Iter 1 code that relies on it (lib/ai/outputFilter.ts +
-- /api/guidance/chat).

-- ---------------------------------------------------------------------------
-- 1. smbsec1.ai_guidance_flags — one row per flagged or rejected response
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS smbsec1.ai_guidance_flags (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  user_id         uuid,
  org_id          uuid,
  bucket          text,
  request_sha256  text,
  response_sha256 text,
  reason          text        NOT NULL,
  severity        text        NOT NULL CHECK (severity IN ('reject', 'flag'))
);

CREATE INDEX IF NOT EXISTS idx_ai_guidance_flags_created_at
  ON smbsec1.ai_guidance_flags (created_at);

CREATE INDEX IF NOT EXISTS idx_ai_guidance_flags_user_id
  ON smbsec1.ai_guidance_flags (user_id);

-- No RLS policies: only service-role writes. Authenticated users MUST NOT
-- be able to read this table — it would leak "other org got flagged for
-- prompt injection" signals to an attacker probing the filter.
ALTER TABLE smbsec1.ai_guidance_flags ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON smbsec1.ai_guidance_flags FROM PUBLIC;
REVOKE ALL ON smbsec1.ai_guidance_flags FROM authenticated;
GRANT INSERT, SELECT ON smbsec1.ai_guidance_flags TO service_role;

-- ---------------------------------------------------------------------------
-- 2. 90-day cleanup helper (run via manual RPC or pg_cron once available)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION smbsec1.cleanup_ai_guidance_flags()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM smbsec1.ai_guidance_flags
   WHERE created_at < now() - interval '90 days';
$$;

REVOKE ALL ON FUNCTION smbsec1.cleanup_ai_guidance_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION smbsec1.cleanup_ai_guidance_flags() TO service_role;
