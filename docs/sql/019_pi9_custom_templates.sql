-- Migration 019: PI 9 Iteration 3 — Custom campaign templates
-- Adds org_id and custom flag to campaign_templates for org-specific templates

ALTER TABLE smbsec1.campaign_templates
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES smbsec1.orgs(id) ON DELETE CASCADE;

ALTER TABLE smbsec1.campaign_templates
  ADD COLUMN IF NOT EXISTS custom BOOLEAN NOT NULL DEFAULT false;

-- Index for org-specific template lookup
CREATE INDEX IF NOT EXISTS idx_campaign_templates_org_id
  ON smbsec1.campaign_templates(org_id)
  WHERE org_id IS NOT NULL;

-- RLS: allow org admins to insert/update/delete their own custom templates
DROP POLICY IF EXISTS "org admin can manage custom templates" ON smbsec1.campaign_templates;
CREATE POLICY "org admin can manage custom templates"
  ON smbsec1.campaign_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    custom = true
    AND org_id IS NOT NULL
    AND smbsec1.is_org_admin(org_id)
  );

DROP POLICY IF EXISTS "org admin can update custom templates" ON smbsec1.campaign_templates;
CREATE POLICY "org admin can update custom templates"
  ON smbsec1.campaign_templates FOR UPDATE
  TO authenticated
  USING (custom = true AND org_id IS NOT NULL AND smbsec1.is_org_admin(org_id))
  WITH CHECK (custom = true AND org_id IS NOT NULL AND smbsec1.is_org_admin(org_id));

DROP POLICY IF EXISTS "org admin can delete custom templates" ON smbsec1.campaign_templates;
CREATE POLICY "org admin can delete custom templates"
  ON smbsec1.campaign_templates FOR DELETE
  TO authenticated
  USING (custom = true AND org_id IS NOT NULL AND smbsec1.is_org_admin(org_id));
