-- F-012 PI 14 Iter 1 — persistent rate limit table + atomic check-and-increment RPC
-- and org-level AI guidance kill switch.
--
-- Idempotent: safe to re-run. Apply in Supabase SQL editor before deploying the
-- PI 14 Iter 1 code that relies on it (rateLimitPersistent() + /api/guidance).

-- ---------------------------------------------------------------------------
-- 1. smbsec1.rate_limits — persistent sliding-window buckets
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS smbsec1.rate_limits (
  bucket           text        NOT NULL,   -- e.g. "guidance:user:<uuid>", "api:user:<uuid>"
  window_start     timestamptz NOT NULL,   -- floor()-bucketed start of the current window
  count            int         NOT NULL DEFAULT 0,
  last_blocked_at  timestamptz,
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON smbsec1.rate_limits (window_start);

-- No RLS policies: only service-role touches this table.
ALTER TABLE smbsec1.rate_limits ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Atomic check-and-increment RPC
--    Returns remaining count. Positive/zero = allowed, negative = blocked
--    (absolute value is how many over the cap the caller is).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION smbsec1.check_and_increment_rate_limit(
  p_bucket         text,
  p_window_seconds int,
  p_max_count      int
) RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_start  timestamptz;
  v_current_count int;
BEGIN
  -- Floor "now" to the start of the current window for deterministic bucketing.
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO smbsec1.rate_limits (bucket, window_start, count)
  VALUES (p_bucket, v_window_start, 1)
  ON CONFLICT (bucket, window_start)
    DO UPDATE SET count = smbsec1.rate_limits.count + 1
  RETURNING count INTO v_current_count;

  IF v_current_count > p_max_count THEN
    UPDATE smbsec1.rate_limits
       SET last_blocked_at = now()
     WHERE bucket = p_bucket
       AND window_start = v_window_start;
    RETURN -(v_current_count - p_max_count);  -- negative => how many over the cap
  END IF;

  RETURN p_max_count - v_current_count;        -- non-negative => remaining
END;
$$;

REVOKE ALL ON FUNCTION smbsec1.check_and_increment_rate_limit(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION smbsec1.check_and_increment_rate_limit(text, int, int) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Cleanup helper (old windows >24h)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION smbsec1.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM smbsec1.rate_limits
   WHERE window_start < now() - interval '24 hours';
$$;

REVOKE ALL ON FUNCTION smbsec1.cleanup_old_rate_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION smbsec1.cleanup_old_rate_limits() TO service_role;

-- ---------------------------------------------------------------------------
-- 4. F-012 org-level AI guidance kill switch
-- ---------------------------------------------------------------------------

ALTER TABLE smbsec1.orgs
  ADD COLUMN IF NOT EXISTS ai_guidance_enabled boolean NOT NULL DEFAULT true;
