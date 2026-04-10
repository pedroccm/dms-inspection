import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth, getProfile } from "@/lib/auth";
import { getInspectionById } from "@/lib/queries";
import { getInspectionAuditLogs } from "@/lib/audit";
import { Badge } from "@/components/ui/badge";
import { InspectionDetailClient } from "./inspection-detail-client";
import { ExportButton } from "./export-button";
import { PdfButton } from "./pdf-button";
import { TransferButton } from "./transfer-button";
import { ApprovalPanel } from "./approval-panel";
import { RejectionBanner } from "./rejection-banner";
import { AuditLog } from "./audit-log";
import { ClaimButton } from "./claim-button";
import { QrDataSection } from "./qr-data-section";
import type { InspectionStatus } from "@/lib/types";

const statusConfig: Record<
  InspectionStatus,
  { label: string; variant: "neutral" | "info" | "warning" | "success" | "danger" }
> = {
  disponivel: { label: "Disponível", variant: "info" },
  draft: { label: "Rascunho", variant: "neutral" },
  in_progress: { label: "Em Andamento", variant: "info" },
  ready_for_review: { label: "Pronta para Revisão", variant: "warning" },
  aprovado: { label: "Aprovado", variant: "success" },
  relatorio_reprovado: { label: "Relatório Reprovado", variant: "danger" },
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
  const isDisponivel = inspection.status === "disponivel";
  const isEditable =
    inspection.status !== "disponivel" &&
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
            Inspeção: {inspection.equipment?.copel_ra_code ?? "Ficha de Inspeção"}
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
            <>
              <PdfButton inspectionId={inspection.id} />
              <ExportButton inspectionId={inspection.id} />
            </>
          )}
          {inspection.status === "aprovado" && (
            <TransferButton inspectionId={inspection.id} />
          )}
          <Badge variant={config.variant}>{config.label}</Badge>
          <Link
            href={inspection.service_order_id ? `/dashboard/ordens/${inspection.service_order_id}` : "/dashboard/ordens"}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            Voltar
          </Link>
        </div>
      </div>

      {/* 052R and 300 Numbers — sourced from equipment or inspection (backwards compat) */}
      {(() => {
        const n052r = inspection.equipment?.numero_052r ?? inspection.numero_052r;
        const n300 = inspection.equipment?.numero_300 ?? inspection.numero_300;
        if (!n052r && !n300) return null;
        return (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Números de Identificação</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {n052r && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">052R:</span>
                  <span className="text-lg font-bold text-blue-900">{n052r}</span>
                </div>
              )}
              {n300 && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-sm font-medium text-green-700">300:</span>
                  <span className="text-lg font-bold text-green-900">{n300}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* QR Data Display */}
      {inspection.qr_data && Object.keys(inspection.qr_data).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do QR Code</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {Object.entries(inspection.qr_data).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium text-gray-500 uppercase">{key}</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Claim button for executor when status is disponivel */}
      {isDisponivel && isExecutor && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Esta ficha está disponível para reivindicação. Clique abaixo para iniciar a inspeção.
            </p>
            <ClaimButton inspectionId={inspection.id} />
          </div>
        </div>
      )}

      {/* QR Data input section (for executor after claiming, before completing) */}
      {!isDisponivel && isEditable && isExecutor && (
        <QrDataSection
          inspectionId={inspection.id}
          existingQrData={inspection.qr_data}
        />
      )}

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
                Equipamento Reprovado - Defeito de Fabricação
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
      {!isDisponivel && (
        <InspectionDetailClient
          inspectionId={inspection.id}
          inspectionStatus={inspection.status}
          inspectionNotes={inspection.observations}
          checklistItems={checklistItems}
          photos={photos}
          isEditable={isEditable}
        />
      )}

      {/* Audit log - admin only */}
      {isAdmin && (
        <div className="mt-8">
          <AuditLog entries={auditEntries} />
        </div>
      )}
    </div>
  );
}
