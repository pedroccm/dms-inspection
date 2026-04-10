"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteServiceOrder } from "../actions";

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta ordem?\n\nTodos os equipamentos, inspeções, fotos e dados relacionados serão excluídos permanentemente.")) {
      return;
    }

    setLoading(true);
    const result = await deleteServiceOrder(orderId);
    if (result?.error) {
      alert(result.error);
      setLoading(false);
    }
  }

  return (
    <Button variant="danger" onClick={handleDelete} loading={loading} size="sm">
      {loading ? "Excluindo..." : "Excluir Ordem"}
    </Button>
  );
}
