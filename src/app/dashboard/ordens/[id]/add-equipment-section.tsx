"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addEquipmentToOrder } from "../actions";

interface EquipmentResult {
  id: string;
  copel_ra_code: string;
  manufacturer: string;
}

interface AddEquipmentSectionProps {
  orderId: string;
}

export function AddEquipmentSection({ orderId }: AddEquipmentSectionProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<EquipmentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "warning" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSearch() {
    if (!search.trim()) return;

    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/equipment/search?q=${encodeURIComponent(search.trim())}`
      );
      const data = await res.json();
      setResults(data);
      if (data.length === 0) {
        setMessage({ type: "error", text: "Nenhum equipamento encontrado." });
      }
    } catch {
      setMessage({ type: "error", text: "Erro ao buscar equipamentos." });
    } finally {
      setSearching(false);
    }
  }

  function handleAdd(equipmentId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await addEquipmentToOrder(orderId, equipmentId);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else if (result?.warning) {
        // Still added, but with warning
        setMessage({ type: "warning", text: result.warning });
        setResults([]);
        setSearch("");
        router.refresh();
      } else {
        setMessage({ type: "success", text: "Equipamento adicionado com sucesso." });
        setResults([]);
        setSearch("");
        router.refresh();
      }
    });
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Adicionar Equipamento
      </h2>

      {message && (
        <div
          className={`p-3 mb-4 rounded-lg text-sm ${
            message.type === "error"
              ? "bg-red-50 border border-red-200 text-red-700"
              : message.type === "warning"
              ? "bg-yellow-50 border border-yellow-200 text-yellow-700"
              : "bg-green-50 border border-green-200 text-green-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-end gap-4 mb-4">
        <div className="flex-1">
          <Input
            label="Buscar por Codigo Copel RA"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite o codigo para buscar..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
        </div>
        <Button
          type="button"
          onClick={handleSearch}
          loading={searching}
          size="lg"
        >
          Buscar
        </Button>
      </div>

      {results.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Codigo Copel RA
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Fabricante
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Acao
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((eq) => (
                <tr key={eq.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {eq.copel_ra_code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {eq.manufacturer}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAdd(eq.id)}
                      disabled={isPending}
                    >
                      Adicionar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
