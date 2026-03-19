-- Migration 018: PI 9 Iteration 2 — Multi-language support + org locale
-- Adds locale column to campaign_templates
-- Adds locale column to orgs

-- ============================================================
-- 1. LOCALE COLUMN ON campaign_templates
-- ============================================================

ALTER TABLE smbsec1.campaign_templates
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en';

-- ============================================================
-- 2. LOCALE COLUMN ON orgs
-- ============================================================

ALTER TABLE smbsec1.orgs
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en';

-- ============================================================
-- 3. DANISH TRANSLATIONS OF ALL 7 TEMPLATES
-- ============================================================

-- Danish: Account Suspended Notice (phishing_email)
INSERT INTO smbsec1.campaign_templates (id, title, type, subject, preview_text, body_html, body_text, checklist_item_id, difficulty, active, locale)
VALUES (
  'phish-account-suspended-da',
  'Konto suspenderet',
  'phishing_email',
  'Haster: Din konto er blevet suspenderet',
  'Handling paakraevet — bekraeft din identitet for at gendanne adgang',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="background: #d32f2f; padding: 20px; text-align: center;">\n<h2 style="color: #fff; margin: 10px 0 0;">Sikkerhedsadvarsel for konto</h2>\n</div>\n<div style="padding: 30px; background: #fff; border: 1px solid #e0e0e0;">\n<p>Kaere bruger,</p>\n<p>Vi har registreret usaedvanlig aktivitet paa din konto, og den er blevet <strong>midlertidigt suspenderet</strong> for din sikkerhed.</p>\n<p>Hvis du ikke bekraefter din identitet inden for <strong>24 timer</strong>, vil din konto blive permanent deaktiveret, og alle data vil blive slettet.</p>\n<p style="text-align: center; margin: 30px 0;">\n<a href="{{tracking_url}}" style="background: #d32f2f; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: bold;">Bekraeft min identitet nu</a>\n</p>\n<p style="font-size: 12px; color: #888;">Dette er en automatisk besked fra dit IT-sikkerhedsteam.<br/>Sendt fra: security-alerts@acc0unt-verify.net</p>\n</div>\n</div>',
  E'HASTER: Din konto er blevet suspenderet\n\nKaere bruger,\n\nVi har registreret usaedvanlig aktivitet paa din konto, og den er blevet midlertidigt suspenderet for din sikkerhed.\n\nHvis du ikke bekraefter din identitet inden for 24 timer, vil din konto blive permanent deaktiveret.\n\nBekraeft din identitet: {{tracking_url}}\n\nDette er en automatisk besked fra dit IT-sikkerhedsteam.\nSendt fra: security-alerts@acc0unt-verify.net',
  'aware-spot-phishing-email',
  'easy',
  true,
  'da'
)
ON CONFLICT (id) DO NOTHING;

