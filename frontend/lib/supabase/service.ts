/**
 * Service-role Supabase client.
 *
 * Bypasses RLS entirely. Used ONLY for privileged server-side operations
 * that cannot be performed with the user's JWT — specifically invite acceptance,
 * where the accepting user is not yet in org_members when the insert runs.
 *
 * SECURITY RULES:
 *   - Never import this in browser/client components.
 *   - Never expose the service role key via any NEXT_PUBLIC_* variable.
 *   - Never return the raw service client to a caller that does not need it.
 *   - Keep usage to the minimum required operation, then discard the client.
 *
 * The SUPABASE_SERVICE_ROLE_KEY env var is set in:
 *   - frontend/.env.local  (local dev — never commit this file)
 *   - Vercel project environment variables  (production)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

/**
 * Returns a Supabase client with the service role key.
 * Creates a fresh instance per call — safe for serverless environments.
 */
export function supabaseServiceClient(): SupabaseClient {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "smbsec1" },
  }) as unknown as SupabaseClient;
}
