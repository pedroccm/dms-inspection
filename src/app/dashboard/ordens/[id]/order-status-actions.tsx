"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  markOrderAsMeasured,
  unmarkOrderAsMeasured,
  markOrderAsBilled,
  unmarkOrderAsBilled,
} from "../actions";
import type { ServiceOrderStatus } from "@/lib/types";

interface OrderStatusActionsProps {
  orderId: string;
  status: ServiceOrderStatus;
}

export function OrderStatusActions({ orderId, status }: OrderStatusActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string; success?: boolean } | undefined>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const showMeasured = status === "finalizada" || status === "medida" || status === "faturada";
  const showBilled = status === "medida" || status === "faturada";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {showMeasured && (
        <Button
          size="sm"
          onClick={() =>
            run(status === "finalizada" ? () => markOrderAsMeasured(orderId) : () => unmarkOrderAsMeasured(orderId))
          }
          disabled={status === "faturada"}
          loading={pending}
          variant={status === "finalizada" ? "primary" : "secondary"}
          title={status === "faturada" ? "Desfaça a Faturada antes" : undefined}
        >
          {status === "finalizada" ? "Marcar como Medida" : "Desfazer Medida"}
        </Button>
      )}
      {showBilled && (
        <Button
          size="sm"
          onClick={() =>
            run(status === "medida" ? () => markOrderAsBilled(orderId) : () => unmarkOrderAsBilled(orderId))
          }
          loading={pending}
          variant={status === "medida" ? "primary" : "secondary"}
        >
          {status === "medida" ? "Marcar como Faturada" : "Desfazer Faturada"}
        </Button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
