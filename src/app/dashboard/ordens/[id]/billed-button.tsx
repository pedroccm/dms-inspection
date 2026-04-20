"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markOrderAsBilled, unmarkOrderAsBilled } from "../actions";
import type { ServiceOrderStatus } from "@/lib/types";

interface BilledButtonProps {
  orderId: string;
  status: ServiceOrderStatus;
}

export function BilledButton({ orderId, status }: BilledButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (status !== "medida" && status !== "faturada") {
    return (
      <Button size="sm" variant="secondary" disabled title="Disponível quando a OS estiver Medida">
        Marcar como Faturada
      </Button>
    );
  }

  const isBilled = status === "faturada";

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = isBilled
        ? await unmarkOrderAsBilled(orderId)
        : await markOrderAsBilled(orderId);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        onClick={handleClick}
        loading={pending}
        variant={isBilled ? "secondary" : "primary"}
      >
        {isBilled ? "Desfazer Faturada" : "Marcar como Faturada"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
