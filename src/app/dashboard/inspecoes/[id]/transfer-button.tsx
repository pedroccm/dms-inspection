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
    if (!confirm("Deseja marcar o equipamento desta inspeção como Cadastrado no sistema do cliente?")) {
      return;
    }

    setLoading(true);
    try {
      const result = await markAsTransferred(inspectionId);
      if (!result.success) {
        alert(result.error ?? "Erro ao marcar como cadastrada.");
        return;
      }
      router.refresh();
    } catch {
      alert("Erro ao marcar como cadastrada.");
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
      {loading ? "Processando..." : "Marcar como Cadastrada"}
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
