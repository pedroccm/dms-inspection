"use client";

import { useState } from "react";
import { AdminOnly } from "@/components/admin-only";

interface ExportOrderButtonProps {
  orderId: string;
}

function ExportOrderButtonInner({ orderId }: ExportOrderButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const response = await fetch(`/api/export/order/${orderId}`);
      if (!response.ok) {
        const data = await response.json();
        alert(data.error ?? "Erro ao exportar");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] ?? "export.csv";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Erro ao exportar dados.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      aria-label="Exportar Ordem Completa"
      title="Exportar Ordem Completa"
      className="inline-flex items-center justify-center gap-2 px-4 h-11 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
        />
      </svg>
      <span className="hidden sm:inline">{loading ? "Exportando..." : "Exportar"}</span>
    </button>
  );
}

export function ExportOrderButton({ orderId }: ExportOrderButtonProps) {
  return (
    <AdminOnly>
      <ExportOrderButtonInner orderId={orderId} />
    </AdminOnly>
  );
}
