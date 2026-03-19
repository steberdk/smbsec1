import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy | SMB Security Quick-Check" };

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-xs text-gray-400 mb-8">Last updated: March 2026</p>

      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-semibold text-base mb-2">1. Who we are</h2>
          <p>
            SMBsec (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides a security checklist and
            phishing awareness platform for small and medium-sized businesses. This
            privacy policy explains how we collect, use, and protect your personal data
            in accordance with the EU General Data Protection Regulation (GDPR).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">2. What data we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Email address</strong> — used for login (magic link authentication) and team identification.</li>
            <li><strong>Display name</strong> — optional, shown to your team members.</li>
            <li><strong>Organisation name and settings</strong> — email platform preference, language setting.</li>
            <li><strong>Checklist responses</strong> — your answers (Done / Not sure / Skipped) to security checklist items.</li>
            <li><strong>Campaign interactions</strong> — if your organisation runs phishing awareness campaigns, we record whether you clicked, reported, or ignored simulated phishing emails. This data is used for security training purposes only.</li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> collect: passwords (we use passwordless magic link login),
            payment card details (billing is handled via Stripe, a PCI-compliant processor),
            browsing behaviour, device fingerprints, or IP addresses for tracking purposes.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">3. Legal basis for processing</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Contract performance</strong> (Art. 6(1)(b) GDPR) — to provide the security checklist and team dashboard services you signed up for.</li>
            <li><strong>Legitimate interest</strong> (Art. 6(1)(f) GDPR) — to send reassessment reminder emails and to conduct phishing awareness campaigns requested by your organisation admin.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">4. Where data is stored</h2>
          <p>
            All data is stored in the <strong>European Union</strong> (Ireland, AWS eu-west-1) via
            Supabase, our database and authentication provider. No data leaves the EU.
            No data is shared with third parties except as described below.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">5. Sub-processors</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded mt-2">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-3 py-2 border-b">Service</th>
                  <th className="px-3 py-2 border-b">Purpose</th>
                  <th className="px-3 py-2 border-b">Data location</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2">Supabase</td>
                  <td className="px-3 py-2">Authentication, database</td>
                  <td className="px-3 py-2">EU (Ireland)</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2">Vercel</td>
                  <td className="px-3 py-2">Application hosting</td>
                  <td className="px-3 py-2">EU edge network</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2">Resend</td>
                  <td className="px-3 py-2">Transactional email delivery</td>
                  <td className="px-3 py-2">US (email transit only)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">6. No tracking, no ads</h2>
          <p>
            We do not use analytics cookies, tracking scripts, advertising pixels, or
            third-party analytics services. We do not sell or share your data with
            advertisers. We do not build user profiles for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">7. Data retention</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Active accounts:</strong> data is retained as long as your account exists.</li>
            <li><strong>Deleted accounts:</strong> all personal data is permanently deleted (hard delete) immediately upon account deletion. No soft-delete flags, no retention period.</li>
            <li><strong>Deleted organisations:</strong> all organisation data (members, assessments, campaigns) is permanently deleted. An anonymised audit log entry (timestamp and event type only) may be retained for compliance.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">8. Your rights under GDPR</h2>
          <p className="mb-2">You have the following rights regarding your personal data:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Right of access</strong> — Log in and go to Settings &amp; Data to see all information stored about you.</li>
            <li><strong>Right to rectification</strong> — Update your display name and organisation settings at any time.</li>
            <li><strong>Right to erasure</strong> — Employees can delete their own account. Organisation admins can delete the entire organisation and all associated data.</li>
            <li><strong>Right to data portability</strong> — Organisation admins can export all org data in JSON format from Settings &amp; Data.</li>
            <li><strong>Right to object</strong> — Employees can opt out of phishing awareness campaigns via their organisation admin.</li>
          </ul>
          <p className="mt-2">
            All deletions are <strong>hard deletes</strong> — no soft flags, no data retained after deletion.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">9. Emails we send</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Magic link login</strong> — sent when you request to sign in.</li>
            <li><strong>Team invite</strong> — sent when an admin invites you to an organisation.</li>
            <li><strong>Reassessment reminder</strong> — sent when your security review is due for reassessment.</li>
            <li><strong>Phishing awareness campaigns</strong> — simulated phishing emails sent by your organisation admin for security training. These emails are clearly identified as simulations after interaction.</li>
          </ul>
          <p className="mt-2">We do not send marketing emails or newsletters.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">10. Security measures</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Passwordless authentication (magic link) — no passwords stored</li>
            <li>Row-level security (RLS) on all database tables</li>
            <li>HTTPS-only with security headers (CSP, X-Frame-Options, HSTS)</li>
            <li>Rate limiting on all API endpoints</li>
            <li>JWT-based session management with short-lived tokens</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">11. Contact</h2>
          <p>
            For questions about your data or privacy, or to exercise your GDPR rights,
            contact us via the application or at the email address provided in your
            organisation&apos;s settings.
          </p>
        </section>
      </div>

      <div className="mt-8 text-sm">
        <Link href="/" className="text-teal-700 hover:text-teal-800 underline">
          Back to home
        </Link>
      </div>
    </main>
  );
}
