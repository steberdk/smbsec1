/**
 * Browser-side API fetch helper.
 * Adds Authorization header and handles JSON parsing + error extraction.
 * Use this in all client components that call /api/* routes.
 */

export async function apiFetch<T = unknown>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const message = (body as { error?: string }).error ?? `Request failed: ${res.status}`;
    const err = new Error(message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}
