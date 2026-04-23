"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SortableHeader, type SortDirection } from "@/components/ui/sortable-header";

export interface EquipmentRow {
  id: string;
  copelRaCode: string;
  manufacturer: string;
  mechanismSerial: string;
  createdAt: string; // ISO
}

type SortField = "copelRaCode" | "manufacturer" | "mechanismSerial" | "createdAt";

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

function getValue(row: EquipmentRow, field: SortField): string | number {
  switch (field) {
    case "copelRaCode":
      return row.copelRaCode;
    case "manufacturer":
      return row.manufacturer;
    case "mechanismSerial":
      return row.mechanismSerial;
    case "createdAt":
      return new Date(row.createdAt).getTime();
  }
}

interface EquipmentTableProps {
  rows: EquipmentRow[];
}

export function EquipmentTable({ rows }: EquipmentTableProps) {
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
                field="copelRaCode"
                label="Código Copel RA"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                field="manufacturer"
                label="Fabricante"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                field="mechanismSerial"
                label="Nº Série Mecanismo"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <SortableHeader
                field="createdAt"
                label="Data Cadastro"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                className="hidden md:table-cell"
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
                  colSpan={5}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  Nenhum equipamento encontrado.
                </td>
              </tr>
            ) : (
              sorted.map((eq) => (
                <tr
                  key={eq.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {eq.copelRaCode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {eq.manufacturer}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                    {eq.mechanismSerial}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {new Date(eq.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/equipamentos/${eq.id}`}
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
  );
}