-- Danish: Overdue Invoice (fake_invoice)
INSERT INTO smbsec1.campaign_templates (id, title, type, subject, preview_text, body_html, body_text, checklist_item_id, difficulty, active, locale)
VALUES (
  'bec-overdue-invoice-da',
  'Forfalden faktura',
  'fake_invoice',
  'SV: Faktura #INV-2024-0847 - Forfalden betaling',
  'Venligst betal den vedhaeftede faktura hurtigst muligt',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="padding: 20px; border-bottom: 3px solid #1a73e8;">\n<table style="width: 100%;"><tr>\n<td><strong style="font-size: 18px; color: #333;">GlobalTech Solutions ApS</strong><br/><span style="font-size: 12px; color: #666;">Regnskabsafdelingen</span></td>\n<td style="text-align: right; font-size: 12px; color: #666;">Faktura opfoelgning<br/>Ref: INV-2024-0847</td>\n</tr></table>\n</div>\n<div style="padding: 30px;">\n<p>Hej,</p>\n<p>Jeg foelger op paa faktura <strong>#INV-2024-0847</strong>, som havde forfaldsdato den 15. Vores optegnelser viser, at den stadig er ubetalt.</p>\n<p>Kan du venligst behandle denne hurtigst muligt? Vi vil gerne undgaa at tillaegge det standard rykkergebyr paa 3%.</p>\n<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">\n<tr style="background: #f5f5f5;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Faktura</strong></td><td style="padding: 10px; border: 1px solid #ddd;">#INV-2024-0847</td></tr>\n<tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Beloeb</strong></td><td style="padding: 10px; border: 1px solid #ddd;">DKK 35.400,00</td></tr>\n<tr style="background: #f5f5f5;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Forfaldsdato</strong></td><td style="padding: 10px; border: 1px solid #ddd;">15. marts 2026</td></tr>\n<tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Status</strong></td><td style="padding: 10px; border: 1px solid #ddd; color: #d32f2f;"><strong>FORFALDEN</strong></td></tr>\n</table>\n<p>Brug venligst linket herunder til at se og betale fakturaen:</p>\n<p style="text-align: center; margin: 25px 0;">\n<a href="{{tracking_url}}" style="background: #1a73e8; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 4px;">Se faktura og betal</a>\n</p>\n<p>Hvis du allerede har betalt, bedes du se bort fra denne besked.</p>\n<p>Venlig hilsen,<br/><strong>Maria Jensen</strong><br/>Debitorbogholder<br/>GlobalTech Solutions ApS<br/><span style="font-size: 12px; color: #888;">maria.jensen@gl0baltech-solutions.com</span></p>\n</div>\n</div>',
  E'SV: Faktura #INV-2024-0847 - Forfalden betaling\n\nHej,\n\nJeg foelger op paa faktura #INV-2024-0847, som havde forfaldsdato den 15.\n\nFaktura: #INV-2024-0847\nBeloeb: DKK 35.400,00\nForfaldsdato: 15. marts 2026\nStatus: FORFALDEN\n\nSe og betal fakturaen: {{tracking_url}}\n\nVenlig hilsen,\nMaria Jensen\nDebitorbogholder\nGlobalTech Solutions ApS',
  'aware-fake-invoice',
  'medium',
  true,
  'da'
)
ON CONFLICT (id) DO NOTHING;

-- Danish: Shared Document (credential_harvest)
INSERT INTO smbsec1.campaign_templates (id, title, type, subject, preview_text, body_html, body_text, checklist_item_id, difficulty, active, locale)
VALUES (
  'cred-shared-document-da',
  'Delt dokument',
  'credential_harvest',
  'Dokument delt med dig: Q1 Oekonomisk gennemgang.xlsx',
  'Klik for at se det delte dokument i din browser',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="padding: 20px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0;">\n<strong style="font-size: 16px; color: #202124;">Dokumentdeling</strong>\n</div>\n<div style="padding: 30px; background: #fff;">\n<p style="color: #202124;">Hej {{RECIPIENT_NAME}},</p>\n<p style="color: #202124;">Et dokument er blevet delt med dig:</p>\n<div style="background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 20px 0;">\n<strong style="color: #202124;">Q1 Oekonomisk gennemgang.xlsx</strong><br/><span style="font-size: 12px; color: #5f6368;">Delt af Oekonomiafdelingen &middot; 2,4 MB</span>\n</div>\n<p style="text-align: center; margin: 25px 0;">\n<a href="{{CLICK_URL}}" style="background: #1a73e8; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 500;">Aabn dokument</a>\n</p>\n<p style="font-size: 12px; color: #5f6368;">Du skal muligvis logge ind for at se dokumentet. Hvis du ikke forventede denne fil, <a href="{{REPORT_URL}}" style="color: #1a73e8;">rapporter den som mistaeknelig</a>.</p>\n</div>\n</div>',
  E'Dokument delt med dig: Q1 Oekonomisk gennemgang.xlsx\n\nHej {{RECIPIENT_NAME}},\n\nEt dokument er blevet delt med dig:\n\nQ1 Oekonomisk gennemgang.xlsx\nDelt af Oekonomiafdelingen - 2,4 MB\n\nAabn dokument: {{CLICK_URL}}\n\nHvis du ikke forventede denne fil, rapporter den som mistaeknelig: {{REPORT_URL}}',
  'aware-fake-login-page',
  'hard',
  true,
  'da'
)
ON CONFLICT (id) DO NOTHING;

