"use client";

import { useState } from "react";
import { AdminOnly } from "@/components/admin-only";
import { deleteInspection } from "./actions";

function DeleteInspectionButtonInner({ inspectionId }: { inspectionId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        "Tem certeza que deseja excluir esta inspeção?\n\nTodos os itens do checklist, fotos e dados relacionados serão excluídos permanentemente."
      )
    ) {
      return;
    }

    setLoading(true);
    const result = await deleteInspection(inspectionId);
    if (result?.error) {
      alert(result.error);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
    >
      {loading ? "Excluindo..." : "Excluir Inspeção"}
    </button>
  );
}

export function DeleteInspectionButton({ inspectionId }: { inspectionId: string }) {
  return (
    <AdminOnly>
      <DeleteInspectionButtonInner inspectionId={inspectionId} />
    </AdminOnly>
  );
}
