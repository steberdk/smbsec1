-- Migration 013: Campaign feature (phishing simulations)
-- Tables: campaign_templates, campaigns, campaign_recipients
-- Columns added: orgs.campaign_credits, org_members.campaign_opt_out, assessment_responses.verification_status
-- RLS policies for all new tables

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1a. campaign_templates — reusable email templates
CREATE TABLE smbsec1.campaign_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('phishing_email', 'fake_invoice', 'credential_harvest', 'ceo_fraud')),
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  checklist_item_id TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1b. campaigns — instances sent to an org
CREATE TABLE smbsec1.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES smbsec1.orgs(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES smbsec1.campaign_templates(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'sending', 'active', 'completed')) DEFAULT 'draft',
  send_window_start TIMESTAMPTZ,
  send_window_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 1c. campaign_recipients — per-user tracking
CREATE TABLE smbsec1.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES smbsec1.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'clicked', 'reported', 'ignored')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_recipients_token ON smbsec1.campaign_recipients(token);
CREATE INDEX idx_campaign_recipients_campaign ON smbsec1.campaign_recipients(campaign_id);

-- ============================================================
-- 2. ALTER existing tables
-- ============================================================

ALTER TABLE smbsec1.orgs ADD COLUMN IF NOT EXISTS campaign_credits INT NOT NULL DEFAULT 1;

ALTER TABLE smbsec1.org_members ADD COLUMN IF NOT EXISTS campaign_opt_out BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE smbsec1.assessment_responses ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('verified', 'failed', NULL));

-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

-- 3a. campaign_templates — public read (active only)
ALTER TABLE smbsec1.campaign_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read active templates" ON smbsec1.campaign_templates;
CREATE POLICY "anyone can read active templates"
  ON smbsec1.campaign_templates FOR SELECT
  TO authenticated, anon
  USING (active = true);

-- 3b. campaigns — org members can CRUD
ALTER TABLE smbsec1.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members can read campaigns" ON smbsec1.campaigns;
CREATE POLICY "org members can read campaigns"
  ON smbsec1.campaigns FOR SELECT
  TO authenticated
  USING (smbsec1.is_org_member(org_id));

DROP POLICY IF EXISTS "org members can create campaigns" ON smbsec1.campaigns;
CREATE POLICY "org members can create campaigns"
  ON smbsec1.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    smbsec1.is_org_member(org_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "org members can update campaigns" ON smbsec1.campaigns;
CREATE POLICY "org members can update campaigns"
  ON smbsec1.campaigns FOR UPDATE
  TO authenticated
  USING (smbsec1.is_org_member(org_id))
  WITH CHECK (smbsec1.is_org_member(org_id));

DROP POLICY IF EXISTS "org members can delete campaigns" ON smbsec1.campaigns;
CREATE POLICY "org members can delete campaigns"
  ON smbsec1.campaigns FOR DELETE
  TO authenticated
  USING (smbsec1.is_org_member(org_id));

-- 3c. campaign_recipients — org members can read, org_admin can insert/update
ALTER TABLE smbsec1.campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members can read recipients" ON smbsec1.campaign_recipients;
CREATE POLICY "org members can read recipients"
  ON smbsec1.campaign_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM smbsec1.campaigns c
      WHERE c.id = campaign_id
        AND smbsec1.is_org_member(c.org_id)
    )
  );

DROP POLICY IF EXISTS "org admin can insert recipients" ON smbsec1.campaign_recipients;
CREATE POLICY "org admin can insert recipients"
  ON smbsec1.campaign_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM smbsec1.campaigns c
      WHERE c.id = campaign_id
        AND smbsec1.is_org_admin(c.org_id)
    )
  );

DROP POLICY IF EXISTS "org admin can update recipients" ON smbsec1.campaign_recipients;
CREATE POLICY "org admin can update recipients"
  ON smbsec1.campaign_recipients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM smbsec1.campaigns c
      WHERE c.id = campaign_id
        AND smbsec1.is_org_admin(c.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM smbsec1.campaigns c
      WHERE c.id = campaign_id
        AND smbsec1.is_org_admin(c.org_id)
    )
  );

-- ============================================================
-- 4. SEED DATA — 2 templates
-- ============================================================

