import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getServiceOrders } from "@/lib/queries";
import { AdminOnly } from "@/components/admin-only";
import { OrderStatusFilter } from "./status-filter";
import { OrdersTable, type OrderRow } from "./orders-table";
import type { ServiceOrderStatus } from "@/lib/types";

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

  const rows: OrderRow[] = orders.map((order) => ({
    id: order.id,
    orderLabel: order.order_number ?? order.title,
    location:
      (order as unknown as { inspection_location?: { name: string } }).inspection_location?.name
      ?? order.location
      ?? "—",
    executor: order.assignee?.full_name ?? "—",
    status: order.status,
    startDate: order.start_date,
  }));

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

      <OrdersTable rows={rows} />
    </div>
  );
}
