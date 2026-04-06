"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { claimInspection } from "./claim-action";

interface ClaimButtonProps {
  inspectionId: string;
}

export function ClaimButton({ inspectionId }: ClaimButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    setLoading(true);
    setError(null);

    const result = await claimInspection(inspectionId);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? "Erro ao reivindicar ficha.");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={handleClaim} loading={loading}>
        Reivindicar Ficha
      </Button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
