"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "loading" | "authed" | "anon" | "error";

export default function WorkspacePage() {
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const supabase = getSupabaseBrowserClient();

        const { data, error } = await supabase.auth.getUser();
        if (!mounted) return;

        if (error) {
          setStatus("error");
          setError(error.message);
          return;
        }

        if (!data?.user) {
          setStatus("anon");
          return;
        }

        setEmail(data.user.email ?? null);
        setStatus("authed");
      } catch (e) {
        if (!mounted) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      // simple refresh so UI updates
      window.location.href = "/";
    } catch (e) {
      alert(e instanceof Error ? e.message : "Logout failed");
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Workspace</h1>
        <Link className="text-sm underline" href="/">
          Home
        </Link>
      </div>

      {status === "loading" && (
        <p className="mt-6 text-sm text-gray-600">Checking session…</p>
      )}

      {status === "anon" && (
        <div className="mt-6 rounded-xl border p-4">
          <p className="text-sm">You’re not logged in.</p>
          <Link className="mt-3 inline-block underline" href="/login">
            Go to login
          </Link>
        </div>
      )}

      {status === "authed" && (
        <div className="mt-6 rounded-xl border p-4">
          <p className="text-sm">
            Signed in as <span className="font-medium">{email ?? "unknown"}</span>
          </p>

          <div className="mt-4 flex gap-3">
            <Link className="underline" href="/checklist">
              Checklist
            </Link>
            <Link className="underline" href="/summary">
              Summary
            </Link>
            <button className="underline" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="mt-2 text-sm text-red-800">{error}</p>
          <p className="mt-3 text-sm">
            Check Vercel env vars for <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      )}
    </main>
  );
}
