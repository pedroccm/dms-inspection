"use client";

import type { ChecklistItem } from "@/lib/types";

interface ChecklistSummaryProps {
  items: ChecklistItem[];
}

function getItemLabel(item: ChecklistItem) {
  return item.item_name;
}

export function ChecklistSummary({ items }: ChecklistSummaryProps) {
  const total = items.length;
  if (total === 0) return null;

  const approved = items.filter((i) => i.status === "approved").length;
  const rejected = items.filter((i) => i.status === "rejected");
  const na = items.filter((i) => i.status === "na").length;
  const pending = items.filter((i) => i.status === "pending").length;
  const evaluated = total - pending;
  const completionPercent = Math.round((evaluated / total) * 100);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Resumo da Avaliacao
      </h2>

      {/* Completion bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-gray-600">
            {evaluated} de {total} itens avaliados
          </span>
          <span className="text-sm font-semibold text-gray-700">
            {completionPercent}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full transition-all duration-300"
            style={{
              width: `${completionPercent}%`,
              backgroundColor:
                completionPercent === 100 ? "#16a34a" : "#F5A623",
            }}
          />
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Aprovados */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{approved}</div>
          <div className="text-xs font-medium text-green-600 mt-0.5">
            Aprovados
          </div>
        </div>

        {/* Reprovados */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">
            {rejected.length}
          </div>
          <div className="text-xs font-medium text-red-600 mt-0.5">
            Reprovados
          </div>
        </div>

        {/* NA */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-600">{na}</div>
          <div className="text-xs font-medium text-gray-500 mt-0.5">NA</div>
        </div>

        {/* Pendentes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-700">{pending}</div>
          <div className="text-xs font-medium text-yellow-600 mt-0.5">
            Pendentes
          </div>
        </div>
      </div>

      {/* Rejected items detail */}
      {rejected.length > 0 && (
        <div className="mt-3">
          <h3 className="text-sm font-medium text-red-800 mb-2">
            Itens reprovados:
          </h3>
          <ul className="space-y-1.5">
            {rejected.map((item) => (
              <li
                key={item.id}
                className="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2"
              >
                <span className="font-medium">{getItemLabel(item)}</span>
                {item.rejection_reason && (
                  <span className="text-red-600">
                    {" "}
                    — {item.rejection_reason}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
