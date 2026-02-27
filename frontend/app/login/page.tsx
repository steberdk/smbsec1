"use client";

import Link from "next/link";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // After clicking the email link, user returns here
        emailRedirectTo: `${window.location.origin}/workspace`,
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
          <p className="text-sm text-green-700">
            Sent! Check your email and click the link to continue.
          </p>
        )}
        {status === "error" && <p className="text-sm text-red-700">{error}</p>}
      </form>

      <div className="mt-6 text-sm">
        <Link className="underline" href="/">
          Back to home
        </Link>
      </div>
    </main>
  );
}
