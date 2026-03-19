-- Migration 016: PI 8 Iteration 3 — Campaign scheduling
-- New column on campaigns: scheduled_for (timestamptz)
-- New status value: 'scheduled' added to campaigns.status CHECK

-- Update the status CHECK constraint to include 'scheduled' and 'pending'
ALTER TABLE smbsec1.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE smbsec1.campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'pending', 'scheduled', 'sending', 'active', 'completed'));

-- Add scheduled_for column
ALTER TABLE smbsec1.campaigns
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
