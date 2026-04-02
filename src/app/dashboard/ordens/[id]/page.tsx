import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getServiceOrderById } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { AdminOnly } from "@/components/admin-only";
import { AddEquipmentSection } from "./add-equipment-section";
import { RemoveEquipmentButton } from "./remove-equipment-button";
import { ExportOrderButton } from "./export-order-button";
import type { ServiceOrderStatus, EquipmentInspectionStatus } from "@/lib/types";

const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  open: "Aberta",
  in_progress: "Em Andamento",
  completed: "Concluida",
  cancelled: "Cancelada",
};

const STATUS_VARIANTS: Record<ServiceOrderStatus, "info" | "warning" | "success" | "neutral"> = {
  open: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "neutral",
};

const INSPECTION_STATUS_LABELS: Record<EquipmentInspectionStatus, string> = {
  not_started: "Nao Iniciada",
  in_progress: "Em Andamento",
  completed: "Concluida",
};

const INSPECTION_STATUS_VARIANTS: Record<EquipmentInspectionStatus, "neutral" | "warning" | "success"> = {
  not_started: "neutral",
  in_progress: "warning",
  completed: "success",
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

  const equipmentList = order.service_order_equipment ?? [];
  const isCompleted = order.status === "completed" || order.status === "cancelled";
  const allInspectionsCompleted =
    equipmentList.length > 0 &&
    equipmentList.every((soe) => soe.inspection_status === "completed");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{order.title}</h1>
        <div className="flex items-center gap-3">
          {allInspectionsCompleted && (
            <ExportOrderButton orderId={order.id} />
          )}
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
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <dt className="text-sm font-medium text-gray-500">Cliente</dt>
            <dd className="mt-1 text-sm text-gray-900">{order.client_name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Localizacao</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.location ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Inspetor Responsavel
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.assignee?.full_name ?? "—"}
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
            <dt className="text-sm font-medium text-gray-500">Data Inicio</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.start_date
                ? new Date(order.start_date).toLocaleDateString("pt-BR")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Data Fim</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.end_date
                ? new Date(order.end_date).toLocaleDateString("pt-BR")
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Equipment list */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Equipamentos da Ordem
          </h2>
        </div>
        {equipmentList.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhum equipamento adicionado a esta ordem.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                    Codigo Copel RA
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                    Fabricante
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                    Status Inspecao
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {equipmentList.map((soe) => (
                  <tr
                    key={soe.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {soe.equipment?.copel_ra_code ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {soe.equipment?.manufacturer ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          INSPECTION_STATUS_VARIANTS[soe.inspection_status]
                        }
                      >
                        {INSPECTION_STATUS_LABELS[soe.inspection_status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <AdminOnly>
                        <RemoveEquipmentButton
                          orderId={order.id}
                          equipmentId={soe.equipment_id}
                        />
                      </AdminOnly>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add equipment section - admin only, only if order is not completed */}
      {!isCompleted && (
        <AdminOnly>
          <AddEquipmentSection orderId={order.id} />
        </AdminOnly>
      )}
    </div>
  );
}
