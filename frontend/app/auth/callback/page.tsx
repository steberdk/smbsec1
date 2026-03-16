"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-md mx-auto px-4 py-10">
          <p className="text-sm text-gray-600">Signing you in…</p>
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
  const next = searchParams.get("next") ?? "/workspace";

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let done = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (done) return;
      if (session) {
        done = true;
        subscription.unsubscribe();
        router.replace(next);
      }
      // INITIAL_SESSION with null means hash tokens are still being processed —
      // do nothing and wait for the SIGNED_IN event that follows.
    });

    // Safety net: if no session within 5 s, send to login.
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        subscription.unsubscribe();
        router.replace("/login");
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [next, router]);

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <p className="text-sm text-gray-600">Signing you in…</p>
    </main>
  );
}
