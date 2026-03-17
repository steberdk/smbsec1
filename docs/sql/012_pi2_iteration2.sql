-- Migration 012: PI 2 Iteration 2 — Content & Output
-- - 5 new checklist items
-- - Modify 3 existing items (macros, USB→downloads, security rules template)
-- - Platform-specific steps for 3 existing items (admin accounts, offboarding, phish reporting)

-- ============================================================
-- 1. NEW ITEMS (5)
-- ============================================================

-- 1a. Disk encryption (BitLocker / FileVault)
INSERT INTO public.checklist_items (
  id, group_id, track, title, outcome, why_it_matters,
  steps, time_estimate, impact, effort, tags, order_index, active
) VALUES (
  'access-disk-encryption',
  'access',
  'it_baseline',
  'Enable full-disk encryption on all company devices',
  'Every laptop and desktop has BitLocker (Windows) or FileVault (Mac) turned on, so a stolen device does not expose company data.',
  'A lost or stolen laptop is one of the most common data breaches for SMBs. Without disk encryption, anyone who finds the device can read every file on it — client data, credentials, email archives. Full-disk encryption makes the data unreadable without the login password.',
  '{"default": ["Identify all company laptops and desktops", "Windows: Open Settings → Privacy & Security → Device encryption (or search BitLocker). Turn it on and save the recovery key to a secure location.", "Mac: Open System Settings → Privacy & Security → FileVault. Turn it on and save the recovery key.", "Document which devices are encrypted and where recovery keys are stored", "Add encryption verification to your onboarding checklist for new devices"], "microsoft_365": ["Open the Microsoft Intune admin center (endpoint.microsoft.com)", "Go to Devices → Configuration profiles → Create profile", "Select Windows 10 and later → Endpoint protection → BitLocker", "Enable ''Require device encryption'' and configure recovery key escrow to Azure AD", "Assign the policy to all device groups"], "google_workspace": ["Open Google Admin Console (admin.google.com)", "Go to Devices → Chrome → Settings → Device settings", "For company-managed Chromebooks, encryption is enabled by default", "For Windows/Mac devices using Google endpoint management, enforce encryption via third-party MDM or manual setup", "Verify encryption status in Devices → Endpoints"]}',
  '15–30 minutes per device',
  'high',
  'hour',
  ARRAY['encryption', 'devices'],
  3,
  true
);

-- 1b. SaaS account inventory
INSERT INTO public.checklist_items (
  id, group_id, track, title, outcome, why_it_matters,
  steps, time_estimate, impact, effort, tags, order_index, active
) VALUES (
  'acct-saas-inventory',
  'accounts',
  'it_baseline',
  'Create a list of all SaaS accounts your company uses',
  'You have a single document listing every cloud service the company pays for or uses, who has access, and whether MFA is enabled.',
  'Most SMBs use 20–50 SaaS tools but can only name a fraction of them. Forgotten accounts with active credentials are a common breach path — especially when employees leave. You cannot secure what you do not know exists.',
  '{"default": ["Check your company credit card and bank statements for recurring software charges", "Ask each team member to list the cloud services they use for work (e.g. Slack, Trello, Dropbox, Xero)", "Check browser saved passwords and password manager vaults for business accounts", "Create a spreadsheet with columns: Service name, URL, Owner, Users, MFA enabled, Last reviewed", "Review the list quarterly and remove accounts that are no longer needed"]}',
  '1–2 hours',
  'medium',
  'hour',
  ARRAY['inventory', 'saas'],
  5,
  true
);

