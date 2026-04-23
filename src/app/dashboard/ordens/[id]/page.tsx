import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import {
  getServiceOrderById,
  getEquipmentByServiceOrderId,
  getClients,
  getContracts,
  getInspectionLocations,
  getInspectors,
} from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { ExportOrderButton } from "./export-order-button";
import { PdfOrderButton } from "./pdf-order-button";
import { DeleteOrderButton } from "./delete-order-button";
import { AdminOnly } from "@/components/admin-only";
import { EditEquipmentNumbers } from "./edit-equipment-numbers";
import { IncludeEquipmentButton } from "./include-equipment-button";
import { EditOrderButton } from "./edit-order-button";
import { RemoveEquipmentButton } from "./remove-equipment-button";
import { OrderStatusActions } from "./order-status-actions";
import { getProfile } from "@/lib/auth";
import type { ServiceOrderStatus, InspectionStatus } from "@/lib/types";

const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  open: "Aberta",
  in_progress: "Aberta",
  aprovada: "Aberta",
  finalizada: "Finalizada",
  medida: "Medida",
  faturada: "Faturada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const STATUS_VARIANTS: Record<ServiceOrderStatus, "info" | "warning" | "success" | "neutral"> = {
  open: "info",
  in_progress: "info",
  aprovada: "info",
  finalizada: "success",
  medida: "success",
  faturada: "success",
  completed: "success",
  cancelled: "neutral",
};

/**
 * Derive equipment status from its latest inspection + registered flag.
 * Stages (from the DMS process):
 *   Pendente → Em Inspeção → Concluído (submitted) → Relatório Aprovado → Cadastrada
 */
function getEquipmentStatus(
  inspections: { id: string; status: InspectionStatus }[] | undefined,
  registered: boolean | undefined
): {
  label: string;
  variant: "neutral" | "info" | "warning" | "success";
} {
  // If equipment is marked as registered in the client system, it's Cadastrada.
  if (registered) {
    return { label: "Cadastrada", variant: "success" };
  }

  if (!inspections || inspections.length === 0) {
    return { label: "Pendente", variant: "neutral" };
  }

  const latest = inspections[inspections.length - 1];

  if (latest.status === "transferred") {
    return { label: "Cadastrada", variant: "success" };
  }
  if (latest.status === "aprovado") {
    return { label: "Relatório Aprovado", variant: "success" };
  }
  if (latest.status === "ready_for_review") {
    return { label: "Concluído", variant: "info" };
  }
  if (latest.status === "disponivel") {
    return { label: "Pendente", variant: "neutral" };
  }
  // draft, in_progress, relatorio_reprovado, equipamento_reprovado
  return { label: "Em Inspeção", variant: "warning" };
}


interface OrdemDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrdemDetailPage({ params }: OrdemDetailPageProps) {
  await requireAuth();
  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";

  const { id } = await params;

  // Self-heal any OS that didn't auto-transition before this fix shipped
  // (or that ended up out of sync for any reason). Safe no-op when already
  // in the correct state.
  if (isAdmin) {
    try {
      const { syncOrderStatus } = await import("../actions");
      await syncOrderStatus(id);
    } catch {
      // non-critical
    }
  }

  let order;
  try {
    order = await getServiceOrderById(id);
  } catch {
    notFound();
  }

  if (!order) {
    notFound();
  }

  // Fetch equipment for this order (with inspection status)
  let equipmentList: Awaited<ReturnType<typeof getEquipmentByServiceOrderId>> = [];
  try {
    equipmentList = await getEquipmentByServiceOrderId(id);
  } catch {
    // Non-critical, show empty
  }

  // Preload lookup lists for the Edit modal (master-only, but server-side is fine)
  const [clients, contracts, locations, inspectors] = await Promise.all([
    getClients(),
    getContracts(),
    getInspectionLocations(),
    getInspectors(),
  ]);

