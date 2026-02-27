import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  // Only ever create this in the browser
  if (typeof window === "undefined") {
    throw new Error("Supabase browser client was requested on the server.");
  }

  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // IMPORTANT: don't crash the build by creating a client with undefined values
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Add them to .env.local and to Vercel Environment Variables (Preview + Production), then redeploy."
    );
  }

  browserClient = createClient(url, anonKey);
  return browserClient;
}
