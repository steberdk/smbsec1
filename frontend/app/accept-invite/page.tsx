"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { apiFetch } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AcceptStage = "accepting" | "success" | "error";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<main className="max-w-md mx-auto px-4 py-20 text-center"><p className="text-sm text-gray-600">Loading...</p></main>}>
      <AcceptInviteInner />
    </Suspense>
  );
}

function AcceptInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const inviteToken = params.get("token");
  const { token: authToken, email: userEmail, loading: sessionLoading } = useSession();

  const [acceptStage, setAcceptStage] = useState<AcceptStage | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const hasStarted = useRef(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (sessionLoading || authToken) return;
    if (!inviteToken) return;
    const next = encodeURIComponent(`/accept-invite?token=${inviteToken}`);
    router.replace(`/login?next=${next}`);
  }, [sessionLoading, authToken, inviteToken, router]);

  function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!authToken || !inviteToken || hasStarted.current) return;
    hasStarted.current = true;
    setAcceptStage("accepting");

    apiFetch("/api/invites/accept", authToken, {
      method: "POST",
      body: JSON.stringify({
        token: inviteToken,
        display_name: displayName.trim() || undefined,
      }),
    })
      .then(() => {
        setAcceptStage("success");
        setTimeout(() => router.replace("/workspace"), 1500);
      })
      .catch((e: unknown) => {
        hasStarted.current = false;
        setAcceptStage("error");
        setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      });
  }

  // No token in URL
  if (!inviteToken) {
    return (
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
          <p className="font-medium text-red-800">Could not accept invite</p>
          <p className="mt-1 text-sm text-red-700">No invite token found in the URL.</p>
        </div>
      </main>
    );
  }

  // Still loading session
  if (sessionLoading || !authToken) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-sm text-gray-600">Loading...</p>
      </main>
    );
  }

  // API call in progress
  if (acceptStage === "accepting") {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-sm text-gray-600">Joining organisation...</p>
      </main>
    );
  }

  // Success
  if (acceptStage === "success") {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-lg font-semibold text-green-700">Invite accepted!</p>
        <p className="mt-2 text-sm text-gray-600">Redirecting to your workspace...</p>
      </main>
    );
  }

  // Error
  if (acceptStage === "error") {
    const isWrongEmail = errorMsg?.includes("different email address");

    async function handleLogout() {
      await getSupabaseBrowserClient().auth.signOut();
      const next = encodeURIComponent(`/accept-invite?token=${inviteToken}`);
      router.replace(`/login?next=${next}`);
    }

    return (
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
          <p className="font-medium text-red-800">Could not accept invite</p>
          <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
        </div>
        {isWrongEmail ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">
              You are signed in as <strong>{userEmail ?? "another account"}</strong>.
              Sign out and log in with the email address this invite was sent to.
            </p>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-gray-900 text-white text-sm px-4 py-2"
            >
              Sign out and try again
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            If the link has expired, ask the person who invited you to send a new one.
          </p>
        )}
      </main>
    );
  }

  // Name prompt (default when authenticated + has token + not yet started)
  return (
    <main className="max-w-md mx-auto px-4 py-20">
      <div className="rounded-xl border border-gray-200 p-5">
        <p className="text-lg font-semibold text-gray-900">Join your team</p>
        <p className="mt-1 text-sm text-gray-500">
          You are signing in as <strong>{userEmail}</strong>.
        </p>

        <form onSubmit={handleAccept} className="mt-5 space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Your name <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Alex Smith"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-gray-400">
              Shown to your team on the dashboard instead of your email.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-gray-900 text-white py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Accept invite
          </button>
        </form>
      </div>
    </main>
  );
}
