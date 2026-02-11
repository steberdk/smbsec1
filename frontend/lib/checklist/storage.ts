import { ChecklistProgress, ChecklistStatus } from "./types";
import { CHECKLIST } from "./items";

const STORAGE_KEY = `smbsec_checklist_v${CHECKLIST.version}`;

export function loadProgress(): ChecklistProgress {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ChecklistProgress;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function saveProgress(progress: ChecklistProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function setItemStatus(
  progress: ChecklistProgress,
  itemId: string,
  status: ChecklistStatus
): ChecklistProgress {
  const next = { ...progress, [itemId]: status };
  saveProgress(next);
  return next;
}

export function clearProgress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
