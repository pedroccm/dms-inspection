import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth, getProfile } from "@/lib/auth";
import { getInspectionById } from "@/lib/queries";
import { getInspectionAuditLogs } from "@/lib/audit";
import { Badge } from "@/components/ui/badge";
import { InspectionDetailClient } from "./inspection-detail-client";
import { ExportButton } from "./export-button";
import { TransferButton } from "./transfer-button";
import { ApprovalPanel } from "./approval-panel";
import { RejectionBanner } from "./rejection-banner";
import { AuditLog } from "./audit-log";
import type { InspectionStatus } from "@/lib/types";

const statusConfig: Record<
  InspectionStatus,
  { label: string; variant: "neutral" | "info" | "warning" | "success" | "danger" }
> = {
  draft: { label: "Rascunho", variant: "neutral" },
  in_progress: { label: "Em Andamento", variant: "info" },
  ready_for_review: { label: "Pronta para Revisao", variant: "warning" },
  aprovado: { label: "Aprovado", variant: "success" },
  relatorio_reprovado: { label: "Relatorio Reprovado", variant: "danger" },
  equipamento_reprovado: { label: "Equipamento Reprovado", variant: "danger" },
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
  const isExecutor = !isAdmin;
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
    inspection.status !== "aprovado" &&
    inspection.status !== "equipamento_reprovado" &&
    inspection.status !== "transferred" &&
    inspection.status !== "ready_for_review" &&
    inspection.status !== "relatorio_reprovado";

  const config =
    statusConfig[inspection.status] ?? statusConfig.draft;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B5E]">
            Inspecao: {inspection.equipment?.copel_ra_code ?? "\u2014"}
          </h1>
          {inspection.equipment?.manufacturer && (
            <p className="text-sm text-gray-500 mt-1">
              Fabricante: {inspection.equipment.manufacturer}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(inspection.status === "aprovado" ||
            inspection.status === "transferred") && (
            <ExportButton inspectionId={inspection.id} />
          )}
          {inspection.status === "aprovado" && (
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

      {/* Rejection banner for executor when report is rejected */}
      {isExecutor && inspection.status === "relatorio_reprovado" && (
        <RejectionBanner
          inspectionId={inspection.id}
          rejectionReason={inspection.rejection_reason}
        />
      )}

      {/* Equipment rejection reason display */}
      {inspection.status === "equipamento_reprovado" && inspection.rejection_reason && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg" data-testid="equipment-rejection-display">
          <div className="flex items-start gap-3">
            <span className="text-red-600 text-xl mt-0.5">&#10060;</span>
            <div>
              <h3 className="text-sm font-semibold text-red-800 mb-1">
                Equipamento Reprovado - Defeito de Fabricacao
              </h3>
              <p className="text-sm text-red-700">
                <span className="font-medium">Motivo:</span> {inspection.rejection_reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Approval Panel for Master when ready for review */}
      {isAdmin && inspection.status === "ready_for_review" && (
        <ApprovalPanel inspectionId={inspection.id} />
      )}

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