  const completedCount = equipmentList.filter((eq) => {
    const status = getEquipmentStatus(eq.inspections, eq.registered);
    return status.label === "Concluído" || status.label === "Relatório Aprovado" || status.label === "Cadastrada";
  }).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/ordens"
            aria-label="Voltar"
            title="Voltar"
            className="inline-flex items-center justify-center w-11 h-11 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[#1B2B5E] truncate">
              {order.order_number ?? order.title}
            </h1>
            {order.order_number && order.title !== order.order_number && (
              <p className="text-sm text-gray-500 mt-0.5 truncate">{order.title}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <AdminOnly>
            <div className="flex items-center gap-2">
              <EditOrderButton
                orderId={order.id}
                orderStatus={order.status}
                current={{
                  order_number: order.order_number,
                  client_name: order.client_name,
                  contract_name: order.contract_name ?? null,
                  location_id: order.location_id,
                  assigned_to: order.assigned_to,
                  start_date: order.start_date,
                  client_request_date: order.client_request_date,
                }}
                clients={clients}
                contracts={contracts}
                locations={locations}
                inspectors={inspectors.map((i) => ({ id: i.id, full_name: i.full_name }))}
              />
              <DeleteOrderButton orderId={order.id} />
            </div>
            <div className="h-8 w-px bg-gray-300" aria-hidden="true" />
          </AdminOnly>
          <div className="flex items-center gap-2">
            <PdfOrderButton orderId={order.id} />
            <ExportOrderButton orderId={order.id} />
          </div>
        </div>
      </div>

      {/* Order details */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Dados da Ordem
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          <div>
            <dt className="text-sm font-medium text-gray-500">O.S.</dt>
            <dd className="mt-1 text-sm font-semibold text-[#1B2B5E]">
              {order.order_number ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Cliente</dt>
            <dd className="mt-1 text-sm text-gray-900">{order.client_name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Contrato</dt>
            <dd className="mt-1 text-sm text-gray-900">{order.contract_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Qtd. Equipamentos</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipmentList.length > 0
                ? `${completedCount}/${equipmentList.length} concluídos`
                : (order.equipment_count ?? "—")}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Local da Inspeção</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.inspection_location?.name ?? order.location ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Inspetor Responsável
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
            <dd className="mt-1 flex items-center gap-3 flex-wrap">
              <Badge variant={STATUS_VARIANTS[order.status]}>
                {STATUS_LABELS[order.status]}
              </Badge>
              {isAdmin && (
                <OrderStatusActions orderId={order.id} status={order.status} />
              )}
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

      {/* Equipment List */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Equipamentos ({equipmentList.length})
          </h2>
          <AdminOnly>
            <IncludeEquipmentButton orderId={order.id} />
          </AdminOnly>
        </div>
        {equipmentList.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhum equipamento cadastrado para esta ordem.
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
                    Mecanismo
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                    Controle
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white hidden sm:table-cell">
                    Inspetor
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {equipmentList.map((eq, idx) => {
                  const statusInfo = getEquipmentStatus(eq.inspections, eq.registered);
                  const latestInspection = eq.inspections?.[eq.inspections.length - 1];
                  const inspectorName = latestInspection?.inspector?.full_name ?? null;

                  // Determine the action link:
                  // - If there's an inspection, go to it
                  // - If not, go to the equipment detail (where they can start inspection)
                  const actionHref = latestInspection
                    ? `/dashboard/inspecoes/${latestInspection.id}`
                    : `/dashboard/equipamentos/${eq.id}`;
                  const actionLabel = latestInspection ? "Ver Inspeção" : "Iniciar";

                  return (
                    <tr
                      key={eq.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {eq.numero_052r ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {eq.numero_300 ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                        {inspectorName ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={actionHref}
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#F5A623] bg-[#FFF4E0] rounded-lg hover:bg-[#FFE8C0] transition-colors min-h-[44px]"
                          >
                            {actionLabel}
                          </Link>
                          <EditEquipmentNumbers
                            equipmentId={eq.id}
                            orderId={order.id}
                            currentNumero052r={eq.numero_052r ?? null}
                            currentNumero300={eq.numero_300 ?? null}
                          />
                          <AdminOnly>
                            <RemoveEquipmentButton
                              orderId={order.id}
                              equipmentId={eq.id}
                            />
                          </AdminOnly>
                        </div>
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
