import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getServiceOrders } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { AdminOnly } from "@/components/admin-only";
import { OrderStatusFilter } from "./status-filter";
import type { ServiceOrderStatus } from "@/lib/types";

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

interface OrdensPageProps {
  searchParams: Promise<{
    status?: ServiceOrderStatus;
  }>;
}

export default async function OrdensPage({ searchParams }: OrdensPageProps) {
  await requireAuth();

  const params = await searchParams;
  const statusFilter = params.status || undefined;

  const orders = await getServiceOrders({
    status: statusFilter,
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-[#1B2B5E]">Ordens de Serviço</h1>
        <AdminOnly>
          <Link
            href="/dashboard/ordens/nova"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-[#F5A623] rounded-lg hover:bg-[#E8941E] transition-colors min-h-[44px] w-full sm:w-auto"
          >
            Nova Ordem
          </Link>
        </AdminOnly>
      </div>

      <div className="mb-6">
        <OrderStatusFilter currentStatus={statusFilter} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-[#1B2B5E]">
                <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                  O.S.
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white hidden md:table-cell">
                  Local da Inspeção
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white hidden sm:table-cell">
                  Inspetor
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white hidden lg:table-cell">
                  Início
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Nenhuma ordem de serviço encontrada.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {order.order_number ?? order.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                      {(order as unknown as { inspection_location?: { name: string } }).inspection_location?.name
                        ?? order.location ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                      {order.assignee?.full_name ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={STATUS_VARIANTS[order.status]}>
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
                      {order.start_date
                        ? new Date(order.start_date).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/ordens/${order.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#F5A623] bg-[#FFF4E0] rounded-lg hover:bg-[#FFE8C0] transition-colors min-h-[44px]"
                      >
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
