"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function CampaignReportPage() {
  const params = useParams();
  const token = params.token as string;

  const [recorded, setRecorded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Phishing Report | SMB Security Quick-Check";
  }, []);

  useEffect(() => {
    if (!token) return;

    fetch("/api/campaigns/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "reported" }),
    })
      .then((res) => res.json())
      .then((data: { ok?: boolean; error?: string }) => {
        if (data.ok) {
          setRecorded(true);
        } else {
          setError(data.error ?? "Something went wrong");
        }
      })
      .catch(() => setError("Failed to connect to server"));
  }, [token]);

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!recorded) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header bar */}
        <div className="bg-teal-600 px-6 py-4">
          <h1 className="text-white text-lg font-bold">
            Great Job — You Reported It!
          </h1>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-center">
            <p className="text-green-800 font-semibold text-lg mb-1">
              Well done!
            </p>
            <p className="text-green-700 text-sm">
              You correctly identified this as a simulated phishing email and
              chose to report it instead of clicking the suspicious link.
            </p>
          </div>

          <p className="text-gray-700 text-sm">
            Reporting suspicious emails is one of the most important things
            you can do to protect your organisation. Every report helps your
            IT team identify threats faster and keep everyone safe.
          </p>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-800 mb-3">
              What to Do Next
            </h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-teal-600">1.</span>
                <span>
                  Keep reporting suspicious emails whenever you see them &mdash;
                  your vigilance makes a real difference.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-teal-600">2.</span>
                <span>
                  Share what you know with colleagues &mdash; help them
                  recognise phishing too.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-teal-600">3.</span>
                <span>
                  Review your organisation&apos;s security checklist to see
                  what other steps you can take.
                </span>
              </li>
            </ul>
          </div>

          <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link
              href="/workspace"
              className="inline-block bg-teal-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
            >
              Go to your workspace
            </Link>
            <Link
              href="/checklist"
              className="inline-block text-teal-700 hover:underline text-sm font-medium"
            >
              Review the security checklist
            </Link>
          </div>

          <p className="text-xs text-gray-400 text-center">
            This simulation is part of your organisation&apos;s security
            awareness programme, powered by SMB Security Quick-Check.
          </p>
        </div>
      </div>
    </main>
  );
}
