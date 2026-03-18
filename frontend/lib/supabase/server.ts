/**
 * Server-side Supabase client factory.
 *
 * Uses the service role key for all DB operations. Forwarding a user JWT to
 * PostgREST for RLS is unreliable with the sb_publishable_ anon key format in
 * Supabase JS v2 — auth.uid() does not match the validated user in the DB
 * context even when the JWT reaches PostgREST correctly.
 *
 * This is safe because every route:
 *   1. Validates the caller's JWT via auth.getUser(token) before any DB work.
 *   2. Checks org membership and role (getOrgMembership / hasRole).
 *   3. Scopes all queries to the caller's org_id.
 * RLS remains enabled on all tables as a defence-in-depth layer for direct
 * DB access. The service role key never appears in NEXT_PUBLIC_ env vars.
 *
 * Never import this in browser/client components.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

/**
 * Returns a service-role Supabase client for DB operations, with auth.getUser
 * patched to validate the caller's JWT (not the service role identity).
 */
export function supabaseForRequest(req: Request): SupabaseClient {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: "smbsec1" },
  }) as unknown as ReturnType<typeof createClient>;

  // Patch auth.getUser so routes validate the caller's JWT, not the service
  // role identity. Uses a separate anon client so the service key is never
  // used for identity validation. Passing the token explicitly to getUser()
  // forces a real network call to /auth/v1/user regardless of session state.
  if (token) {
    const authClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    client.auth.getUser = (jwt?: string) => authClient.auth.getUser(jwt ?? token);
  }

  return client;
}
