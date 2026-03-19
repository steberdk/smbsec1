-- Migration 015: PI 8 Iteration 2 — Billing columns + campaign customisation
-- New columns on orgs: subscription_status, stripe_customer_id, stripe_subscription_id
-- New column on campaigns: customisation (jsonb)

-- ============================================================
-- 1. BILLING COLUMNS ON ORGS
-- ============================================================

ALTER TABLE smbsec1.orgs
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_status IN ('free', 'active', 'cancelled'));

ALTER TABLE smbsec1.orgs
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE smbsec1.orgs
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- ============================================================
-- 2. CAMPAIGN CUSTOMISATION
-- ============================================================

ALTER TABLE smbsec1.campaigns
  ADD COLUMN IF NOT EXISTS customisation JSONB DEFAULT '{}';
