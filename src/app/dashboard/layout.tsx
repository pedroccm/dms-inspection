"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

const allNavItems = [
  { label: "Painel", href: "/dashboard", icon: "grid", adminOnly: false },
  {
    label: "Ordens de Servico",
    href: "/dashboard/ordens",
    icon: "clipboard",
    adminOnly: false,
  },
  {
    label: "Equipamentos",
    href: "/dashboard/equipamentos",
    icon: "cpu",
    adminOnly: false,
  },
  {
    label: "Inspecoes",
    href: "/dashboard/inspecoes",
    icon: "search",
    adminOnly: false,
  },
  {
    label: "Relatorios",
    href: "/dashboard/relatorios",
    icon: "file-text",
    adminOnly: false,
  },
  {
    label: "Usuarios",
    href: "/dashboard/usuarios",
    icon: "users",
    adminOnly: true,
  },
];

function Sidebar() {
  const pathname = usePathname();
  const { profile, isAdmin, loading, signOut } = useAuth();

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">DMS Inspection</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        {!loading && profile && (
          <div className="mb-3 px-4">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile.full_name}
            </p>
            <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 text-left"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex bg-gray-100">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </AuthProvider>
  );
}
