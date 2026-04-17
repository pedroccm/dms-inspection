"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteServiceOrder } from "../actions";

export function DeleteOrderButton({
  orderId,
  menuItem = false,
}: {
  orderId: string;
  menuItem?: boolean;
}) {
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

  if (menuItem) {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {loading ? "Excluindo..." : "Excluir Ordem"}
      </button>
    );
  }

  return (
    <Button variant="danger" onClick={handleDelete} loading={loading} size="sm">
      {loading ? "Excluindo..." : "Excluir Ordem"}
    </Button>
  );
}
