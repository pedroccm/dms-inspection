"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ServerProfileProvider } from "@/contexts/server-profile-context";

function ServerProfileProviderWrapper({ profile, children }: { profile: { full_name: string; role: string } | null; children: React.ReactNode }) {
  return <ServerProfileProvider profile={profile}>{children}</ServerProfileProvider>;
}

const allNavItems = [
  { label: "Painel", href: "/dashboard", icon: "grid", adminOnly: false, executorOnly: false },
  {
    label: "Ordens de Serviço",
    href: "/dashboard/ordens",
    icon: "clipboard",
    adminOnly: false,
    executorOnly: false,
  },
  {
    label: "Clientes",
    href: "/dashboard/clientes",
    icon: "building",
    adminOnly: true,
    executorOnly: false,
  },
  {
    label: "Contratos",
    href: "/dashboard/contratos",
    icon: "file-contract",
    adminOnly: true,
    executorOnly: false,
  },
  {
    label: "Relatórios",
    href: "/dashboard/relatorios",
    icon: "file-text",
    adminOnly: true,
    executorOnly: false,
  },
  {
    label: "Usuários",
    href: "/dashboard/usuarios",
    icon: "users",
    adminOnly: true,
    executorOnly: false,
  },
  {
    label: "Configurações",
    href: "/dashboard/configuracoes",
    icon: "settings",
    adminOnly: true,
    executorOnly: false,
  },
];

function Sidebar({
  open,
  onClose,
  initialProfile,
}: {
  open: boolean;
  onClose: () => void;
  initialProfile: { full_name: string; role: string } | null;
}) {
  const pathname = usePathname();
  const { profile: authProfile, isAdmin: authIsAdmin, loading } = useAuth();

  // Use auth context profile if available, otherwise fall back to server-provided profile
  const profile = authProfile ?? initialProfile;
  const isAdmin = authIsAdmin || initialProfile?.role === "admin";

  const navItems = allNavItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.executorOnly && isAdmin) return false;
    return true;
  });

  return (
    <>
      {/* Backdrop - visible only on tablet portrait / mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-[#1B2B5E] flex flex-col shrink-0
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0 lg:transform-none
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">DMS Inspection</h1>
          {/* Close button - visible only on mobile/tablet */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 -mr-2 rounded-lg text-white/60 hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  isActive
                    ? "bg-[rgba(245,166,35,0.1)] text-[#F5A623]"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          {profile && (
            <div className="mb-3 px-4">
              <p className="text-sm font-medium text-white truncate">
                {profile.full_name}
              </p>
              <p className="text-xs text-white/50">{profile.role === "admin" ? "Master" : "Inspetor"}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              // Fire and forget signout, redirect immediately
              import("@/lib/supabase/client").then(({ createClient }) => {
                createClient().auth.signOut().catch(() => {});
              }).catch(() => {});
              window.location.href = "/login";
            }}
            className="w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg text-left min-h-[44px] transition-colors cursor-pointer"
          >
            ← Sair
          </button>
          <p className="px-4 pt-1 text-[10px] text-white/20">v{process.env.NEXT_PUBLIC_APP_VERSION}</p>
        </div>
      </aside>
    </>
  );
}

function DashboardContent({ children, initialProfile }: { children: React.ReactNode; initialProfile: { full_name: string; role: string } | null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (for mobile/tablet)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Find current page title
  const currentNav = allNavItems.find((item) => item.href === pathname);
  const pageTitle = currentNav?.label ?? "DMS Inspection";

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} initialProfile={initialProfile} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar - visible only on mobile/tablet */}
        <header className="lg:hidden sticky top-0 z-20 bg-[#1B2B5E] border-b border-white/10 px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-white/80 hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Abrir menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-white truncate">
            {pageTitle}
          </h2>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardShell({
  children,
  initialProfile,
}: {
  children: React.ReactNode;
  initialProfile: { full_name: string; role: string } | null;
}) {
  return (
    <ServerProfileProviderWrapper profile={initialProfile}>
      <AuthProvider>
        <DashboardContent initialProfile={initialProfile}>{children}</DashboardContent>
      </AuthProvider>
    </ServerProfileProviderWrapper>
  );
}