-- Danish: CEO Urgent Payment (ceo_fraud)
INSERT INTO smbsec1.campaign_templates (id, title, type, subject, preview_text, body_html, body_text, checklist_item_id, difficulty, active, locale)
VALUES (
  'ceo-urgent-payment-da',
  'Haster: Betalingsanmodning fra ledelsen',
  'ceo_fraud',
  'Haster — har brug for din hjaelp med noget fortroligt',
  'Kan du haandtere en hurtig betaling for mig i dag?',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="padding: 30px; background: #fff;">\n<p>Hej {{RECIPIENT_NAME}},</p>\n<p>Er du ved dit skrivebord? Jeg har brug for din hjaelp med noget, der haster og er fortroligt.</p>\n<p>Vi skal behandle en betaling til en ny leverandoer i dag inden kl. 17. Jeg sidder i moeder hele dagen og kan ikke goere det selv. Fakturaen er paa <strong>DKK 24.000,00</strong> og skal betales med det samme for at undgaa en bod.</p>\n<p>Jeg har vedhaeftet betalingsoplysningerne her — venligst gennemgaa og behandl hurtigst muligt:</p>\n<p style="text-align: center; margin: 25px 0;">\n<a href="{{CLICK_URL}}" style="background: #2d2d2d; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 4px; font-weight: 500;">Se betalingsoplysninger</a>\n</p>\n<p>Hold venligst dette mellem os indtil videre — jeg forklarer, naar jeg er ude af mit moede.</p>\n<p>Tak,<br/><strong>{{SENDER_NAME}}</strong></p>\n<p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">Sendt fra mobil<br/><em>Hvis denne anmodning virker usaedvanlig, <a href="{{REPORT_URL}}" style="color: #666;">rapporter den til dit IT-team</a>.</em></p>\n</div>\n</div>',
  E'Hej {{RECIPIENT_NAME}},\n\nEr du ved dit skrivebord? Jeg har brug for din hjaelp med noget, der haster og er fortroligt.\n\nSe betalingsoplysninger: {{CLICK_URL}}\n\nTak,\n{{SENDER_NAME}}\n\nSendt fra mobil\nHvis denne anmodning virker usaedvanlig, rapporter den til dit IT-team: {{REPORT_URL}}',
  'aware-fake-invoice',
  'hard',
  true,
  'da'
)
ON CONFLICT (id) DO NOTHING;

-- Danish: Password Sharing (knowledge_test)
INSERT INTO smbsec1.campaign_templates (id, title, type, subject, preview_text, body_html, body_text, checklist_item_id, difficulty, active, locale)
VALUES (
  'knowledge-password-sharing-da',
  'Delt adgangskodedokument',
  'knowledge_test',
  'Teamadgangskoder - Opdateret adgangsliste',
  'Det delte adgangskodedokument er opdateret med nye legitimationsoplysninger',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="padding: 20px; background: #f0f4f8; border-bottom: 2px solid #3b82f6;">\n<strong style="font-size: 16px; color: #1e3a5f;">IT-afdelingen</strong><br/><span style="font-size: 12px; color: #64748b;">Intern kommunikation</span>\n</div>\n<div style="padding: 30px; background: #fff;">\n<p>Hej {{RECIPIENT_NAME}},</p>\n<p>Det delte adgangskodedokument er blevet opdateret med nye loginoplysninger til vores teamvaerktoejer og tjenester.</p>\n<p>Gennemgaa venligst dokumentet og sørg for, at du har adgang til alle de konti, du har brug for:</p>\n<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">\n<strong style="color: #1e3a5f;">Team_Adgangskoder_2026.xlsx</strong><br/><span style="font-size: 12px; color: #64748b;">Sidst opdateret: I dag &middot; 12 konti oplistet</span>\n</div>\n<p style="text-align: center; margin: 25px 0;">\n<a href="{{CLICK_URL}}" style="background: #3b82f6; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 500;">Aabn adgangskodedokument</a>\n</p>\n<p style="font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px;">Virker det mistaeknkeligt? <a href="{{REPORT_URL}}" style="color: #3b82f6;">Rapporter til dit IT-team</a>.</p>\n</div>\n</div>',
  E'Teamadgangskoder - Opdateret adgangsliste\n\nHej {{RECIPIENT_NAME}},\n\nDet delte adgangskodedokument er blevet opdateret.\n\nAabn adgangskodedokument: {{CLICK_URL}}\n\nVirker det mistaeknkeligt? Rapporter til dit IT-team: {{REPORT_URL}}',
  'acct-password-manager',
  'medium',
  true,
  'da'
)
ON CONFLICT (id) DO NOTHING;

