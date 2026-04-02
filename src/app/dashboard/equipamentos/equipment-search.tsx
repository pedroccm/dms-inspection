"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EquipmentSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      router.push(`/dashboard/equipamentos?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/dashboard/equipamentos");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar por Código Copel RA..."
        className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
      >
        Buscar
      </button>
      {defaultValue && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            router.push("/dashboard/equipamentos");
          }}
          className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
        >
          Limpar
        </button>
      )}
    </form>
  );
}
