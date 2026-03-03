"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CHECKLIST } from "@/lib/checklist/items";
import { fetchRemoteProgress } from "@/lib/checklist/storage";
import type { ChecklistProgress } from "@/lib/checklist/types";
import { computeProgress, getStatus } from "@/lib/checklist/progress";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ViewMode = "loading" | "signin" | "summary";

export default function SummaryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("loading");
  const [progress, setProgress] = useState<ChecklistProgress>({});

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token ?? null;

        if (cancelled) return;

        if (!token) {
          setViewMode("signin");
          return;
        }

        try {
          const remote = await fetchRemoteProgress(token);
          if (cancelled) return;
          setProgress(remote.data ?? {});
        } catch {
          // Show summary with empty progress on fetch error
        }

        setViewMode("summary");
      } catch {
        if (!cancelled) setViewMode("signin");
      }
    }

    void init();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => computeProgress(progress), [progress]);

  const notDone = useMemo(() => {
    return CHECKLIST.items.filter((it) => {
      const s = getStatus(progress, it.id);
      return s !== "done";
    });
  }, [progress]);

  if (viewMode === "loading") {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold">Summary</h1>
        <div className="mt-4 rounded-xl border p-4 bg-white">
          <div className="text-sm text-gray-700">Loading…</div>
        </div>
        <div className="mt-8">
          <Link className="text-sm underline" href="/checklist">
            ← Back to checklist
          </Link>
        </div>
      </main>
    );
  }

  if (viewMode === "signin") {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold">Summary</h1>
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <p className="text-sm text-blue-900 font-medium">
            Sign in to see your progress summary.
          </p>
          <Link
            href="/login"
            className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white text-sm"
          >
            Sign in
          </Link>
        </div>
        <div className="mt-8">
          <Link className="text-sm underline" href="/checklist">
            ← Back to checklist
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Summary</h1>

      <div className="mt-4 rounded-xl border p-4 bg-white">
        <div className="text-sm text-gray-700">
          Progress: <span className="font-semibold tabular-nums">{stats.percent}%</span>
        </div>

        <div className="mt-2 text-sm text-gray-700">
          Done: <span className="tabular-nums">{stats.done}</span> · Not sure:{" "}
          <span className="tabular-nums">{stats.unsure}</span> · Skipped:{" "}
          <span className="tabular-nums">{stats.skipped}</span> · Total:{" "}
          <span className="tabular-nums">{stats.total}</span>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Next steps</h2>
        <p className="text-sm text-gray-700 mt-2">
          Start with &ldquo;Not sure&rdquo; and &ldquo;Skipped&rdquo;. If you can only do a few things, prioritize MFA, backups,
          and updates.
        </p>

        <div className="mt-4 space-y-2">
          {notDone.length === 0 ? (
            <div className="text-sm text-green-700">
              Nice — everything is marked &ldquo;Done&rdquo;. Reassess quarterly.
            </div>
          ) : (
            <>
              {notDone.slice(0, 10).map((it) => (
                <div key={it.id} className="text-sm text-gray-800">
                  • {it.title}
                </div>
              ))}
              {notDone.length > 10 && (
                <div className="text-sm text-gray-600">…and {notDone.length - 10} more.</div>
              )}
            </>
          )}
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/checklist"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white"
        >
          Back to checklist
        </Link>

        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
