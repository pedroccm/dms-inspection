"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resumeInspection } from "./actions";

interface RejectionBannerProps {
  inspectionId: string;
  rejectionReason: string | null;
}

export function RejectionBanner({
  inspectionId,
  rejectionReason,
}: RejectionBannerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResume() {
    setLoading(true);
    setError(null);

    try {
      const result = await resumeInspection(inspectionId);
      if (!result.success) {
        setError(result.error ?? "Erro ao retomar inspeção.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Erro ao retomar inspeção.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg"
      data-testid="rejection-banner"
    >
      <div className="flex items-start gap-3">
        <span className="text-amber-600 text-xl mt-0.5">&#9888;</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-800 mb-1">
            Relatório Reprovado pelo Master
          </h3>
          {rejectionReason && (
            <p className="text-sm text-amber-700 mb-3">
              <span className="font-medium">Motivo:</span> {rejectionReason}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 mb-2">{error}</p>
          )}
          <Button
            onClick={handleResume}
            loading={loading}
            size="lg"
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Corrigir e Reenviar
          </Button>
        </div>
      </div>
    </div>
  );
}
