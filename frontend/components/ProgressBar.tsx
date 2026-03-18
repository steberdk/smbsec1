"use client";

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-medium">Progress</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden shadow-inner">
        <div
          className="h-3 rounded-full progress-gradient transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
