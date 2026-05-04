import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { getDashboardCounts, getEquipmentStatusCounts } from "@/lib/queries";
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

  let equipmentStatus = {
    pendente: 0,
    emInspecao: 0,
    concluido: 0,
    relatorioAprovado: 0,
    cadastrada: 0,
  };

  try {
    counts = await getDashboardCounts();
  } catch {
    // RLS may return 0 rows — that's expected
  }

  try {
    equipmentStatus = await getEquipmentStatusCounts();
  } catch {
    // RLS may return 0 rows — that's expected
  }

  const topStats = [
    { label: "Ordens Abertas", value: counts.openOrders, href: isAdmin ? undefined : "/dashboard/ordens" },
    { label: "Inspeções Hoje", value: counts.inspectionsToday },
  ];

  const equipmentStats = [
    {
      label: "Pendentes",
      value: equipmentStatus.pendente,
      accent: "bg-gray-100 text-gray-700",
      dot: "bg-gray-400",
    },
    {
      label: "Em Inspeção",
      value: equipmentStatus.emInspecao,
      accent: "bg-amber-50 text-amber-800",
      dot: "bg-[#F5A623]",
    },
    {
      label: "Concluído",
      value: equipmentStatus.concluido,
      accent: "bg-blue-50 text-blue-800",
      dot: "bg-blue-500",
    },
    {
      label: "Relatório Aprovado",
      value: equipmentStatus.relatorioAprovado,
      accent: "bg-emerald-50 text-emerald-800",
      dot: "bg-emerald-500",
    },
    {
      label: "Cadastrada",
      value: equipmentStatus.cadastrada,
      accent: "bg-emerald-100 text-emerald-900",
      dot: "bg-emerald-700",
    },
  ];

  const totalEquipments = equipmentStats.reduce((acc, s) => acc + s.value, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2B5E]">Painel</h1>
      <p className="mt-2 text-gray-600">
        {isAdmin
          ? "Visão geral do sistema de inspeção DMS."
          : `Bem-vindo, ${profile.full_name}. Aqui estão suas atividades.`}
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {topStats.map((stat) => {
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
              {stat.href && (
                <p className="mt-2 text-xs text-[#F5A623] font-medium">Ver todas →</p>
              )}
            </>
          );

          if (stat.href) {
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

      <div className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-[#1B2B5E]">
            Equipamentos por Status
          </h2>
          <p className="text-sm text-gray-500">
            Total: <span className="font-semibold text-gray-900">{totalEquipments}</span>
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {equipmentStats.map((stat) => (
            <Link
              key={stat.label}
              href="/dashboard/equipamentos"
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#F5A623] hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${stat.dot}`}
                  aria-hidden="true"
                />
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {stat.label}
                </p>
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {stat.value}
              </p>
              <span
                className={`mt-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stat.accent}`}
              >
                {totalEquipments > 0
                  ? `${Math.round((stat.value / totalEquipments) * 100)}%`
                  : "0%"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
