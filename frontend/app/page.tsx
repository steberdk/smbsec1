import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Security Checklist for Small Business" };

export default function HomePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold">
          Fix the biggest cyber risks in 30 minutes
        </h1>
        <p className="text-gray-700">
          A practical checklist for small and medium-sized businesses. No fear.
          No enterprise complexity. Just the highest-impact steps.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white"
          >
            Sign up free
          </Link>

          <Link
            href="/checklist"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300"
          >
            Browse the checklist
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300"
          >
            Log in
          </Link>
        </div>
      </header>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">How SMBs actually get breached</h2>
        <p className="text-sm text-gray-600">
          These five attacks cause the vast majority of incidents at small businesses.
          Every item on the checklist targets at least one of them.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Phishing email",
              detail: "Employee clicks a fake invoice or login link. Accounts and data follow.",
              stat: "~80% of breaches start here",
            },
            {
              title: "Stolen or reused password",
              detail: "One leaked password opens every service that shares it.",
              stat: "#1 account takeover method",
            },
            {
              title: "Unpatched software",
              detail: "Attackers scan for known holes automatically — within hours of public disclosure.",
              stat: "Exploited at internet scale",
            },
            {
              title: "Ransomware",
              detail: "Encrypts your files and demands payment. Often arrives via email.",
              stat: "Avg SMB downtime: 3–5 days",
            },
            {
              title: "Fake invoice / CEO fraud",
              detail: "Attacker impersonates a supplier or executive to redirect payments.",
              stat: "Highest financial loss per incident",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-gray-200 bg-white p-4 space-y-1"
            >
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-sm text-gray-600">{item.detail}</p>
              <p className="text-xs text-gray-400">{item.stat}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">Why this checklist</h2>
        <ul className="list-disc pl-5 text-gray-700 space-y-2">
          <li>Covers the fixes that block the attacks above.</li>
          <li>No enterprise tools or IT degree required.</li>
          <li>Takes 30–60 minutes for the highest-impact items.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-2 text-sm text-gray-600">
        <p>Privacy: Your data stays in the EU. No tracking, no ads. Free for small teams.</p>
      </section>
    </main>
  );
}
