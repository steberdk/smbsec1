"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function sanitizeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/workspace";
  return raw;
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-md mx-auto px-4 py-10">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-100 rounded w-48" />
          </div>
        </main>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let done = false;

    // PKCE flow: exchange the ?code= parameter for a session
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error && !done) {
          done = true;
          router.replace(next);
        }
      });
    }

    // Fallback: listen for auth state change (handles edge cases)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (done) return;
      if (session) {
        done = true;
        subscription.unsubscribe();
        router.replace(next);
      }
    });

    // Safety net: if no session within 10 s, show error.
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        subscription.unsubscribe();
        setTimedOut(true);
      }
    }, 10000);

    return () => {
      done = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [code, next, router]);

  if (timedOut) {
    return (
      <main className="max-w-md mx-auto px-4 py-10">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-medium text-amber-800">Something went wrong</p>
          <p className="mt-1 text-xs text-amber-700">
            We could not complete the sign-in. This can happen if the link expired or was opened in a different browser.
          </p>
          <Link
            href="/login"
            className="mt-3 inline-block rounded-lg bg-teal-700 text-white px-4 py-2 text-sm hover:bg-teal-800 transition-colors"
          >
            Try again
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Signing you in...</p>
        </div>
        <p className="text-xs text-gray-400">This should only take a moment.</p>
      </div>
    </main>
  );
}
