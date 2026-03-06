"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type SessionState = {
  token: string | null;
  userId: string | null;
  email: string | null;
  loading: boolean;
};

/**
 * Returns the current Supabase session, updating reactively on auth changes.
 * token is null when the user is not signed in.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    token: null,
    userId: null,
    email: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowserClient();

    // Use onAuthStateChange as the single source of truth.
    // It fires INITIAL_SESSION after all async initialisation is done,
    // including processing the URL hash tokens from magic link redirects.
    // Calling getSession() separately races against hash processing and can
    // return null before the session is established, causing a false redirect.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState({
        token: session?.access_token ?? null,
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
        loading: false,
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