-- 1c. MFA beyond email (awareness track — user action)
INSERT INTO public.checklist_items (
  id, group_id, track, title, outcome, why_it_matters,
  steps, time_estimate, impact, effort, tags, order_index, active
) VALUES (
  'aware-mfa-everywhere',
  'awareness',
  'awareness',
  'Turn on two-step login for all work tools, not just email',
  'You have MFA enabled on every work service that supports it — accounting, cloud storage, project management, HR systems.',
  'Email MFA is critical, but attackers also target accounting software, file sharing, and CRM systems. A compromised Xero or QuickBooks account can redirect payments. A breached Dropbox shares your entire file library. MFA on every tool closes these doors.',
  '{"default": ["List all work tools you log into (accounting, file storage, project management, HR, CRM)", "For each tool, go to Account Settings → Security or Two-Factor Authentication", "Enable MFA using an authenticator app (not SMS where possible)", "Save backup/recovery codes in your password manager", "If a tool does not support MFA, flag it to your manager or IT lead as a risk"]}',
  '5–10 minutes per service',
  'high',
  'hour',
  ARRAY['mfa'],
  7,
  true
);

-- 1d. DNS filtering
INSERT INTO public.checklist_items (
  id, group_id, track, title, outcome, why_it_matters,
  steps, time_estimate, impact, effort, tags, order_index, active
) VALUES (
  'net-dns-filtering',
  'network',
  'it_baseline',
  'Set up DNS filtering to block malicious websites',
  'Your network uses a DNS resolver that blocks known malicious domains, preventing devices from connecting to phishing sites, malware command servers, and ad trackers.',
  'DNS filtering is one of the highest-value, lowest-effort security controls available. It blocks connections to known-bad domains before any data is exchanged — stopping phishing pages, malware downloads, and command-and-control traffic at the network level. Free services like Cloudflare Gateway or Quad9 make this trivial.',
  '{"default": ["Choose a protective DNS provider: Cloudflare Gateway (1.1.1.2), Quad9 (9.9.9.9), or OpenDNS (208.67.222.222)", "Log in to your router admin panel (usually 192.168.1.1 or 192.168.0.1)", "Find the DNS settings (often under WAN, Internet, or DHCP settings)", "Replace the existing DNS servers with your chosen provider", "Test by visiting a known test page (e.g. https://malware.testcategory.com for Cloudflare)", "For remote workers: set DNS on individual devices or use the provider''s agent app"]}',
  '10–15 minutes',
  'high',
  'minutes',
  ARRAY['dns', 'network'],
  3,
  true
);

-- 1e. Incident response plan
INSERT INTO public.checklist_items (
  id, group_id, track, title, outcome, why_it_matters,
  steps, time_estimate, impact, effort, tags, order_index, active
) VALUES (
  'human-incident-response',
  'human',
  'it_baseline',
  'Write a simple incident response plan',
  'You have a 1-page document that tells everyone what to do in the first 60 minutes of a security incident — who to call, what to disconnect, and how to preserve evidence.',
  'When a breach happens, panic and confusion cause more damage than the attack itself. People waste hours wondering who to call or accidentally destroy evidence. A simple plan — even a single page pinned to the wall — cuts response time dramatically and limits damage.',
  '{"default": ["Create a document titled ''What to do if we get hacked''", "List emergency contacts: IT lead, manager, insurance provider, external IT support", "Write step 1: Disconnect the affected device from Wi-Fi/ethernet (do NOT turn it off)", "Write step 2: Call [IT lead name] immediately, then email [manager name]", "Write step 3: Do not try to fix it yourself — preserve the device as-is for investigation", "Write step 4: Change passwords for any accounts you think were affected, from a different device", "Print it and pin it somewhere visible. Save a digital copy in a shared drive.", "Review and update the plan every 6 months or when team members change"]}',
  '30–60 minutes',
  'high',
  'hour',
  ARRAY['process', 'incident-response'],
  3,
  true
);

-- ============================================================
-- 2. MODIFY 3 EXISTING ITEMS
-- ============================================================

