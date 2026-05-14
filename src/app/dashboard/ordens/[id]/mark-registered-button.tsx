"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAsTransferred } from "@/app/dashboard/inspecoes/[id]/actions";

interface MarkRegisteredButtonProps {
  inspectionId: string;
}

export function MarkRegisteredButton({ inspectionId }: MarkRegisteredButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
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
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Processando..." : "Cadastrada"}
    </button>
  );
}
