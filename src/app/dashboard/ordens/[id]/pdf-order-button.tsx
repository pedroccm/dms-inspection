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
      aria-label="Gerar Relatório PDF"
      title="Gerar Relatório PDF"
      className="inline-flex items-center justify-center gap-2 px-4 h-11 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="hidden sm:inline">{loading ? "Gerando..." : "PDF"}</span>
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
