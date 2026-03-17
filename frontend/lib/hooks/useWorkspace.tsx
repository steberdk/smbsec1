"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./useSession";
import { apiFetch } from "../api/client";
import { getSupabaseBrowserClient } from "../supabase/client";

type OrgData = {
  org: { id: string; name: string; email_platform: string | null };
  membership: {
    user_id: string;
    role: string;
    is_it_executor: boolean;
    has_direct_reports: boolean;
  };
};

type WorkspaceCtx = {
  token: string;
  userId: string;
  orgData: OrgData;
  isManager: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  /** Re-fetch org data (e.g. after settings change) */
  refresh: () => void;
};

const Ctx = createContext<WorkspaceCtx | null>(null);

export function useWorkspace(): WorkspaceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { token, userId, loading: sessionLoading } = useSession();
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !token) {
      router.replace("/login");
    }
  }, [sessionLoading, token, router]);

  // Load org membership
  useEffect(() => {
    if (!token) return;
    apiFetch<OrgData>("/api/orgs/me", token)
      .then(setOrgData)
      .catch((e: unknown) => {
        const status = (e as { status?: number }).status;
        if (status === 404) {
          router.replace("/onboarding");
        } else {
          setLoadError(e instanceof Error ? e.message : "Failed to load organisation.");
        }
      });
  }, [token, router, refreshKey]);

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (sessionLoading || !token || !userId) {
    return null;
  }

  if (loadError) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{loadError}</p>
        </div>
      </main>
    );
  }

  if (!orgData) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-600">Loading...</p>
      </main>
    );
  }

  const isManager = orgData.membership.role === "manager" || orgData.membership.role === "org_admin";
  const isAdmin = orgData.membership.role === "org_admin";

  return (
    <Ctx.Provider
      value={{
        token,
        userId,
        orgData,
        isManager,
        isAdmin,
        logout,
        refresh: () => setRefreshKey((k) => k + 1),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
