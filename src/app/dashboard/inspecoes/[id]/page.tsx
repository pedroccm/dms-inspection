import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getInspectionById } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import type { InspectionStatus, ChecklistItem } from "@/lib/types";

const statusConfig: Record<
  InspectionStatus,
  { label: string; variant: "neutral" | "info" | "warning" | "success" }
> = {
  draft: { label: "Rascunho", variant: "neutral" },
  in_progress: { label: "Em Andamento", variant: "info" },
  ready_for_review: { label: "Pronta para Revisao", variant: "warning" },
  submitted: { label: "Enviada", variant: "success" },
  transferred: { label: "Transferida", variant: "neutral" },
};

function getItemStatusDisplay(item: ChecklistItem) {
  if (item.checked) {
    return { icon: "\u2705", label: "Aprovado" };
  }
  return { icon: "\u2B1C", label: "Pendente" };
}

function groupItemsByCategory(items: ChecklistItem[]) {
  // Group by label prefix (text before " - ") or use "Geral" as fallback
  const groups: Record<string, ChecklistItem[]> = {};

  for (const item of items) {
    const dashIndex = item.label.indexOf(" - ");
    const category = dashIndex > 0 ? item.label.substring(0, dashIndex) : "Geral";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
  }

  return groups;
}

interface InspecaoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InspecaoDetailPage({
  params,
}: InspecaoDetailPageProps) {
  await requireAuth();

  const { id } = await params;

  let inspection;
  try {
    inspection = await getInspectionById(id);
  } catch {
    notFound();
  }

  if (!inspection) {
    notFound();
  }

  const checklistItems = inspection.checklist_items ?? [];
  const evaluatedCount = checklistItems.filter((item) => item.checked).length;
  const totalCount = checklistItems.length;
  const progressPercent =
    totalCount > 0 ? Math.round((evaluatedCount / totalCount) * 100) : 0;

  const config =
    statusConfig[inspection.status] ?? statusConfig.draft;

  const groupedItems = groupItemsByCategory(checklistItems);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Inspecao: {inspection.equipment?.copel_ra_code ?? "—"}
          </h1>
          {inspection.equipment?.manufacturer && (
            <p className="text-sm text-gray-500 mt-1">
              Fabricante: {inspection.equipment.manufacturer}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={config.variant}>{config.label}</Badge>
          <Link
            href="/dashboard/inspecoes"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            Voltar
          </Link>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {evaluatedCount} de {totalCount} itens avaliados
          </span>
          <span className="text-sm font-medium text-gray-500">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist Items Grouped by Category */}
      {Object.keys(groupedItems).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Nenhum item de checklist encontrado.
        </div>
      ) : (
        <div className="space-y-6 mb-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">
                  {category}
                </h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {items.map((item) => {
                  const display = getItemStatusDisplay(item);
                  return (
                    <li
                      key={item.id}
                      className="px-6 py-4 flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-900">
                        {item.label}
                      </span>
                      <span
                        className="text-sm text-gray-500 flex items-center gap-1.5"
                        title={display.label}
                      >
                        <span>{display.icon}</span>
                        <span>{display.label}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Observations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Observacoes
        </h2>
        <div className="rounded-lg border border-gray-300 p-4 min-h-[100px] text-sm text-gray-700 bg-gray-50">
          {inspection.notes || "Nenhuma observacao registrada."}
        </div>
      </div>
    </div>
  );
}
