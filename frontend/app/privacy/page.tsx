import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>

      <div className="space-y-6 text-sm text-gray-700">
        <section>
          <h2 className="font-semibold text-base mb-2">What data we store</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your email address (used for login and team identification)</li>
            <li>Your display name (optional, shown to your team)</li>
            <li>Your organisation name and settings</li>
            <li>Your checklist responses (Done / Unsure / Skipped per item)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Where data is stored</h2>
          <p>
            All data is stored in the EU (Ireland, AWS eu-west-1) via Supabase.
            No data leaves the EU. No data is shared with third parties.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">No tracking, no ads</h2>
          <p>
            We do not use analytics cookies, tracking scripts, or advertising of any kind.
            We do not sell or share your data.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Your rights</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>See your data:</strong> Log in and go to Settings &amp; data to see all information stored about you.</li>
            <li><strong>Delete your data:</strong> Employees can delete their own account. Organisation admins can delete the entire organisation and all associated data.</li>
            <li><strong>Export your data:</strong> Organisation admins can export all org data from Settings &amp; data.</li>
          </ul>
          <p className="mt-2">
            All deletions are hard deletes — no soft flags, no data retention after deletion.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Emails</h2>
          <p>
            We send magic link emails for login and occasional reminder emails when
            your security review is due for reassessment. No marketing emails.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Contact</h2>
          <p>
            For questions about your data or privacy, contact us via the application.
          </p>
        </section>
      </div>

      <div className="mt-8 text-sm">
        <Link href="/" className="underline">
          Back to home
        </Link>
      </div>
    </main>
  );
}
