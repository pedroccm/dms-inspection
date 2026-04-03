"use client";

import { useState } from "react";
import { AdminOnly } from "@/components/admin-only";

interface PdfOrderButtonProps {
  orderId: string;
}

function PdfOrderButtonInner({ orderId }: PdfOrderButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const response = await fetch(`/api/report/order/${orderId}`);
      if (!response.ok) {
        const data = await response.json();
        alert(data.error ?? "Erro ao gerar PDF");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] ?? "relatorio_os.pdf";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Erro ao gerar PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Gerando PDF..." : "Gerar Relatorio PDF"}
    </button>
  );
}

export function PdfOrderButton({ orderId }: PdfOrderButtonProps) {
  return (
    <AdminOnly>
      <PdfOrderButtonInner orderId={orderId} />
    </AdminOnly>
  );
}
