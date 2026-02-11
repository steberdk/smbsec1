"use client";

import { ChecklistItem, ChecklistStatus } from "@/lib/checklist/types";

const statusStyles: Record<ChecklistStatus, string> = {
  todo: "border-gray-200",
  done: "border-green-600",
  unsure: "border-amber-600",
  skipped: "border-slate-500",
};

const statusLabel: Record<ChecklistStatus, string> = {
  todo: "Not started",
  done: "Done",
  unsure: "Not sure",
  skipped: "Skipped",
};

export function ChecklistItemCard({
  item,
  status,
  onSetStatus,
  onReset,
}: {
  item: ChecklistItem;
  status: ChecklistStatus;
  onSetStatus: (s: ChecklistStatus) => void;
  onReset: () => void;
}) {
  return (
    <div className={`rounded-xl border p-4 bg-white ${statusStyles[status]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-600 mb-1">{item.timeEstimate}</div>
          <h3 className="text-base font-semibold leading-tight">{item.title}</h3>
          <p className="text-sm text-gray-700 mt-2">{item.outcome}</p>
        </div>

        <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 whitespace-nowrap">
          {statusLabel[status]}
        </div>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-gray-800 font-medium">
          Why & how
        </summary>
        <div className="mt-2 text-sm text-gray-700">
          <p className="mb-2">{item.whyItMatters}</p>
          <ul className="list-disc pl-5 space-y-1">
            {item.steps.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
      </details>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm"
          onClick={() => onSetStatus("done")}
          type="button"
        >
          ✅ Done
        </button>

        <button
          className="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm"
          onClick={() => onSetStatus("unsure")}
          type="button"
        >
          ❓ Not sure
        </button>

        <button
          className="px-3 py-2 rounded-lg bg-slate-600 text-white text-sm"
          onClick={() => onSetStatus("skipped")}
          type="button"
        >
          ⏸ Skip
        </button>

        <button
          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm"
          onClick={onReset}
          type="button"
        >
          ↩ Reset
        </button>
      </div>
    </div>
  );
}
