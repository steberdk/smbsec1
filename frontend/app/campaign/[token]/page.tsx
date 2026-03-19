"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function CampaignClickPage() {
  const params = useParams();
  const token = params.token as string;

  const [recorded, setRecorded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Phishing Simulation | SMB Security Quick-Check";
  }, []);

  useEffect(() => {
    if (!token) return;

    fetch("/api/campaigns/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "clicked" }),
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
        <div className="bg-amber-500 px-6 py-4">
          <h1 className="text-white text-lg font-bold">
            This Was a Simulated Phishing Test
          </h1>
        </div>

        <div className="px-6 py-6 space-y-5">
          <p className="text-gray-700">
            You clicked on a link in a simulated phishing email. Do not worry
            &mdash; this was a security awareness exercise, and no real threat
            was involved. However, if this had been a real attack, clicking
            could have compromised your credentials or installed malware.
          </p>

          <div className="rounded-xl border border-teal-200 bg-teal-50 px-5 py-4">
            <h2 className="text-sm font-bold text-teal-800 mb-3">
              How to Spot Phishing Emails
            </h2>
            <ul className="space-y-2 text-sm text-teal-900">
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-teal-600">1.</span>
                <span>
                  <strong>Check the sender address.</strong> Phishing emails
                  often come from addresses that look similar to real ones but
                  contain subtle misspellings (e.g. &quot;acc0unt-verify.net&quot;).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-teal-600">2.</span>
                <span>
                  <strong>Look for urgency and threats.</strong> Phrases like
                  &quot;your account will be deactivated&quot; or &quot;act
                  within 24 hours&quot; are designed to make you panic.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-teal-600">3.</span>
                <span>
                  <strong>Hover over links before clicking.</strong> Check
                  whether the URL actually goes to your company&apos;s
                  legitimate domain.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-teal-600">4.</span>
                <span>
                  <strong>When in doubt, report it.</strong> Use your
                  organisation&apos;s reporting process or contact your IT
                  team before clicking anything suspicious.
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
