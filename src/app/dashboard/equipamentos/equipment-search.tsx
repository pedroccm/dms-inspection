"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface EquipmentSearchProps {
  defaultSearch?: string;
  defaultManufacturer?: string;
  manufacturers: string[];
}

export function EquipmentSearch({
  defaultSearch,
  defaultManufacturer,
  manufacturers,
}: EquipmentSearchProps) {
  const router = useRouter();
  const [search, setSearch] = useState(defaultSearch ?? "");
  const [manufacturer, setManufacturer] = useState(defaultManufacturer ?? "");

  function buildUrl(params: { q?: string; manufacturer?: string }) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.manufacturer) sp.set("manufacturer", params.manufacturer);
    const qs = sp.toString();
    return qs
      ? `/dashboard/equipamentos?${qs}`
      : "/dashboard/equipamentos";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = search.trim();
    router.push(
      buildUrl({
        q: trimmed || undefined,
        manufacturer: manufacturer || undefined,
      })
    );
  }

  function handleManufacturerChange(value: string) {
    setManufacturer(value);
    const trimmed = search.trim();
    router.push(
      buildUrl({
        q: trimmed || undefined,
        manufacturer: value || undefined,
      })
    );
  }

  function handleClear() {
    setSearch("");
    setManufacturer("");
    router.push("/dashboard/equipamentos");
  }

  const hasFilters = !!(defaultSearch || defaultManufacturer);

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por Código Copel RA..."
        className="flex-1 min-w-[200px] px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623] outline-none"
      />
      <select
        value={manufacturer}
        onChange={(e) => handleManufacturerChange(e.target.value)}
        className="px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623] outline-none bg-white min-w-[180px]"
      >
        <option value="">Todos os fabricantes</option>
        {manufacturers.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-[#F5A623] rounded-lg hover:bg-[#E8941E] transition-colors min-h-[44px]"
      >
        Buscar
      </button>
      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
        >
          Limpar filtros
        </button>
      )}
    </form>
  );
}
