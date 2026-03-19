-- Migration 017: PI 9 Iteration 1 — Knowledge test templates
-- Extends campaign_templates.type CHECK to include 'knowledge_test'
-- Adds 3 new knowledge test templates

-- ============================================================
-- 1. EXTEND TYPE CHECK CONSTRAINT
-- ============================================================

ALTER TABLE smbsec1.campaign_templates
  DROP CONSTRAINT IF EXISTS campaign_templates_type_check;

ALTER TABLE smbsec1.campaign_templates
  ADD CONSTRAINT campaign_templates_type_check
  CHECK (type IN ('phishing_email', 'fake_invoice', 'credential_harvest', 'ceo_fraud', 'knowledge_test'));

-- ============================================================
-- 2. NEW KNOWLEDGE TEST TEMPLATES
-- ============================================================

INSERT INTO smbsec1.campaign_templates (id, title, type, subject, preview_text, body_html, body_text, checklist_item_id, difficulty, active)
VALUES (
  'knowledge-password-sharing',
  'Shared Password Document',
  'knowledge_test',
  'Team Passwords - Updated Access List',
  'The shared password document has been updated with new credentials',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="padding: 20px; background: #f0f4f8; border-bottom: 2px solid #3b82f6;">\n<table style="width: 100%;"><tr>\n<td><strong style="font-size: 16px; color: #1e3a5f;">IT Department</strong><br/><span style="font-size: 12px; color: #64748b;">Internal Communication</span></td>\n</tr></table>\n</div>\n<div style="padding: 30px; background: #fff;">\n<p>Hi {{RECIPIENT_NAME}},</p>\n<p>The shared password document has been updated with new login credentials for our team tools and services.</p>\n<p>Please review the document and make sure you have access to all the accounts you need:</p>\n<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">\n<table style="width: 100%;"><tr>\n<td style="width: 40px; vertical-align: top;"><img src="https://cdn-icons-png.flaticon.com/512/337/337946.png" alt="DOC" style="width: 32px; height: 32px;" /></td>\n<td><strong style="color: #1e3a5f;">Team_Passwords_2026.xlsx</strong><br/><span style="font-size: 12px; color: #64748b;">Last updated: Today &middot; 12 accounts listed</span></td>\n</tr></table>\n</div>\n<p style="text-align: center; margin: 25px 0;">\n<a href="{{CLICK_URL}}" style="background: #3b82f6; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 500;">Open Password Document</a>\n</p>\n<p style="font-size: 13px; color: #64748b;">If you have any questions about the new passwords, reply to this email or contact IT.</p>\n<p style="font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px;">If this seems suspicious, <a href="{{REPORT_URL}}" style="color: #3b82f6;">report it to your IT team</a>.</p>\n</div>\n</div>',
  E'Team Passwords - Updated Access List\n\nHi {{RECIPIENT_NAME}},\n\nThe shared password document has been updated with new login credentials for our team tools and services.\n\nPlease review the document and make sure you have access to all the accounts you need:\n\nTeam_Passwords_2026.xlsx\nLast updated: Today - 12 accounts listed\n\nOpen Password Document: {{CLICK_URL}}\n\nIf you have any questions about the new passwords, reply to this email or contact IT.\n\nIf this seems suspicious, report it to your IT team: {{REPORT_URL}}',
  'acct-password-manager',
  'medium',
  true
),
(
  'knowledge-mfa-reset',
  'MFA Maintenance Notice',
  'knowledge_test',
  'Action Required: Multi-Factor Authentication Maintenance',
  'Your MFA settings need to be reconfigured after system maintenance',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="padding: 20px; background: #fef3c7; border-bottom: 2px solid #f59e0b;">\n<table style="width: 100%;"><tr>\n<td><strong style="font-size: 16px; color: #92400e;">System Administration</strong><br/><span style="font-size: 12px; color: #a16207;">Maintenance Notice</span></td>\n</tr></table>\n</div>\n<div style="padding: 30px; background: #fff;">\n<p>Dear {{RECIPIENT_NAME}},</p>\n<p>Due to scheduled system maintenance, <strong>multi-factor authentication (MFA)</strong> has been temporarily disabled on your account.</p>\n<p>To re-enable MFA and maintain the security of your account, please click the link below to access the security settings portal:</p>\n<p style="text-align: center; margin: 25px 0;">\n<a href="{{CLICK_URL}}" style="background: #f59e0b; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 500;">Re-Enable MFA Now</a>\n</p>\n<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0;">\n<p style="margin: 0; font-size: 13px; color: #92400e;"><strong>Important:</strong> If MFA is not re-enabled within 48 hours, your account will be restricted to read-only access for security purposes.</p>\n</div>\n<p style="font-size: 13px; color: #64748b;">This notification was sent by your IT security team.</p>\n<p style="font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px;">If you did not expect this message, <a href="{{REPORT_URL}}" style="color: #f59e0b;">report it as suspicious</a>.</p>\n</div>\n</div>',
  E'Action Required: Multi-Factor Authentication Maintenance\n\nDear {{RECIPIENT_NAME}},\n\nDue to scheduled system maintenance, multi-factor authentication (MFA) has been temporarily disabled on your account.\n\nTo re-enable MFA and maintain the security of your account, please visit:\n{{CLICK_URL}}\n\nImportant: If MFA is not re-enabled within 48 hours, your account will be restricted to read-only access for security purposes.\n\nThis notification was sent by your IT security team.\n\nIf you did not expect this message, report it as suspicious: {{REPORT_URL}}',
  'acct-enable-mfa-email',
  'medium',
  true
),
(
  'knowledge-macro-document',
  'Document Requires Macros',
  'knowledge_test',
  'RE: Q1 Budget Review - Please enable macros to view',
  'The attached spreadsheet requires macros to display correctly',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="padding: 20px; background: #ecfdf5; border-bottom: 2px solid #10b981;">\n<table style="width: 100%;"><tr>\n<td><strong style="font-size: 16px; color: #064e3b;">Finance Department</strong><br/><span style="font-size: 12px; color: #047857;">Monthly Report</span></td>\n</tr></table>\n</div>\n<div style="padding: 30px; background: #fff;">\n<p>Hi {{RECIPIENT_NAME}},</p>\n<p>Please find attached the Q1 budget review spreadsheet. The interactive charts and formulas require macros to be enabled.</p>\n<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">\n<table style="width: 100%;"><tr>\n<td style="width: 40px; vertical-align: top;"><img src="https://cdn-icons-png.flaticon.com/512/337/337946.png" alt="XLSX" style="width: 32px; height: 32px;" /></td>\n<td><strong style="color: #064e3b;">Q1_Budget_Review_2026.xlsm</strong><br/><span style="font-size: 12px; color: #64748b;">Macro-enabled workbook &middot; 1.8 MB</span></td>\n</tr></table>\n</div>\n<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">\n<p style="margin: 0; font-size: 13px; color: #92400e;"><strong>Note:</strong> When you open the document, click <strong>&ldquo;Enable Content&rdquo;</strong> or <strong>&ldquo;Enable Macros&rdquo;</strong> in the yellow security bar at the top of Excel to view the interactive charts.</p>\n</div>\n<p style="text-align: center; margin: 25px 0;">\n<a href="{{CLICK_URL}}" style="background: #10b981; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 500;">Download Document</a>\n</p>\n<p style="font-size: 13px; color: #64748b;">Let me know if you have trouble opening the file.</p>\n<p style="font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px;">Seems suspicious? <a href="{{REPORT_URL}}" style="color: #10b981;">Report to IT</a></p>\n</div>\n</div>',
  E'RE: Q1 Budget Review - Please enable macros to view\n\nHi {{RECIPIENT_NAME}},\n\nPlease find attached the Q1 budget review spreadsheet. The interactive charts and formulas require macros to be enabled.\n\nQ1_Budget_Review_2026.xlsm\nMacro-enabled workbook - 1.8 MB\n\nNote: When you open the document, click "Enable Content" or "Enable Macros" in the yellow security bar at the top of Excel to view the interactive charts.\n\nDownload Document: {{CLICK_URL}}\n\nLet me know if you have trouble opening the file.\n\nSeems suspicious? Report to IT: {{REPORT_URL}}',
  'email-disable-macros',
  'easy',
  true
)
ON CONFLICT (id) DO NOTHING;
