"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function sanitizeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/workspace";
  return raw;
}

/** Extract invite token from a next= param that points to /accept-invite */
function extractInviteToken(next: string): string | null {
  try {
    const url = new URL(next, "http://localhost");
    if (url.pathname === "/accept-invite") {
      return url.searchParams.get("token");
    }
  } catch {
    // not a URL — try simple string check
    const match = next.match(/\/accept-invite\?.*token=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="max-w-md mx-auto px-4 py-10"><p className="text-sm text-gray-600">Loading...</p></main>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = sanitizeNext(searchParams.get("next"));

  // Detect invite context
  const inviteToken = extractInviteToken(next);
  const isInviteContext = Boolean(inviteToken);

  // Detect signup intent (landing "Sign up free" CTA appends ?intent=signup). F-024.
  const isSignupIntent = searchParams.get("intent") === "signup";

  // Email pre-fill from ?email= param
  const emailParam = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(emailParam);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "verifying">("idle");
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");

  // If we have an invite token, persist it to sessionStorage so it survives
  // any auth redirect that might hit WorkspaceProvider or onboarding first.
  useEffect(() => {
    if (inviteToken) {
      try {
        sessionStorage.setItem("smbsec_pending_invite_token", inviteToken);
      } catch {
        // sessionStorage unavailable — ignore
      }
    }
  }, [inviteToken]);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (next !== "/workspace") callbackUrl.searchParams.set("next", next);
    const redirectTo = callbackUrl.toString();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }

    setStatus("sent");
  }

  async function handleVerifyOtp(codeOverride?: string) {
    const code = codeOverride ?? otpCode;
    if (code.length < 6) return;
    setStatus("verifying");
    setError(null);

    const supabase = getSupabaseBrowserClient();

    // Try "magiclink" type first (existing users), then "signup" (new users).
    // Supabase uses different token types depending on whether the email is new.
    const { error: mlError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "magiclink",
    });

    if (!mlError) {
      router.replace(next);
      return;
    }

    const { error: signupError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    if (signupError) {
      setStatus("sent");
      setError(signupError.message);
      return;
    }

    router.replace(next);
  }

  function handleOtpChange(value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 8);
    setOtpCode(cleaned);
    // Auto-submit when 6+ digits entered
    if (cleaned.length >= 6 && status !== "verifying") {
      handleVerifyOtp(cleaned);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafb] flex flex-col">
      {/* Header bar */}
      <header className="border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-md mx-auto px-4 h-12 flex items-center">
          <Link href="/" className="text-teal-700 font-bold text-sm tracking-tight">smbsec</Link>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center pt-12 pb-10 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            {isSignupIntent ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Create your free account</h1>
                <p className="text-sm text-gray-600 mt-2">
                  Enter your email — we&apos;ll send you a link to get started. No password needed.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                <p className="text-sm text-gray-600 mt-2">
                  Enter your email — we&apos;ll send you a sign-in link.
                </p>
              </>
            )}

            {/* Email form — shown when not yet sent */}
            {status !== "sent" && status !== "verifying" && (
              <form onSubmit={handleSendLink} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>

                <button
                  className="w-full rounded-lg bg-teal-700 text-white py-2.5 font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all disabled:opacity-60"
                  disabled={status === "sending"}
                  type="submit"
                >
                  {status === "sending" ? "Sending..." : "Send sign-in link"}
                </button>

                {status === "error" && (
                  <p className="text-sm text-red-700">
                    {error?.includes("rate limit")
                      ? "Too many attempts — please try again in a few minutes."
                      : error}
                  </p>
                )}
              </form>
            )}

            {/* OTP + link sent — shown after email is sent */}
            {(status === "sent" || status === "verifying") && (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                  <p className="text-sm text-green-700">
                    Sent! Check your email for a sign-in link or enter the code below.
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  <p className="text-xs text-gray-600">
                    Sent to: <strong>{email}</strong>
                  </p>
                </div>

                {/* OTP code entry */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Sign-in code
                  </label>
                  <p className="text-xs text-gray-500">
                    Enter the code from your email. This works even if you opened the email on a different device.
                  </p>
                  <div className="flex gap-2 mt-1">
                    <input
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6,8}"
                      maxLength={8}
                      value={otpCode}
                      onChange={(e) => handleOtpChange(e.target.value)}
                      placeholder="00000000"
                      autoComplete="one-time-code"
                      disabled={status === "verifying"}
                      onKeyDown={(e) => { if (e.key === "Enter" && otpCode.length >= 6) handleVerifyOtp(); }}
                    />
                    <button
                      type="button"
                      onClick={() => handleVerifyOtp()}
                      disabled={otpCode.length < 6 || status === "verifying"}
                      className="rounded-lg bg-teal-700 text-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-teal-800 transition-all disabled:opacity-60"
                    >
                      {status === "verifying" ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Or click the link in the email to sign in directly.</p>
                  <button
                    type="button"
                    onClick={() => { setStatus("idle"); setError(null); setOtpCode(""); setEmail(""); }}
                    className="text-teal-700 underline hover:text-teal-800"
                  >
                    Use a different email
                  </button>
                </div>

                {error && (
                  <p className="text-sm text-red-700">{error}</p>
                )}
              </div>
            )}
          </div>

          {/* Context-aware info box */}
          {isInviteContext ? (
            <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50 shadow-sm px-5 py-4">
              <p className="text-xs font-medium text-teal-800 mb-1">Joining an existing team?</p>
              <p className="text-xs text-teal-700">
                Log in with the email address your invitation was sent to — then you can accept in one click.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4">
              <p className="text-xs font-medium text-gray-700 mb-2">New here? Here&apos;s how it works:</p>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Enter your email — we&apos;ll send a secure link and code</li>
                <li>Name your organisation (takes 2 minutes)</li>
                <li>Invite your team and start your security review</li>
              </ol>
            </div>
          )}

          <div className="mt-4 text-sm">
            <Link className="text-gray-500 hover:text-gray-700 underline" href="/">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
