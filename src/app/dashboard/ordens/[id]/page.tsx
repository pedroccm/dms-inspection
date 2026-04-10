import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getServiceOrderById, getInspectionsByServiceOrderId } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { ExportOrderButton } from "./export-order-button";
import { PdfOrderButton } from "./pdf-order-button";
import type { ServiceOrderStatus, InspectionStatus } from "@/lib/types";

const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  open: "Aberta",
  in_progress: "Em Andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const STATUS_VARIANTS: Record<ServiceOrderStatus, "info" | "warning" | "success" | "neutral"> = {
  open: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "neutral",
};

const INSPECTION_STATUS_CONFIG: Record<
  InspectionStatus,
  { label: string; variant: "neutral" | "info" | "warning" | "success" | "danger" }
> = {
  disponivel: { label: "Disponível", variant: "info" },
  draft: { label: "Rascunho", variant: "neutral" },
  in_progress: { label: "Em Andamento", variant: "warning" },
  ready_for_review: { label: "Pronta para Revisão", variant: "warning" },
  aprovado: { label: "Aprovado", variant: "success" },
  relatorio_reprovado: { label: "Relatório Reprovado", variant: "danger" },
  equipamento_reprovado: { label: "Equipamento Reprovado", variant: "danger" },
  transferred: { label: "Transferida", variant: "neutral" },
};


interface OrdemDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrdemDetailPage({ params }: OrdemDetailPageProps) {
  await requireAuth();

  const { id } = await params;

  let order;
  try {
    order = await getServiceOrderById(id);
  } catch {
    notFound();
  }

  if (!order) {
    notFound();
  }

  // Fetch inspection fichas for this order
  let fichas: Awaited<ReturnType<typeof getInspectionsByServiceOrderId>> = [];
  try {
    fichas = await getInspectionsByServiceOrderId(id);
  } catch {
    // Non-critical, show empty
  }

  const isCompleted = order.status === "completed" || order.status === "cancelled";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B5E]">
            {order.order_number ?? order.title}
          </h1>
          {order.order_number && order.title !== order.order_number && (
            <p className="text-sm text-gray-500 mt-1">{order.title}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <PdfOrderButton orderId={order.id} />
          <ExportOrderButton orderId={order.id} />
          <Link
            href="/dashboard/ordens"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            Voltar
          </Link>
        </div>
      </div>

      {/* Order details */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Dados da Ordem
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          <div>
            <dt className="text-sm font-medium text-gray-500">Número da O.S.</dt>
            <dd className="mt-1 text-sm font-semibold text-[#1B2B5E]">
              {order.order_number ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Cliente</dt>
            <dd className="mt-1 text-sm text-gray-900">{order.client_name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Qtd. Equipamentos</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.equipment_count ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Local</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.inspection_location?.name ?? order.location ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Executor Responsável
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.assignee?.full_name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Equipe</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.team?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <Badge variant={STATUS_VARIANTS[order.status]}>
                {STATUS_LABELS[order.status]}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Data Início</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.start_date
                ? new Date(order.start_date).toLocaleDateString("pt-BR")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Data Solicitação Cliente</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.client_request_date
                ? new Date(order.client_request_date).toLocaleDateString("pt-BR")
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Inspection Fichas */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Fichas de Inspeção ({fichas.length})
          </h2>
        </div>
        {fichas.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma ficha de inspeção criada para esta ordem.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-[#1B2B5E]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                    #
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                    Número 052R
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                    Número 300
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white hidden sm:table-cell">
                    Reivindicado por
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {fichas.map((ficha, idx) => {
                  const config = INSPECTION_STATUS_CONFIG[ficha.status] ?? INSPECTION_STATUS_CONFIG.draft;
                  const claimedUser = (ficha as unknown as Record<string, unknown>).claimed_user as { full_name: string } | null;
                  return (
                    <tr
                      key={ficha.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {ficha.numero_052r ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {ficha.numero_300 ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={config.variant}>
                          {config.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                        {claimedUser?.full_name ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/inspecoes/${ficha.id}`}
                          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#F5A623] bg-[#FFF4E0] rounded-lg hover:bg-[#FFE8C0] transition-colors min-h-[44px]"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