-- 2a. Macros: update framing for post-2022 (Office 2022+ blocks by default)
UPDATE public.checklist_items
SET
  title = 'Verify Office macros from the internet are blocked',
  outcome = 'Office macros downloaded from email or the web are blocked by default, and any policy overrides have been reviewed.',
  why_it_matters = 'Since 2022, Microsoft Office blocks macros from internet-downloaded files by default — a major improvement. But some organisations override this setting to support legacy workflows, re-opening a critical attack path. This check verifies the default is in place and no one has weakened it.',
  steps = '{"default": ["Open any Office app (Word, Excel) → File → Options → Trust Center → Trust Center Settings → Macro Settings", "Verify that ''Disable VBA macros with notification'' or ''Disable all macros'' is selected", "Check Group Policy (if applicable): User Configuration → Administrative Templates → Microsoft Office → Security → VBA Macro Notification Settings", "If macros are enabled for specific workflows, document why and restrict to signed macros only", "For Microsoft 365 admin: review macro policies in the Microsoft 365 compliance center"], "microsoft_365": ["Open the Microsoft 365 admin center (admin.microsoft.com)", "Go to Settings → Org settings → Security & privacy → Office macro policies", "Verify ''Block macros from running in Office files from the internet'' is enabled", "Check Cloud Policy in endpoint.microsoft.com → Apps → Policies for Office apps", "If any overrides exist, document the business reason and set expiry dates"]}'
WHERE id = 'email-disable-macros';

-- 2b. USB → broaden to downloads and removable media
UPDATE public.checklist_items
SET
  title = 'Think before opening files from USB drives, downloads, or messaging apps',
  outcome = 'You pause and verify before opening any file that arrived outside your normal workflow — USB drives, direct downloads, WhatsApp/Teams files, or email attachments from unexpected senders.',
  why_it_matters = 'Attackers deliver malware through any channel you trust: USB drives left in car parks, files shared via messaging apps, browser downloads disguised as invoices. The common thread is a file arriving outside your normal workflow. Pausing to verify is the single most effective habit against social engineering.',
  steps = '{"default": ["Never plug in a USB drive you found or received unexpectedly", "Before opening any downloaded file, check: Did I request this? Does the sender/source make sense?", "Be cautious with files shared via WhatsApp, Teams, or Slack — especially from external contacts", "If a file asks you to ''enable editing'' or ''enable macros'', stop and check with IT", "Use your browser''s built-in download scanner and keep it enabled", "When in doubt, ask your IT lead or manager before opening the file"]}'
WHERE id = 'aware-usb-drives';

-- 2c. Security rules doc → add template structure
UPDATE public.checklist_items
SET
  title = 'Write a 1-page security rules doc (use our template)',
  outcome = 'You have a short, plain-English document that every employee reads on their first day, covering passwords, phishing, device security, and who to contact.',
  steps = '{"default": ["Start with this template structure:", "Section 1 — Passwords: Use a password manager. Never reuse passwords. Enable MFA everywhere.", "Section 2 — Email: Do not click links in unexpected emails. Report anything suspicious to [IT lead].", "Section 3 — Devices: Lock your screen when away. Do not install unapproved software. Keep updates on.", "Section 4 — If something goes wrong: Call [IT lead name] immediately. Do not try to fix it yourself.", "Section 5 — Contacts: IT Lead: [name/email]. Manager: [name/email]. Emergency: [phone].", "Keep it to one page. Print it for onboarding. Save a digital copy in the shared drive.", "Review every 6 months and update contact details when people change roles."]}'
WHERE id = 'human-1-page-rules';

-- ============================================================
-- 3. PLATFORM-SPECIFIC STEPS FOR 3 EXISTING ITEMS
-- ============================================================

