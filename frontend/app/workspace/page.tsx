"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function WorkspacePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!alive) return;

      if (error || !data.user) {
        window.location.href = "/login";
        return;
      }

      setEmail(data.user.email ?? null);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return <main className="max-w-2xl mx-auto px-4 py-10">Loading…</main>;
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Workspace</h1>
      <p className="text-sm text-gray-700 mt-2">
        Signed in as <span className="font-medium">{email}</span>
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="px-4 py-2 rounded-lg border" href="/checklist">
          Checklist
        </Link>
        <Link className="px-4 py-2 rounded-lg border" href="/summary">
          Summary
        </Link>
        <button className="px-4 py-2 rounded-lg bg-gray-900 text-white" onClick={logout}>
          Log out
        </button>
      </div>

      <div className="mt-10 rounded-xl border p-4 bg-white">
        <h2 className="font-semibold">Next (MVP1)</h2>
        <ul className="list-disc pl-5 text-sm text-gray-700 mt-2 space-y-1">
          <li>Create company record</li>
          <li>Invite employees</li>
          <li>Persist assessments in DB</li>
        </ul>
      </div>
    </main>
  );
}
