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
    <main className="min-h-screen bg-[#f8fafb] flex flex-col">
      {/* Header bar */}
      <header className="border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-md mx-auto px-4 h-12 flex items-center">
          <Link href="/" className="text-teal-700 font-bold text-sm tracking-tight">smbsec</Link>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center pt-12 pb-10 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-gray-900">Log in</h1>
            <p className="text-sm text-gray-600 mt-2">
              We&apos;ll send you a secure sign-in link. No password needed.
            </p>

            <form onSubmit={handleSendLink} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>

              <button
                className="w-full rounded-lg bg-teal-700 text-white py-2.5 font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all disabled:opacity-60"
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
              {status === "error" && (
                <p className="text-sm text-red-700">
                  {error?.includes("rate limit")
                    ? "Too many attempts — please try again in a few minutes."
                    : error}
                </p>
              )}
            </form>
          </div>

          <div className="mt-5 rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4">
            <p className="text-xs font-medium text-gray-700 mb-2">New here? Here&apos;s how it works:</p>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li>Enter your email above — we&apos;ll send a secure link</li>
              <li>Set up your organisation (name, who handles IT)</li>
              <li>Invite your team and start your security review</li>
            </ol>
          </div>

          <div className="mt-4 text-sm">
            <Link className="text-gray-500 hover:text-gray-700 underline" href="/">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
