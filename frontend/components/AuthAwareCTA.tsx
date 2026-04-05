"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Client island for the landing page.
 * Shows a "Go to workspace" banner for authenticated users.
 */
export function AuthAwareCTA() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
    });
  }, []);

  if (!authed) return null;

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 mb-6 flex items-center justify-between">
      <p className="text-sm text-teal-800">You are signed in.</p>
      <Link
        href="/workspace"
        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium shadow-sm hover:bg-teal-800 transition-all"
      >
        Go to workspace
      </Link>
    </div>
  );
}

/**
 * Auth-aware header links. Shows "Workspace" instead of "Sign up / Log in" for signed-in users.
 * Renders the default (anonymous) links on the server and during first paint,
 * then swaps to authenticated links if a session is found.
 */
export function AuthAwareHeaderLinks() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
    });
  }, []);

  if (authed) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <Link
          href="/workspace"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-teal-700 text-white font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all"
        >
          Go to workspace
        </Link>
        <Link
          href="/checklist"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:border-gray-400 hover:shadow-md transition-all"
        >
          Browse the checklist
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mt-8">
      <Link
        href="/login"
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-teal-700 text-white font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all"
      >
        Sign up free
      </Link>
      <Link
        href="/checklist"
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:border-gray-400 hover:shadow-md transition-all"
      >
        Browse the checklist
      </Link>
      <Link
        href="/login"
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:border-gray-400 hover:shadow-md transition-all"
      >
        Log in
      </Link>
    </div>
  );
}
