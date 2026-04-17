"use client";

import { useState } from "react";
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
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
    >
      {loading ? "Excluindo..." : "Excluir Ordem"}
    </button>
  );
}
