"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "loading" | "authed" | "anon";

export default function WorkspacePage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Only runs in the browser (because "use client")
    const supabase = getSupabaseBrowserClient();

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !data?.user) {
        setStatus("anon");
        setEmail(null);
        router.replace("/login");
        return;
      }

      setStatus("authed");
      setEmail(data.user.email ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Workspace</h1>
        <div className="flex items-center gap-3">
          <Link className="underline" href="/checklist">
            Checklist
          </Link>
          <button
            onClick={onLogout}
            className="px-3 py-2 rounded border hover:bg-gray-50"
            type="button"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="mt-6 rounded border p-4">
        {status === "loading" && <p>Loading…</p>}
        {status === "authed" && (
          <>
            <p className="font-medium">Signed in</p>
            <p className="text-sm text-gray-600">{email ?? "(no email)"}</p>
          </>
        )}
        {status === "anon" && <p>Redirecting to login…</p>}
      </div>
    </main>
  );
}
