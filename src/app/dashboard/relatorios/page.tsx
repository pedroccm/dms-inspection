import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const reports = [
  {
    title: "Produtividade por Inspetor",
    description:
      "Visualize o desempenho de cada inspetor: total de inspecoes, itens aprovados, reprovados e taxa de aprovacao.",
    href: "/dashboard/relatorios/produtividade",
    available: true,
  },
  {
    title: "Resumo de Inspecoes",
    description:
      "Visao geral das inspecoes realizadas por periodo, status e equipamento.",
    href: "/dashboard/relatorios/resumo",
    available: false,
  },
];

export default async function RelatoriosPage() {
  await requireAdmin();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Relatorios</h1>
        <p className="mt-1 text-sm text-gray-500">
          Selecione um relatorio para visualizar.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {reports.map((report) => (
          <div
            key={report.title}
            className={`bg-white rounded-lg shadow p-6 ${
              report.available
                ? "hover:shadow-md transition-shadow"
                : "opacity-60"
            }`}
          >
            <h2 className="text-lg font-semibold text-gray-900">
              {report.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{report.description}</p>
            <div className="mt-4">
              {report.available ? (
                <Link
                  href={report.href}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors min-h-[44px]"
                >
                  Ver Relatorio
                </Link>
              ) : (
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                  Em breve
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