-- 3a. Admin accounts: GWS + M365 paths
UPDATE public.checklist_items
SET steps = '{"default": ["Create a separate admin account (e.g. admin-yourname@company.com) that you only use for admin tasks", "Log out of the admin account after each admin session", "Never use the admin account for daily email, browsing, or document editing", "Enable MFA on the admin account with a hardware key or authenticator app", "Review who has admin access quarterly and remove anyone who no longer needs it"], "google_workspace": ["Go to admin.google.com → Directory → Users", "Create a new user with an admin-prefixed email (e.g. admin-yourname@company.com)", "Assign the Super Admin or specific admin role to this new account", "Remove admin privileges from your daily-use account", "Enable 2-Step Verification on the admin account: admin.google.com → Security → 2-Step Verification → Enforce"], "microsoft_365": ["Go to admin.microsoft.com → Users → Active users → Add a user", "Create a user with an admin-prefixed email (e.g. admin-yourname@company.com)", "Assign the Global Administrator or specific admin role", "Remove admin roles from your daily-use account under Users → Active users → [your name] → Manage roles", "Enable MFA: Go to Security → Identity → MFA → Per-user MFA, and require it for the admin account"]}'
WHERE id = 'acct-separate-admin-accounts';

-- 3b. Offboarding: GWS + M365 paths
UPDATE public.checklist_items
SET steps = '{"default": ["When someone leaves, immediately disable their login (do not just change the password)", "Transfer ownership of shared files and documents to their manager", "Remove them from all group chats, shared drives, and project tools", "Revoke access to any third-party SaaS tools (check your SaaS inventory)", "Remove them from the organisation member list in SMB Security Check", "Review whether they had admin access to any system and rotate those credentials"], "google_workspace": ["Go to admin.google.com → Directory → Users → select the departing user", "Click ''Suspend user'' (this preserves data while blocking access immediately)", "Use the data transfer tool: admin.google.com → Account → Data migration to move Drive/Docs ownership", "Remove from all Google Groups: admin.google.com → Directory → Groups", "After 30 days (data retention period), delete the user account", "Revoke any app-specific passwords or OAuth tokens in the user''s security settings"], "microsoft_365": ["Go to admin.microsoft.com → Users → Active users → select the departing user", "Click ''Block sign-in'' immediately (this blocks access without deleting data)", "Convert mailbox to shared mailbox if someone needs to monitor their email: Exchange admin center → Recipients → Mailboxes", "Transfer OneDrive files: admin.microsoft.com → Users → Active users → [user] → OneDrive → Access files", "Remove from all Microsoft 365 groups and Teams channels", "After data transfer is complete, delete the user and release the licence"]}'
WHERE id = 'access-offboarding';

-- 3c. Phish reporting: GWS + M365 paths
UPDATE public.checklist_items
SET steps = '{"default": ["Choose a simple reporting method: a shared email address (e.g. phishing@company.com) or a button in your email client", "Communicate the method to all staff: ''If you get a suspicious email, forward it to phishing@company.com''", "Designate who monitors the phishing inbox (IT lead or manager)", "Respond to every report within 24 hours, even if it is not malicious — this encourages reporting", "Track reports in a simple spreadsheet: date, reporter, subject line, verdict (phish/safe)"], "google_workspace": ["Install the Google Phishing Report add-on: Workspace Marketplace → search ''Google Report Phishing''", "As admin, deploy it org-wide: admin.google.com → Apps → Google Workspace Marketplace → Allowlist/Install", "Users will see a ''Report Phishing'' button in Gmail when viewing an email", "Reports go to Google for analysis and the email is moved to spam", "Supplement with a phishing@company.com alias for reports from mobile or non-Gmail contexts"], "microsoft_365": ["In Outlook desktop/web, the ''Report'' button is built in (Report Message add-in)", "As admin, verify it is enabled: admin.microsoft.com → Settings → Integrated apps → Report Message", "If not present, deploy it: admin.microsoft.com → Settings → Integrated apps → Get apps → search ''Report Message''", "Configure where reports go: security.microsoft.com → Email & collaboration → Policies → User reported settings", "Set the reporting mailbox to your security team or a phishing@company.com shared mailbox"]}'
WHERE id = 'email-phish-reporting';
