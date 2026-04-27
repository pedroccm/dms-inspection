"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SortableHeader, type SortDirection } from "@/components/ui/sortable-header";
import type { ServiceOrderStatus } from "@/lib/types";

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

export interface OrderRow {
  id: string;
  orderLabel: string; // order_number ?? title
  location: string; // fallback "—"
  executor: string; // fallback "—"
  status: ServiceOrderStatus;
  startDate: string | null; // ISO string
}

type SortField = "orderLabel" | "location" | "executor" | "status" | "startDate";

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

// Format a date-only ISO string (YYYY-MM-DD or YYYY-MM-DDT...) as dd/MM/yyyy
// without going through `new Date()`, so we don't shift the day across timezones.
function formatDateOnly(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function getValue(row: OrderRow, field: SortField): string | number {
  switch (field) {
    case "orderLabel":
      return row.orderLabel;
    case "location":
      return row.location;
    case "executor":
      return row.executor;
    case "status":
      return STATUS_LABELS[row.status];
    case "startDate":
      return row.startDate ? new Date(row.startDate).getTime() : 0;
  }
}

interface OrdersTableProps {
  rows: OrderRow[];
}

export function OrdersTable({ rows }: OrdersTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  function handleSort(field: string) {
    const f = field as SortField;
    if (sortField === f) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(f);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortField) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = getValue(a, sortField);
      const vb = getValue(b, sortField);
      let cmp: number;
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = compareStrings(String(va), String(vb));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortField, sortDir]);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-[#1B2B5E]">
              <SortableHeader
                field="orderLabel"
                label="O.S."
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                field="location"
                label="Local da Inspeção"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                className="hidden md:table-cell"
              />
              <SortableHeader
                field="executor"
                label="Executor"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <SortableHeader
                field="status"
                label="Status"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                field="startDate"
                label="Início"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                className="hidden lg:table-cell"
              />
              <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  Nenhuma ordem de serviço encontrada.
                </td>
              </tr>
            ) : (
              sorted.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {order.orderLabel}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {order.location}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                    {order.executor}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={STATUS_VARIANTS[order.status]}>
                      {STATUS_LABELS[order.status]}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
                    {formatDateOnly(order.startDate)}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/ordens/${order.id}`}
                      aria-label="Ver detalhes"
                      title="Ver detalhes"
                      className="inline-flex items-center justify-center w-11 h-11 text-[#F5A623] bg-[#FFF4E0] rounded-lg hover:bg-[#FFE8C0] transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                        />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
