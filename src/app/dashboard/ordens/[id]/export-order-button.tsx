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
      className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Exportando..." : "Exportar Ordem Completa"}
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
