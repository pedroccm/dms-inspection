import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth, getProfile } from "@/lib/auth";
import { getInspectionById } from "@/lib/queries";
import { getInspectionAuditLogs } from "@/lib/audit";
import { Badge } from "@/components/ui/badge";
import { InspectionDetailClient } from "./inspection-detail-client";
import { ExportButton } from "./export-button";
import { TransferButton } from "./transfer-button";
import { AuditLog } from "./audit-log";
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
  const profile = await getProfile();

  const { id } = await params;

  let inspection;
  try {
    inspection = await getInspectionById(id);
  } catch (err) {
    console.error("getInspectionById error:", err);
    notFound();
  }

  if (!inspection) {
    notFound();
  }

  const isAdmin = profile?.role === "admin";
  let auditEntries: Awaited<ReturnType<typeof getInspectionAuditLogs>> = [];
  if (isAdmin) {
    try {
      auditEntries = await getInspectionAuditLogs(id);
    } catch {
      // Audit logs are non-critical, fail silently
    }
  }

  const checklistItems = inspection.checklist_items ?? [];
  const photos = inspection.photos ?? [];
  const isEditable =
    inspection.status !== "submitted" && inspection.status !== "transferred";

  const config =
    statusConfig[inspection.status] ?? statusConfig.draft;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B5E]">
            Inspecao: {inspection.equipment?.copel_ra_code ?? "—"}
          </h1>
          {inspection.equipment?.manufacturer && (
            <p className="text-sm text-gray-500 mt-1">
              Fabricante: {inspection.equipment.manufacturer}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(inspection.status === "submitted" ||
            inspection.status === "transferred") && (
            <ExportButton inspectionId={inspection.id} />
          )}
          {inspection.status === "submitted" && (
            <TransferButton inspectionId={inspection.id} />
          )}
          <Badge variant={config.variant}>{config.label}</Badge>
          <Link
            href="/dashboard/inspecoes"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            Voltar
          </Link>
        </div>
      </div>

      {/* Client-side wrapper with form lock + summary + checklist + photos */}
      <InspectionDetailClient
        inspectionId={inspection.id}
        inspectionStatus={inspection.status}
        inspectionNotes={inspection.observations}
        checklistItems={checklistItems}
        photos={photos}
        isEditable={isEditable}
      />

      {/* Audit log - admin only */}
      {isAdmin && (
        <div className="mt-8">
          <AuditLog entries={auditEntries} />
        </div>
      )}
    </div>
  );
}
