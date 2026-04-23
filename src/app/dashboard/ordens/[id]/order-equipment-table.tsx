"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AdminOnly } from "@/components/admin-only";
import { SortableHeader, type SortDirection } from "@/components/ui/sortable-header";
import { EditEquipmentNumbers } from "./edit-equipment-numbers";
import { RemoveEquipmentButton } from "./remove-equipment-button";

type StatusVariant = "neutral" | "info" | "warning" | "success";

// Status ordering used when sorting the Status column.
// Lower weight = earlier in the pipeline.
const STATUS_WEIGHT: Record<string, number> = {
  Pendente: 0,
  "Em Inspeção": 1,
  Concluído: 2,
  "Relatório Aprovado": 3,
  Cadastrada: 4,
};

export interface OrderEquipmentRow {
  id: string;
  originalIndex: number;
  numero052r: string | null;
  numero300: string | null;
  statusLabel: string;
  statusVariant: StatusVariant;
  inspectorName: string | null;
  actionHref: string;
  actionLabel: string;
}

type SortField = "index" | "numero052r" | "numero300" | "status" | "inspector";

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

function getValue(row: OrderEquipmentRow, field: SortField): string | number {
  switch (field) {
    case "index":
      return row.originalIndex;
    case "numero052r":
      return row.numero052r ?? "";
    case "numero300":
      return row.numero300 ?? "";
    case "status":
      return STATUS_WEIGHT[row.statusLabel] ?? 99;
    case "inspector":
      return row.inspectorName ?? "";
  }
}

interface OrderEquipmentTableProps {
  rows: OrderEquipmentRow[];
  orderId: string;
}

export function OrderEquipmentTable({ rows, orderId }: OrderEquipmentTableProps) {
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-[#1B2B5E]">
            <SortableHeader
              field="index"
              label="#"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              field="numero052r"
              label="Mecanismo"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              field="numero300"
              label="Controle"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              field="status"
              label="Status"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              field="inspector"
              label="Inspetor"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              className="hidden sm:table-cell"
            />
            <th className="text-left px-6 py-4 text-sm font-semibold text-white">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((eq) => (
            <tr
              key={eq.id}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="px-6 py-4 text-sm text-gray-500">
                {eq.originalIndex}
              </td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                {eq.numero052r ?? "—"}
              </td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                {eq.numero300 ?? "—"}
              </td>
              <td className="px-6 py-4">
                <Badge variant={eq.statusVariant}>{eq.statusLabel}</Badge>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                {eq.inspectorName ?? "—"}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={eq.actionHref}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#F5A623] bg-[#FFF4E0] rounded-lg hover:bg-[#FFE8C0] transition-colors min-h-[44px]"
                  >
                    {eq.actionLabel}
                  </Link>
                  <EditEquipmentNumbers
                    equipmentId={eq.id}
                    orderId={orderId}
                    currentNumero052r={eq.numero052r}
                    currentNumero300={eq.numero300}
                  />
                  <AdminOnly>
                    <RemoveEquipmentButton
                      orderId={orderId}
                      equipmentId={eq.id}
                    />
                  </AdminOnly>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
