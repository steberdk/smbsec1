import { ChecklistProgress } from "./types";

/**
 * Remote API helpers (only used when logged in)
 */
export async function fetchRemoteProgress(accessToken: string) {
  const res = await fetch("/api/checklist", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET /api/checklist failed (${res.status}): ${txt}`);
  }

  return (await res.json()) as { data: ChecklistProgress | null; updated_at: string | null };
}

export async function putRemoteProgress(accessToken: string, progress: ChecklistProgress) {
  const res = await fetch("/api/checklist", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(progress),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`PUT /api/checklist failed (${res.status}): ${txt}`);
  }

  return (await res.json()) as { ok: true };
}
