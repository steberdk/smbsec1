"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { apiFetch } from "@/lib/api/client";

type Stage = "loading" | "accepting" | "success" | "error";

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const { token: authToken, loading: sessionLoading } = useSession();

  // Stage is derived from token at mount time — no synchronous setState needed in effects.
  // "accepting" = token present and API call not yet resolved.
  const [stage, setStage] = useState<Stage>(token ? "accepting" : "error");
  const [errorMsg, setErrorMsg] = useState<string | null>(
    token ? null : "No invite token found in the URL."
  );
  // Ref prevents the API call from firing more than once across effect re-runs
  const hasStarted = useRef(false);

  useEffect(() => {
    if (sessionLoading) return;

    if (!authToken) {
      // Redirect to login, preserving the invite URL so we can come back
      const next = encodeURIComponent(`/accept-invite?token=${token ?? ""}`);
      router.replace(`/login?next=${next}`);
      return;
    }

    if (!token || hasStarted.current) return;
    hasStarted.current = true;

    apiFetch("/api/invites/accept", authToken, {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => {
        setStage("success");
        setTimeout(() => router.replace("/workspace"), 1500);
      })
      .catch((e: unknown) => {
        setStage("error");
        setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      });
  }, [sessionLoading, authToken, token, router]);

  if (stage === "accepting") {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-sm text-gray-600">Joining organisation…</p>
      </main>
    );
  }

  if (stage === "success") {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-lg font-semibold text-green-700">Invite accepted!</p>
        <p className="mt-2 text-sm text-gray-600">Redirecting to your workspace…</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 py-20">
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
        <p className="font-medium text-red-800">Could not accept invite</p>
        <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        If the link has expired, ask the person who invited you to send a new one.
      </p>
    </main>
  );
}
