"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { removeEquipmentFromOrder } from "../actions";

interface RemoveEquipmentButtonProps {
  orderId: string;
  equipmentId: string;
}

export function RemoveEquipmentButton({
  orderId,
  equipmentId,
}: RemoveEquipmentButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleRemove() {
    if (!confirm("Tem certeza que deseja remover este equipamento da ordem?")) {
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await removeEquipmentFromOrder(orderId, equipmentId);
      if (result?.error) {
        setError(result.error);
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={handleRemove}
        loading={isPending}
      >
        Remover
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
