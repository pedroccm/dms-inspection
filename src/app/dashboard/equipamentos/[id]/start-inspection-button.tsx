"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface StartInspectionButtonProps {
  equipmentId: string;
  serviceOrderId: string | null;
}

export function StartInspectionButton({ equipmentId, serviceOrderId }: StartInspectionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleStart() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/inspections/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipmentId, serviceOrderId }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Erro ao criar inspeção.");
        setLoading(false);
        return;
      }

      // Redirect to the new inspection
      router.push(`/dashboard/inspecoes/${data.inspectionId}`);
    } catch {
      setError("Erro inesperado. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={handleStart} loading={loading} size="lg">
        {loading ? "Iniciando..." : "Iniciar Inspeção"}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
