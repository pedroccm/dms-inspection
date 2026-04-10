"use client";

import { useState } from "react";
import type { FormattedAuditEntry } from "@/lib/types";

interface AuditLogProps {
  entries: FormattedAuditEntry[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const actionColors: Record<string, string> = {
  insert: "bg-green-100 text-green-800",
  update: "bg-[#FFF4E0] text-[#1B2B5E]",
  delete: "bg-red-100 text-red-800",
};

const actionLabels: Record<string, string> = {
  insert: "Criação",
  update: "Alteração",
  delete: "Remoção",
};

export function AuditLog({ entries }: AuditLogProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors min-h-[44px]"
      >
        <h3 className="text-lg font-semibold text-gray-900">
          Histórico de Alterações
        </h3>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              Nenhuma alteração registrada.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                >
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 mt-0.5 ${
                      actionColors[entry.action] ?? "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {actionLabels[entry.action] ?? entry.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{entry.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(entry.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
