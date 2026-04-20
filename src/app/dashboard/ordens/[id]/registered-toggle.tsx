"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleEquipmentRegistered } from "../actions";

interface RegisteredToggleProps {
  orderId: string;
  equipmentId: string;
  initialRegistered: boolean;
  /** When false, the checkbox is rendered disabled (inspection not approved yet). */
  enabled: boolean;
}

export function RegisteredToggle({
  orderId,
  equipmentId,
  initialRegistered,
  enabled,
}: RegisteredToggleProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(initialRegistered);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    const previous = checked;
    setChecked(next);
    setError(null);

    startTransition(async () => {
      const result = await toggleEquipmentRegistered(orderId, equipmentId, next);
      if (result?.error) {
        setChecked(previous);
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <label
      className={`inline-flex items-center gap-2 ${
        enabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"
      }`}
      title={
        !enabled
          ? "Disponível após a inspeção ser aprovada"
          : checked
            ? "Desmarcar Cadastrado"
            : "Marcar como Cadastrado"
      }
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={!enabled || pending}
        onChange={handleChange}
        className="h-4 w-4 rounded border-gray-300 text-[#F5A623] focus:ring-[#F5A623] disabled:opacity-50"
      />
      <span className="text-sm text-gray-700">
        {checked ? "Cadastrado" : "—"}
      </span>
      {error && (
        <span className="text-xs text-red-600 ml-2" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
