import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { getDashboardCounts } from "@/lib/queries";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  const isAdmin = profile.role === "admin";

  let counts = {
    openOrders: 0,
    inspectionsToday: 0,
    equipmentCount: 0,
    pendingReviews: 0,
  };

  try {
    counts = await getDashboardCounts();
  } catch {
    // RLS may return 0 rows — that's expected
  }

  const adminStats = [
    { label: "Ordens Abertas", value: counts.openOrders },
    { label: "Inspeções Hoje", value: counts.inspectionsToday },
    { label: "Equipamentos", value: counts.equipmentCount },
    { label: "Pendentes de Revisão", value: counts.pendingReviews },
  ];

  const inspectorStats = [
    { label: "Minhas Ordens Ativas", value: counts.openOrders, href: "/dashboard/ordens" },
    { label: "Minhas Inspeções Pendentes", value: counts.pendingReviews },
    { label: "Inspeções Hoje", value: counts.inspectionsToday },
    { label: "Equipamentos", value: counts.equipmentCount },
  ];

  const stats = isAdmin ? adminStats : inspectorStats;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2B5E]">Painel</h1>
      <p className="mt-2 text-gray-600">
        {isAdmin
          ? "Visão geral do sistema de inspeção DMS."
          : `Bem-vindo, ${profile.full_name}. Aqui estão suas atividades.`}
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const content = (
            <>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stat.value}
              </p>
              {stat.value === 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  Nenhum dado encontrado
                </p>
              )}
              {"href" in stat && stat.href && (
                <p className="mt-2 text-xs text-[#F5A623] font-medium">Ver todas →</p>
              )}
            </>
          );

          if ("href" in stat && stat.href) {
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-[#F5A623] hover:shadow-md transition-all cursor-pointer"
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
