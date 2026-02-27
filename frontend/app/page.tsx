import Link from "next/link";

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

        <div className="flex flex-wrap gap-3">
          <Link
            href="/checklist"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white"
          >
            Start the checklist
          </Link>

          <Link
            href="/summary"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300"
          >
            View summary
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
        <h2 className="text-xl font-semibold">Why this matters</h2>
        <ul className="list-disc pl-5 text-gray-700 space-y-2">
          <li>Most SMB attacks start with email or weak accounts.</li>
          <li>Basic hygiene blocks the majority of common attacks.</li>
          <li>Backups and MFA are the biggest wins.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-2 text-sm text-gray-600">
        <p>Privacy: MVP 0 stores progress only in your browser.</p>
      </section>
    </main>
  );
}
