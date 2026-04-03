"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface Inspector {
  id: string;
  full_name: string;
}

interface ReportFiltersProps {
  inspectors: Inspector[];
  defaultStartDate: string;
  defaultEndDate: string;
}

export function ReportFilters({
  inspectors,
  defaultStartDate,
  defaultEndDate,
}: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(
    searchParams.get("inicio") ?? defaultStartDate
  );
  const [endDate, setEndDate] = useState(
    searchParams.get("fim") ?? defaultEndDate
  );
  const [inspectorId, setInspectorId] = useState(
    searchParams.get("inspetor") ?? ""
  );

  function handleFilter() {
    const params = new URLSearchParams();
    params.set("inicio", startDate);
    params.set("fim", endDate);
    if (inspectorId) params.set("inspetor", inspectorId);
    router.push(`/dashboard/relatorios/produtividade?${params.toString()}`);
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label
            htmlFor="start-date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Data Início
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623] min-h-[44px]"
          />
        </div>

        <div>
          <label
            htmlFor="end-date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Data Fim
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623] min-h-[44px]"
          />
        </div>

        <div>
          <label
            htmlFor="inspector-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Executor
          </label>
          <select
            id="inspector-filter"
            value={inspectorId}
            onChange={(e) => setInspectorId(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623] min-h-[44px]"
          >
            <option value="">Todos</option>
            {inspectors.map((inspector) => (
              <option key={inspector.id} value={inspector.id}>
                {inspector.full_name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleFilter}
          className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-[#F5A623] rounded-lg hover:bg-[#E8941E] transition-colors min-h-[44px]"
        >
          Filtrar
        </button>
      </div>
    </div>
  );
}
