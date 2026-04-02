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
  completed: "Concluida",
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ordens de Servico</h1>
        <AdminOnly>
          <Link
            href="/dashboard/ordens/nova"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
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
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                  Titulo
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                  Cliente
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 hidden md:table-cell">
                  Local
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 hidden sm:table-cell">
                  Inspetor
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 hidden lg:table-cell">
                  Periodo
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Nenhuma ordem de servico encontrada.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {order.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.client_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                      {order.location ?? "—"}
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
                      {" — "}
                      {order.end_date
                        ? new Date(order.end_date).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/ordens/${order.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors min-h-[44px]"
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
