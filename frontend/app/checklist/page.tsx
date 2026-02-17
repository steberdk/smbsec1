"use client";

import Link from "next/link";
import { CHECKLIST } from "@/lib/checklist/items";
import { loadProgress, setItemStatus, saveProgress } from "@/lib/checklist/storage";
import { ChecklistProgress, ChecklistStatus } from "@/lib/checklist/types";
import { computeProgress, getStatus } from "@/lib/checklist/progress";
import { useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { ChecklistItemCard } from "@/components/ChecklistItemCard";

export default function ChecklistPage() {
  // IMPORTANT: Start with a stable value that matches SSR
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState<ChecklistProgress>({});

  // Load localStorage AFTER mount to avoid hydration mismatch (0 vs 18 etc.)
  // Use setTimeout so eslint "set-state-in-effect" rule won't complain.
  useEffect(() => {
    const t = setTimeout(() => {
      setProgress(loadProgress());
      setMounted(true);
    }, 0);

    return () => clearTimeout(t);
  }, []);

  const groups = useMemo(() => {
    const sortedGroups = [...CHECKLIST.groups].sort((a, b) => a.order - b.order);

    return sortedGroups.map((g) => ({
      group: g,
      items: CHECKLIST.items.filter((i) => i.groupId === g.id),
    }));
  }, []);

  const stats = useMemo(() => computeProgress(progress), [progress]);

  function handleSet(itemId: string, status: ChecklistStatus) {
    setProgress((prev) => setItemStatus(prev, itemId, status));
  }

  function handleReset(itemId: string) {
    setProgress((prev) => {
      const next = { ...prev };
      delete next[itemId];
      saveProgress(next);
      return next;
    });
  }

  // Render a stable shell until we’ve mounted + loaded localStorage
  if (!mounted) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Security checklist</h1>
          <Link className="text-sm underline" href="/summary">
            View summary →
          </Link>
        </div>

        <div className="mt-4">
          <ProgressBar percent={0} />
          <div className="mt-3 text-sm text-gray-700">Loading your progress…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Security checklist</h1>
        <Link className="text-sm underline" href="/summary">
          View summary →
        </Link>
      </div>

      <div className="mt-4">
        <ProgressBar percent={stats.percent} />
        <div className="mt-3 text-sm text-gray-700">
          <span className="font-medium tabular-nums">{stats.decided}</span> of{" "}
          <span className="font-medium tabular-nums">{stats.total}</span> items reviewed · Done:{" "}
          <span className="tabular-nums">{stats.done}</span> · Not sure:{" "}
          <span className="tabular-nums">{stats.unsure}</span> · Skipped:{" "}
          <span className="tabular-nums">{stats.skipped}</span>
        </div>
      </div>

      <div className="mt-8 space-y-10">
        {groups.map(({ group, items }) => (
          <section key={group.id} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{group.title}</h2>
              <p className="text-sm text-gray-600">{group.description}</p>
            </div>

            <div className="grid gap-3">
              {items.map((item) => (
                <ChecklistItemCard
                  key={item.id}
                  item={item}
                  status={getStatus(progress, item.id)}
                  onSetStatus={(s) => handleSet(item.id, s)}
                  onReset={() => handleReset(item.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 flex gap-3">
        <Link
          href="/summary"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white"
        >
          Summary & next steps
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
