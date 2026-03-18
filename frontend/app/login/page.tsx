"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="max-w-md mx-auto px-4 py-10"><p className="text-sm text-gray-600">Loading…</p></main>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (next) callbackUrl.searchParams.set("next", next);
    const redirectTo = callbackUrl.toString();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="text-sm text-gray-700 mt-2">
        We’ll send you a secure sign-in link. No password needed.
      </p>

      <form onSubmit={handleSendLink} className="mt-6 space-y-3">
        <label className="block text-sm font-medium">Email</label>
        <input
          className="w-full border rounded-lg px-3 py-2"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />

        <button
          className="w-full rounded-lg bg-gray-900 text-white py-2 disabled:opacity-60"
          disabled={status === "sending"}
          type="submit"
        >
          {status === "sending" ? "Sending…" : "Send sign-in link"}
        </button>

        {status === "sent" && (
          <div className="space-y-2">
            <p className="text-sm text-green-700">
              Sent! Check your email and click the link to continue.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Open the link in the same browser where you requested it. Magic links don&apos;t work across different browsers or devices.
            </p>
          </div>
        )}
        {status === "error" && <p className="text-sm text-red-700">{error}</p>}
      </form>

      <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-xs font-medium text-gray-700 mb-2">New here? Here&apos;s how it works:</p>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
          <li>Enter your email above — we&apos;ll send a secure link</li>
          <li>Set up your organisation (name, who handles IT)</li>
          <li>Invite your team and start your security review</li>
        </ol>
      </div>

      <div className="mt-4 text-sm">
        <Link className="underline" href="/">
          Back to home
        </Link>
      </div>
    </main>
  );
}
