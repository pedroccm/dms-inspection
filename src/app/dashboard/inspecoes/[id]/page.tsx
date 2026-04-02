import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getInspectionById } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { ChecklistForm } from "./checklist-form";
import type { InspectionStatus } from "@/lib/types";

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

  const config =
    statusConfig[inspection.status] ?? statusConfig.draft;

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

      {/* Interactive Checklist Form (US-302 + US-303) */}
      <ChecklistForm
        checklistItems={checklistItems}
        inspectionId={inspection.id}
        inspectionStatus={inspection.status}
        inspectionNotes={inspection.notes}
      />
    </div>
  );
}
