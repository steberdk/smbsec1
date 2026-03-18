"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspaceProvider, useWorkspace } from "@/lib/hooks/useWorkspace";

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

  const navItems = [
    { href: "/workspace", label: "Home", show: true },
    { href: "/workspace/checklist", label: "Checklist", show: true },
    { href: "/workspace/dashboard", label: "Dashboard", show: true },
    { href: "/workspace/team", label: "Team", show: isManager },
    { href: "/workspace/assessments", label: "Assessments", show: isManager },
    { href: "/workspace/settings", label: "Settings", show: isAdmin },
  ];

  function isActive(href: string) {
    if (href === "/workspace") return pathname === "/workspace";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen">
      {/* Persistent navigation header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/workspace" className="text-sm font-semibold text-gray-900 truncate max-w-[240px]" title={orgData.org.name}>
              {orgData.org.name}
            </Link>

            <nav className="flex items-center gap-1 overflow-x-auto">
              {navItems
                .filter((item) => item.show)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive(item.href)
                        ? "bg-gray-100 text-gray-900"
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
                Log out
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
