"use client";

import { useRouter } from "next/navigation";
import type { InspectionStatus } from "@/lib/types";

const statusOptions: { value: string; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "draft", label: "Rascunho" },
  { value: "in_progress", label: "Em Andamento" },
  { value: "ready_for_review", label: "Pronta para Revisao" },
  { value: "submitted", label: "Enviada" },
  { value: "transferred", label: "Transferida" },
];

interface InspectionStatusFilterProps {
  currentStatus?: InspectionStatus;
}

export function InspectionStatusFilter({
  currentStatus,
}: InspectionStatusFilterProps) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value) {
      router.push(`/dashboard/inspecoes?status=${value}`);
    } else {
      router.push("/dashboard/inspecoes");
    }
  }

  return (
    <div className="flex items-center gap-4">
      <select
        value={currentStatus ?? ""}
        onChange={handleChange}
        className="block rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 transition-colors appearance-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
