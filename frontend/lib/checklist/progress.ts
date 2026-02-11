import { CHECKLIST } from "./items";
import { ChecklistProgress } from "./types";

export function getStatus(progress: ChecklistProgress, itemId: string) {
  return progress[itemId] ?? "todo";
}

export function computeProgress(progress: ChecklistProgress) {
  const total = CHECKLIST.items.length;

  let done = 0;
  let unsure = 0;
  let skipped = 0;

  for (const item of CHECKLIST.items) {
    const s = getStatus(progress, item.id);
    if (s === "done") done++;
    else if (s === "unsure") unsure++;
    else if (s === "skipped") skipped++;
  }

  const decided = done + unsure + skipped;
  const percent = total === 0 ? 0 : Math.round((decided / total) * 100);

  return { total, decided, done, unsure, skipped, percent };
}
