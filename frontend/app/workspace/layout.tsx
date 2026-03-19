"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { WorkspaceProvider, useWorkspace } from "@/lib/hooks/useWorkspace";
import { useTranslation } from "@/lib/i18n";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { orgData, isManager, isAdmin, logout } = useWorkspace();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslation();

  const navItems = [
    { href: "/workspace", label: t("nav.home"), show: true },
    { href: "/workspace/checklist", label: t("nav.checklist"), show: true },
    { href: "/workspace/dashboard", label: t("nav.dashboard"), show: true },
    { href: "/workspace/team", label: t("nav.team"), show: isManager },
    { href: "/workspace/assessments", label: t("nav.assessments"), show: isManager },
    { href: "/workspace/campaigns", label: t("nav.campaigns"), show: isAdmin },
    { href: "/workspace/report", label: t("nav.report"), show: isAdmin },
    { href: "/workspace/billing", label: t("nav.billing"), show: isAdmin },
    { href: "/workspace/settings", label: t("nav.settings"), show: isAdmin },
  ];

  function isActive(href: string) {
    if (href === "/workspace") return pathname === "/workspace";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-[#f8fafb]">
      {/* Persistent navigation header */}
      <header className="border-b border-gray-200/60 bg-white/90 backdrop-blur-sm sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Link href="/workspace" className="flex items-center gap-1.5">
                <span className="text-teal-700 font-bold text-sm tracking-tight">smbsec</span>
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/workspace" className="text-sm font-medium text-gray-700 truncate max-w-[200px]" title={orgData.org.name}>
                {orgData.org.name}
              </Link>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems
                .filter((item) => item.show)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      isActive(item.href)
                        ? "bg-teal-50 text-teal-800 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              <button
                onClick={logout}
                className="ml-2 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
              >
                {t("nav.logout")}
              </button>
            </nav>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700"
              aria-label="Toggle menu"
            >
              {menuOpen ? "\u2715" : "\u2630"}
            </button>
          </div>
        </div>

        {/* Mobile slide-out menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="max-w-4xl mx-auto px-4 py-3 space-y-1">
              {navItems
                .filter((item) => item.show)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-teal-50 text-teal-800"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-gray-600"
              >
                {t("nav.logout")}
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
