"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addNewEquipmentToOrder } from "../actions";

interface IncludeEquipmentButtonProps {
  orderId: string;
}

export function IncludeEquipmentButton({ orderId }: IncludeEquipmentButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await addNewEquipmentToOrder(orderId, formData);
      if (result?.success) {
        setOpen(false);
        router.refresh();
      }
      return result ?? null;
    },
    null
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 h-11 text-sm font-medium text-[#F5A623] bg-[#FFF4E0] rounded-lg hover:bg-[#FFE8C0] transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Incluir Equipamento
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Incluir Equipamento</h3>

        {state?.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mecanismo<span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-500 shrink-0">052R-</span>
              <input
                type="text"
                name="numero_052r"
                required
                placeholder="xxxxx"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Controle<span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-500 shrink-0">300-</span>
              <input
                type="text"
                name="numero_300"
                required
                placeholder="xxxxx"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={pending}>
              {pending ? "Incluindo..." : "Incluir"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
