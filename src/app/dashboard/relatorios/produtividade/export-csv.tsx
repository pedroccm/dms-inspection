"use client";

import type { InspectorProductivity } from "@/lib/reports";

interface ExportCsvProps {
  rows: InspectorProductivity[];
}

export function ExportCsv({ rows }: ExportCsvProps) {
  function handleExport() {
    const headers = [
      "Inspetor",
      "Total Inspecoes",
      "Itens Aprovados",
      "Itens Reprovados",
      "Itens NA",
      "Taxa Aprovacao (%)",
    ];

    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        [
          `"${row.inspector_name}"`,
          row.total_inspections,
          row.approved_count,
          row.rejected_count,
          row.na_count,
          row.approval_rate,
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const today = new Date().toISOString().split("T")[0];
    const link = document.createElement("a");
    link.href = url;
    link.download = `produtividade_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={rows.length === 0}
      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Exportar CSV
    </button>
  );
}
