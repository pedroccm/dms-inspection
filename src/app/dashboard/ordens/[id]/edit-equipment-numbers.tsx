"use client";

import { useState, useActionState } from "react";
import { useIsAdmin } from "@/contexts/server-profile-context";
import { updateEquipmentNumbers } from "../actions";

interface EditEquipmentNumbersProps {
  equipmentId: string;
  orderId: string;
  currentNumero052r: string | null;
  currentNumero300: string | null;
}

export function EditEquipmentNumbers({
  equipmentId,
  orderId,
  currentNumero052r,
  currentNumero300,
}: EditEquipmentNumbersProps) {
  const isAdmin = useIsAdmin();
  const [editing, setEditing] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prevState: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateEquipmentNumbers(orderId, equipmentId, formData);
      if (result?.success) setEditing(false);
      return result ?? null;
    },
    null
  );

  if (!isAdmin) return null;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[36px]"
      >
        Editar
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 min-w-[200px]">
      {state?.error && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500 shrink-0">052R-</span>
        <input
          type="text"
          name="numero_052r"
          defaultValue={currentNumero052r?.replace("052R-", "") ?? ""}
          required
          placeholder="Mecanismo"
          className="block w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623] focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500 shrink-0">300-</span>
        <input
          type="text"
          name="numero_300"
          defaultValue={currentNumero300?.replace("300-", "") ?? ""}
          required
          placeholder="Controle"
          className="block w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623] focus:outline-none"
        />
      </div>
      <div className="flex gap-1">
        <button
          type="submit"
          disabled={pending}
          className="px-2 py-1 text-xs font-medium text-white bg-[#F5A623] rounded hover:bg-[#E8941E] transition-colors disabled:opacity-50"
        >
          {pending ? "..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
