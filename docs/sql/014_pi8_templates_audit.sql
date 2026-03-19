-- Migration 014: PI 8 Iteration 1 — New campaign templates + audit_logs table
-- New templates: credential_harvest, ceo_fraud
-- New table: audit_logs (survives org CASCADE delete)

-- ============================================================
-- 1. AUDIT LOGS TABLE (no FK to orgs — survives CASCADE delete)
-- ============================================================

CREATE TABLE IF NOT EXISTS smbsec1.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,         -- e.g. 'org_deleted', 'member_removed'
  org_id UUID,                      -- reference only, no FK constraint
  org_name TEXT,
  actor_user_id UUID,               -- who performed the action
  actor_email TEXT,
  details JSONB DEFAULT '{}',       -- additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_event_type ON smbsec1.audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON smbsec1.audit_logs(created_at DESC);

-- RLS: no user-facing read access; only service-role can insert/read
ALTER TABLE smbsec1.audit_logs ENABLE ROW LEVEL SECURITY;

-- No policies = nobody can read/write via RLS. Service-role bypasses RLS.

-- ============================================================
-- 2. NEW CAMPAIGN TEMPLATES
-- ============================================================

INSERT INTO smbsec1.campaign_templates (id, title, type, subject, preview_text, body_html, body_text, checklist_item_id, difficulty, active)
VALUES (
  'cred-shared-document',
  'Shared Document Access',
  'credential_harvest',
  'Document shared with you: Q1 Financial Review.xlsx',
  'Click to view the shared document in your browser',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="padding: 20px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0;">\n<table style="width: 100%;"><tr>\n<td><img src="https://cdn-icons-png.flaticon.com/512/281/281764.png" alt="Docs" style="width: 32px; height: 32px; vertical-align: middle;" /> <strong style="font-size: 16px; color: #202124; vertical-align: middle;">Document Sharing</strong></td>\n</tr></table>\n</div>\n<div style="padding: 30px; background: #fff;">\n<p style="color: #202124;">Hi {{RECIPIENT_NAME}},</p>\n<p style="color: #202124;">A document has been shared with you:</p>\n<div style="background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 20px 0;">\n<table style="width: 100%;"><tr>\n<td style="width: 40px; vertical-align: top;"><img src="https://cdn-icons-png.flaticon.com/512/337/337946.png" alt="XLSX" style="width: 32px; height: 32px;" /></td>\n<td><strong style="color: #202124;">Q1 Financial Review.xlsx</strong><br/><span style="font-size: 12px; color: #5f6368;">Shared by Finance Department &middot; 2.4 MB</span></td>\n</tr></table>\n</div>\n<p style="text-align: center; margin: 25px 0;">\n<a href="{{CLICK_URL}}" style="background: #1a73e8; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 500;">Open document</a>\n</p>\n<p style="font-size: 12px; color: #5f6368;">You may need to sign in to view this document. If you didn''t expect this file, <a href="{{REPORT_URL}}" style="color: #1a73e8;">report it as suspicious</a>.</p>\n<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />\n<p style="font-size: 11px; color: #999;">This notification was sent by your organisation''s document management system.<br/>Cloud Document Services &middot; docs-notification@cl0ud-documents.net</p>\n</div>\n</div>',
  E'Document shared with you: Q1 Financial Review.xlsx\n\nHi {{RECIPIENT_NAME}},\n\nA document has been shared with you:\n\nQ1 Financial Review.xlsx\nShared by Finance Department - 2.4 MB\n\nOpen document: {{CLICK_URL}}\n\nYou may need to sign in to view this document.\nIf you didn''t expect this file, report it as suspicious: {{REPORT_URL}}\n\nCloud Document Services\ndocs-notification@cl0ud-documents.net',
  'aware-fake-login-page',
  'hard',
  true
),
(
  'ceo-urgent-payment',
  'Urgent Payment Request from Management',
  'ceo_fraud',
  'Urgent — need your help with something confidential',
  'Can you handle a quick payment for me today?',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="padding: 30px; background: #fff;">\n<p>Hi {{RECIPIENT_NAME}},</p>\n<p>Are you at your desk? I need your help with something urgent and confidential.</p>\n<p>We need to process a payment to a new supplier today before 5 PM. I''m in meetings all day and can''t do it myself. The invoice is for <strong>EUR 3,200.00</strong> and needs to go out immediately to avoid a penalty.</p>\n<p>I''ve attached the payment details here — please review and process as soon as possible:</p>\n<p style="text-align: center; margin: 25px 0;">\n<a href="{{CLICK_URL}}" style="background: #2d2d2d; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 4px; font-weight: 500;">View Payment Details</a>\n</p>\n<p>Please keep this between us for now — I''ll explain when I''m out of my meeting.</p>\n<p>Thanks,<br/><strong>{{SENDER_NAME}}</strong></p>\n<p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">Sent from mobile<br/><em>If this request seems unusual, <a href="{{REPORT_URL}}" style="color: #666;">report it to your IT team</a>.</em></p>\n</div>\n</div>',
  E'Hi {{RECIPIENT_NAME}},\n\nAre you at your desk? I need your help with something urgent and confidential.\n\nWe need to process a payment to a new supplier today before 5 PM. I''m in meetings all day and can''t do it myself. The invoice is for EUR 3,200.00 and needs to go out immediately to avoid a penalty.\n\nView payment details: {{CLICK_URL}}\n\nPlease keep this between us for now - I''ll explain when I''m out of my meeting.\n\nThanks,\n{{SENDER_NAME}}\n\nSent from mobile\nIf this request seems unusual, report it to your IT team: {{REPORT_URL}}',
  'aware-fake-invoice',
  'hard',
  true
)
ON CONFLICT (id) DO NOTHING;
