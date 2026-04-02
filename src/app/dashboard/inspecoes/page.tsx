import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getInspections, getLockedInspectionIds } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import type { InspectionStatus } from "@/lib/types";
import { InspectionStatusFilter } from "./status-filter";

const statusConfig: Record<
  InspectionStatus,
  { label: string; variant: "neutral" | "info" | "warning" | "success" }
> = {
  draft: { label: "Rascunho", variant: "neutral" },
  in_progress: { label: "Em Andamento", variant: "info" },
  ready_for_review: { label: "Pronta para Revisao", variant: "warning" },
  submitted: { label: "Enviada", variant: "success" },
  transferred: { label: "Transferida", variant: "neutral" },
};

interface InspecoesPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function InspecoesPage({
  searchParams,
}: InspecoesPageProps) {
  await requireAuth();

  const params = await searchParams;
  const statusFilter = params.status as InspectionStatus | undefined;

  const [inspections, lockedIds] = await Promise.all([
    getInspections(statusFilter ? { status: statusFilter } : undefined),
    getLockedInspectionIds(),
  ]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inspecoes</h1>
        <Link
          href="/dashboard/inspecoes/nova"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
        >
          Nova Inspecao
        </Link>
      </div>

      <div className="mb-6">
        <InspectionStatusFilter currentStatus={statusFilter} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                  Codigo Equipamento
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 hidden sm:table-cell">
                  Ordem de Servico
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 hidden md:table-cell">
                  Inspetor
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 hidden md:table-cell">
                  Data
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {inspections.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Nenhuma inspecao encontrada.
                  </td>
                </tr>
              ) : (
                inspections.map((inspection) => {
                  const config =
                    statusConfig[inspection.status] ?? statusConfig.draft;
                  return (
                    <tr
                      key={inspection.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <span className="flex items-center gap-1.5">
                          {inspection.equipment?.copel_ra_code ?? "—"}
                          {lockedIds.has(inspection.id) && (
                            <span title="Em edicao por outro usuario" className="text-yellow-600">🔒</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                        {inspection.service_order_id
                          ? inspection.service_order_id.slice(0, 8) + "..."
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                        {inspection.inspector?.full_name ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                        {inspection.status === "draft" ||
                        inspection.status === "in_progress" ? (
                          <div>
                            <div>
                              {new Date(
                                inspection.created_at
                              ).toLocaleDateString("pt-BR")}
                            </div>
                            {inspection.updated_at !== inspection.created_at && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                Ultima edicao:{" "}
                                {new Date(
                                  inspection.updated_at
                                ).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          new Date(inspection.created_at).toLocaleDateString(
                            "pt-BR"
                          )
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/inspecoes/${inspection.id}`}
                          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors min-h-[44px]"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
