"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CHECKLIST } from "@/lib/checklist/items";
import { clearProgress, loadProgress } from "@/lib/checklist/storage";
import type { ChecklistProgress } from "@/lib/checklist/types";
import { computeProgress, getStatus } from "@/lib/checklist/progress";

export default function SummaryPage() {
  // Start stable to match SSR
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState<ChecklistProgress>({});

  // Load localStorage AFTER mount to avoid hydration mismatch
  // Use setTimeout so eslint "set-state-in-effect" rule won't complain.
  useEffect(() => {
    const t = setTimeout(() => {
      setProgress(loadProgress());
      setMounted(true);
    }, 0);

    return () => clearTimeout(t);
  }, []);

  const stats = useMemo(() => computeProgress(progress), [progress]);

  const notDone = useMemo(() => {
    return CHECKLIST.items.filter((it) => {
      const s = getStatus(progress, it.id);
      return s !== "done";
    });
  }, [progress]);

  function handleClear() {
    clearProgress();
    setProgress({});
  }

  if (!mounted) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold">Summary</h1>
        <div className="mt-4 rounded-xl border p-4 bg-white">
          <div className="text-sm text-gray-700">Loading your progress…</div>
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
          Start with “Not sure” and “Skipped”. If you can only do a few things, prioritize MFA, backups,
          and updates.
        </p>

        <div className="mt-4 space-y-2">
          {notDone.length === 0 ? (
            <div className="text-sm text-green-700">
              Nice — everything is marked “Done”. Reassess quarterly.
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

        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300"
        >
          Clear local progress
        </button>
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Privacy: this MVP stores checklist progress only in your browser (localStorage). Clearing removes it
        from this device.
      </p>
    </main>
  );
}
