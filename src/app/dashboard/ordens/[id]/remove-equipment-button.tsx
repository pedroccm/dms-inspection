"use client";

import { useTransition } from "react";
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
  const router = useRouter();

  function handleRemove() {
    if (!confirm("Tem certeza que deseja remover este equipamento da ordem?")) {
      return;
    }

    startTransition(async () => {
      await removeEquipmentFromOrder(orderId, equipmentId);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      onClick={handleRemove}
      loading={isPending}
    >
      Remover
    </Button>
  );
}
