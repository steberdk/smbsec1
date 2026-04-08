"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { apiFetch } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type InviteInfo = {
  email: string;
  orgName: string;
  role: string;
};

type AcceptStage = "accepting" | "success" | "error";

const SESSION_KEY = "smbsec_pending_invite_token";

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

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteInfoError, setInviteInfoError] = useState<string | null>(null);
  // inviteInfoLoading = true when token exists but we have neither data nor error yet
  const inviteInfoLoading = Boolean(inviteToken) && inviteInfo === null && inviteInfoError === null;
  const [acceptStage, setAcceptStage] = useState<AcceptStage | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const hasStarted = useRef(false);

  // On mount: persist token to sessionStorage so it survives the login redirect
  useEffect(() => {
    if (inviteToken) {
      try {
        sessionStorage.setItem(SESSION_KEY, inviteToken);
      } catch {
        // sessionStorage unavailable (e.g. private browsing restrictions) — ignore
      }
    }
  }, [inviteToken]);

  // Fetch invite info (public endpoint — works before login)
  useEffect(() => {
    if (!inviteToken) return;
    fetch(`/api/invites/pending?token=${encodeURIComponent(inviteToken)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setInviteInfoError((body as { error?: string }).error ?? "Invite not found");
          return;
        }
        const data = await res.json() as InviteInfo;
        setInviteInfo(data);
      })
      .catch(() => setInviteInfoError("Could not load invite details."));
  }, [inviteToken]);

  // Redirect to login if not authenticated (after invite info is loaded or fails)
  useEffect(() => {
    if (sessionLoading || authToken) return;
    if (!inviteToken) return;
    // Build login URL — pre-fill email if we have it, and pass next so token is restored
    const next = encodeURIComponent(`/accept-invite?token=${inviteToken}`);
    const emailParam = inviteInfo?.email ? `&email=${encodeURIComponent(inviteInfo.email)}` : "";
    router.replace(`/login?next=${next}${emailParam}`);
  }, [sessionLoading, authToken, inviteToken, inviteInfo, router]);

  // Determine if user needs to provide a name (no full_name in metadata)
  useEffect(() => {
    if (!authToken) return;
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const fullName = data?.user?.user_metadata?.full_name as string | undefined;
      setNeedsName(!fullName || fullName.trim() === "");
    });
  }, [authToken]);

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
        // Clear the sessionStorage token on success
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
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

  // Invite token expired or not found (from public endpoint check)
  if (!inviteInfoLoading && inviteInfoError) {
    return (
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="font-medium text-amber-800">Invitation not available</p>
          <p className="mt-1 text-sm text-amber-700">
            This invitation has expired or has already been used. Ask your administrator to send a new invite link.
          </p>
        </div>
      </main>
    );
  }

  // Loading session or invite info
  if (sessionLoading || !authToken || inviteInfoLoading) {
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
        <p className="text-2xl">🎉</p>
        <p className="mt-2 text-lg font-semibold text-green-700">You&apos;re in!</p>
        <p className="mt-1 text-sm text-gray-600">Taking you to your workspace...</p>
      </main>
    );
  }

  // Error state
  if (acceptStage === "error") {
    const isWrongEmail = errorMsg?.includes("different email address");

    async function handleLogout() {
      await getSupabaseBrowserClient().auth.signOut();
      try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
      const next = encodeURIComponent(`/accept-invite?token=${inviteToken}`);
      router.replace(`/login?next=${next}`);
    }

    return (
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
          <p className="font-medium text-red-800">Could not accept invite</p>
          {isWrongEmail ? (
            <p className="mt-1 text-sm text-red-700">
              This invite was sent to a different email address. You&apos;re signed in as <strong>{userEmail ?? "another account"}</strong>. Sign out and try again with the invited email.
            </p>
          ) : (
            <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
          )}
        </div>
        {isWrongEmail ? (
          <button
            onClick={handleLogout}
            className="mt-4 rounded-lg bg-gray-900 text-white text-sm px-4 py-2"
          >
            Sign out and try again
          </button>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            If the link has expired, ask the person who invited you to send a new one.
          </p>
        )}
      </main>
    );
  }

  // Main confirmation card (default: authenticated + has token + not yet accepted)
  const roleLabel = inviteInfo?.role === "org_admin" ? "Owner" : "Employee";

  return (
    <main className="max-w-md mx-auto px-4 py-20">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-900">
          You&apos;ve been invited to join <span className="text-teal-700">{inviteInfo?.orgName ?? "your organisation"}</span>
        </h1>

        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <p>
            You&apos;ll join as <strong>{roleLabel}</strong>
          </p>
          <p>
            Signing in as <strong>{userEmail}</strong>
          </p>
        </div>

        <form onSubmit={handleAccept} className="mt-6 space-y-4">
          {needsName && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Your name <span className="text-xs text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
                placeholder="Alex Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-gray-400">
                Shown to your team on the dashboard instead of your email.
              </p>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-teal-700 text-white py-2.5 text-sm font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all"
          >
            Accept invitation
          </button>
        </form>
      </div>
    </main>
  );
}