INSERT INTO smbsec1.campaign_templates (id, title, type, subject, preview_text, body_html, body_text, checklist_item_id, difficulty, active)
VALUES (
  'phish-account-suspended',
  'Account Suspended Notice',
  'phishing_email',
  'Urgent: Your account has been suspended',
  'Action required — verify your identity to restore access',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="background: #d32f2f; padding: 20px; text-align: center;">\n<img src="https://cdn-icons-png.flaticon.com/512/732/732200.png" alt="Email" style="width: 40px; height: 40px; filter: brightness(0) invert(1);" />\n<h2 style="color: #fff; margin: 10px 0 0;">Account Security Alert</h2>\n</div>\n<div style="padding: 30px; background: #fff; border: 1px solid #e0e0e0;">\n<p>Dear User,</p>\n<p>We have detected unusual activity on your account and it has been <strong>temporarily suspended</strong> for your protection.</p>\n<p>If you do not verify your identity within <strong>24 hours</strong>, your account will be permanently deactivated and all data will be deleted.</p>\n<p style="text-align: center; margin: 30px 0;">\n<a href="{{tracking_url}}" style="background: #d32f2f; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify My Identity Now</a>\n</p>\n<p style="font-size: 12px; color: #888;">This is an automated message from your IT security team.<br/>Sent from: security-alerts@acc0unt-verify.net</p>\n</div>\n</div>',
  E'URGENT: Your account has been suspended\n\nDear User,\n\nWe have detected unusual activity on your account and it has been temporarily suspended for your protection.\n\nIf you do not verify your identity within 24 hours, your account will be permanently deactivated and all data will be deleted.\n\nVerify your identity: {{tracking_url}}\n\nThis is an automated message from your IT security team.\nSent from: security-alerts@acc0unt-verify.net',
  'aware-spot-phishing-email',
  'easy',
  true
),
(
  'bec-overdue-invoice',
  'Overdue Invoice Payment Request',
  'fake_invoice',
  'RE: Invoice #INV-2024-0847 - Payment Overdue',
  'Please process the attached invoice urgently to avoid late fees',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="padding: 20px; border-bottom: 3px solid #1a73e8;">\n<table style="width: 100%;"><tr>\n<td><strong style="font-size: 18px; color: #333;">GlobalTech Solutions Ltd.</strong><br/><span style="font-size: 12px; color: #666;">Accounting Department</span></td>\n<td style="text-align: right; font-size: 12px; color: #666;">Invoice Follow-up<br/>Ref: INV-2024-0847</td>\n</tr></table>\n</div>\n<div style="padding: 30px;">\n<p>Hi,</p>\n<p>I''m following up on invoice <strong>#INV-2024-0847</strong> which was due on the 15th. Our records show it remains unpaid.</p>\n<p>Could you please process this as soon as possible? We''d like to avoid adding the standard 3% late fee per our agreement.</p>\n<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">\n<tr style="background: #f5f5f5;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice</strong></td><td style="padding: 10px; border: 1px solid #ddd;">#INV-2024-0847</td></tr>\n<tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount</strong></td><td style="padding: 10px; border: 1px solid #ddd;">EUR 4,750.00</td></tr>\n<tr style="background: #f5f5f5;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Due Date</strong></td><td style="padding: 10px; border: 1px solid #ddd;">15 March 2026</td></tr>\n<tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Status</strong></td><td style="padding: 10px; border: 1px solid #ddd; color: #d32f2f;"><strong>OVERDUE</strong></td></tr>\n</table>\n<p>Please use the link below to view and pay the invoice securely:</p>\n<p style="text-align: center; margin: 25px 0;">\n<a href="{{tracking_url}}" style="background: #1a73e8; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 4px;">View Invoice & Pay</a>\n</p>\n<p>If you''ve already sent payment, please disregard this message.</p>\n<p>Best regards,<br/><strong>Maria Jensen</strong><br/>Accounts Receivable<br/>GlobalTech Solutions Ltd.<br/><span style="font-size: 12px; color: #888;">maria.jensen@gl0baltech-solutions.com</span></p>\n</div>\n</div>',
  E'RE: Invoice #INV-2024-0847 - Payment Overdue\n\nHi,\n\nI''m following up on invoice #INV-2024-0847 which was due on the 15th. Our records show it remains unpaid.\n\nCould you please process this as soon as possible? We''d like to avoid adding the standard 3% late fee per our agreement.\n\nInvoice: #INV-2024-0847\nAmount: EUR 4,750.00\nDue Date: 15 March 2026\nStatus: OVERDUE\n\nView and pay the invoice: {{tracking_url}}\n\nIf you''ve already sent payment, please disregard this message.\n\nBest regards,\nMaria Jensen\nAccounts Receivable\nGlobalTech Solutions Ltd.\nmaria.jensen@gl0baltech-solutions.com',
  'aware-fake-invoice',
  'medium',
  true
);