-- Danish: MFA Reset (knowledge_test)
INSERT INTO smbsec1.campaign_templates (id, title, type, subject, preview_text, body_html, body_text, checklist_item_id, difficulty, active, locale)
VALUES (
  'knowledge-mfa-reset-da',
  'MFA vedligeholdelsesbesked',
  'knowledge_test',
  'Handling paakraevet: Vedligeholdelse af multifaktorgodkendelse',
  'Dine MFA-indstillinger skal genkonfigureres efter systemvedligeholdelse',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="padding: 20px; background: #fef3c7; border-bottom: 2px solid #f59e0b;">\n<strong style="font-size: 16px; color: #92400e;">Systemadministration</strong><br/><span style="font-size: 12px; color: #a16207;">Vedligeholdelsesbesked</span>\n</div>\n<div style="padding: 30px; background: #fff;">\n<p>Kaere {{RECIPIENT_NAME}},</p>\n<p>Paa grund af planlagt systemvedligeholdelse er <strong>multifaktorgodkendelse (MFA)</strong> midlertidigt deaktiveret paa din konto.</p>\n<p>For at genaktivere MFA og opretholde sikkerheden paa din konto, klik venligst paa linket herunder:</p>\n<p style="text-align: center; margin: 25px 0;">\n<a href="{{CLICK_URL}}" style="background: #f59e0b; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 500;">Genaktiver MFA nu</a>\n</p>\n<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0;">\n<p style="margin: 0; font-size: 13px; color: #92400e;"><strong>Vigtigt:</strong> Hvis MFA ikke genaktiveres inden for 48 timer, vil din konto blive begraenset til skrivebeskyttet adgang.</p>\n</div>\n<p style="font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px;">Forventede du ikke denne besked? <a href="{{REPORT_URL}}" style="color: #f59e0b;">Rapporter den som mistaeknelig</a>.</p>\n</div>\n</div>',
  E'Handling paakraevet: Vedligeholdelse af multifaktorgodkendelse\n\nKaere {{RECIPIENT_NAME}},\n\nPaa grund af planlagt systemvedligeholdelse er MFA midlertidigt deaktiveret.\n\nGenaktiver MFA: {{CLICK_URL}}\n\nForventede du ikke denne besked? Rapporter den: {{REPORT_URL}}',
  'acct-enable-mfa-email',
  'medium',
  true,
  'da'
)
ON CONFLICT (id) DO NOTHING;

-- Danish: Macro Document (knowledge_test)
INSERT INTO smbsec1.campaign_templates (id, title, type, subject, preview_text, body_html, body_text, checklist_item_id, difficulty, active, locale)
VALUES (
  'knowledge-macro-document-da',
  'Dokument kraever makroer',
  'knowledge_test',
  'SV: Q1 Budgetgennemgang - Aktiver venligst makroer for at se',
  'Det vedhaeftede regneark kraever makroer for at vises korrekt',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<div style="padding: 20px; background: #ecfdf5; border-bottom: 2px solid #10b981;">\n<strong style="font-size: 16px; color: #064e3b;">Oekonomiafdelingen</strong><br/><span style="font-size: 12px; color: #047857;">Maanedsrapport</span>\n</div>\n<div style="padding: 30px; background: #fff;">\n<p>Hej {{RECIPIENT_NAME}},</p>\n<p>Venligst find vedhaeftet Q1 budgetgennemgangsregnearket. De interaktive diagrammer og formler kraever, at makroer er aktiveret.</p>\n<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">\n<strong style="color: #064e3b;">Q1_Budgetgennemgang_2026.xlsm</strong><br/><span style="font-size: 12px; color: #64748b;">Makroaktiveret projektmappe &middot; 1,8 MB</span>\n</div>\n<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">\n<p style="margin: 0; font-size: 13px; color: #92400e;"><strong>Bemærk:</strong> Naar du aabner dokumentet, klik paa <strong>&ldquo;Aktiver indhold&rdquo;</strong> i den gule sikkerhedsbjælke oeversdt i Excel.</p>\n</div>\n<p style="text-align: center; margin: 25px 0;">\n<a href="{{CLICK_URL}}" style="background: #10b981; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 500;">Download dokument</a>\n</p>\n<p style="font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px;">Virker det mistaeknkeligt? <a href="{{REPORT_URL}}" style="color: #10b981;">Rapporter til IT</a></p>\n</div>\n</div>',
  E'SV: Q1 Budgetgennemgang - Aktiver venligst makroer\n\nHej {{RECIPIENT_NAME}},\n\nDownload dokument: {{CLICK_URL}}\n\nVirker det mistaeknkeligt? Rapporter til IT: {{REPORT_URL}}',
  'email-disable-macros',
  'easy',
  true,
  'da'
)
ON CONFLICT (id) DO NOTHING;
