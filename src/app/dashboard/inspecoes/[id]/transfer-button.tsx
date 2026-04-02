"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminOnly } from "@/components/admin-only";
import { markAsTransferred } from "./actions";

interface TransferButtonProps {
  inspectionId: string;
}

function TransferButtonInner({ inspectionId }: TransferButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleTransfer() {
    if (!confirm("Deseja marcar esta inspecao como transferida para o Webed?")) {
      return;
    }

    setLoading(true);
    try {
      const result = await markAsTransferred(inspectionId);
      if (!result.success) {
        alert(result.error ?? "Erro ao marcar como transferida.");
        return;
      }
      router.refresh();
    } catch {
      alert("Erro ao marcar como transferida.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleTransfer}
      disabled={loading}
      className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Processando..." : "Marcar como Transferida"}
    </button>
  );
}

export function TransferButton({ inspectionId }: TransferButtonProps) {
  return (
    <AdminOnly>
      <TransferButtonInner inspectionId={inspectionId} />
    </AdminOnly>
  );
}
