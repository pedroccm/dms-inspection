import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getEquipmentById } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { StartInspectionButton } from "./start-inspection-button";
import type { Equipment, InspectionStatus } from "@/lib/types";

interface EquipamentoDetailPageProps {
  params: Promise<{ id: string }>;
}

const INSPECTION_STATUS_CONFIG: Record<
  InspectionStatus,
  { label: string; variant: "neutral" | "info" | "warning" | "success" | "danger" }
> = {
  disponivel: { label: "Disponível", variant: "info" },
  draft: { label: "Rascunho", variant: "neutral" },
  in_progress: { label: "Em Andamento", variant: "warning" },
  ready_for_review: { label: "Pronta para Revisão", variant: "warning" },
  aprovado: { label: "Aprovado", variant: "success" },
  relatorio_reprovado: { label: "Relatório Reprovado", variant: "danger" },
  equipamento_reprovado: { label: "Equipamento Reprovado", variant: "danger" },
  transferred: { label: "Transferida", variant: "neutral" },
};

export default async function EquipamentoDetailPage({
  params,
}: EquipamentoDetailPageProps) {
  await requireAuth();

  const { id } = await params;

  let equipment;
  try {
    equipment = await getEquipmentById(id);
  } catch {
    notFound();
  }

  if (!equipment) {
    notFound();
  }

  const inspections = equipment.inspections ?? [];
  const hasActiveInspection = inspections.some(
    (i) =>
      i.status !== "aprovado" &&
      i.status !== "transferred" &&
      i.status !== "equipamento_reprovado"
  );
  const hasCompletedInspection = inspections.some(
    (i) => i.status === "aprovado" || i.status === "transferred"
  );

  // Build back link: if equipment belongs to a service order, go back to order detail
  const backHref = equipment.service_order_id
    ? `/dashboard/ordens/${equipment.service_order_id}`
    : "/dashboard/equipamentos";
  const backLabel = equipment.service_order_id ? "Voltar para Ordem" : "Voltar";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B5E]">
            Equipamento: {equipment.copel_ra_code}
          </h1>
          {(equipment.numero_052r || equipment.numero_300) && (
            <p className="text-sm text-gray-500 mt-1">
              {equipment.numero_052r && <span className="mr-3">052R: {equipment.numero_052r}</span>}
              {equipment.numero_300 && <span>300: {equipment.numero_300}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!hasCompletedInspection && !hasActiveInspection && (
            <StartInspectionButton
              equipmentId={equipment.id}
              serviceOrderId={equipment.service_order_id ?? null}
            />
          )}
          <Link
            href={backHref}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            {backLabel}
          </Link>
        </div>
      </div>

      {/* 052R / 300 identification numbers */}
      {(equipment.numero_052r || equipment.numero_300) && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Números de Identificação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {equipment.numero_052r && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-700">052R:</span>
                <span className="text-lg font-bold text-blue-900">{equipment.numero_052r}</span>
              </div>
            )}
            {equipment.numero_300 && (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-sm font-medium text-green-700">300:</span>
                <span className="text-lg font-bold text-green-900">{equipment.numero_300}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No inspection yet — prompt to start one */}
      {inspections.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 text-center">
          <p className="text-yellow-800 font-medium mb-2">
            Nenhuma inspeção iniciada para este equipamento.
          </p>
          <p className="text-sm text-yellow-700 mb-4">
            Clique abaixo para iniciar. Você poderá escanear o QR Code e preencher o checklist.
          </p>
          <StartInspectionButton
            equipmentId={equipment.id}
            serviceOrderId={equipment.service_order_id ?? null}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Dados do Equipamento
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Código Copel do RA (Mecanismo)
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.copel_ra_code || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Código Copel do Controle
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.copel_control_code || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Número de Série do Mecanismo
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.mechanism_serial || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Número de Série da Caixa de Controle
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.control_box_serial || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Número de Série do Relé de Proteção
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.protection_relay_serial || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Fabricante do Religador
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.manufacturer || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Data de Cadastro
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(equipment.created_at).toLocaleDateString("pt-BR")}
            </dd>
          </div>
        </dl>
      </div>

      <TechnicalDataSection equipment={equipment} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Histórico de Inspeções
          </h2>
        </div>
        {inspections.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma inspeção realizada neste equipamento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-[#1B2B5E]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                    Data
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                    Inspetor
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((inspection) => {
                  const config = INSPECTION_STATUS_CONFIG[inspection.status] ?? INSPECTION_STATUS_CONFIG.draft;
                  return (
                    <tr
                      key={inspection.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(inspection.created_at).toLocaleDateString(
                          "pt-BR"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {inspection.inspector?.full_name ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={config.variant}>
                          {config.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/inspecoes/${inspection.id}`}
                          className="text-sm font-medium text-[#F5A623] hover:text-[#E8941E]"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Technical Data Section ─────────────────────────────────

const TECHNICAL_FIELDS: { key: keyof Equipment; label: string }[] = [
  { key: "modelo", label: "Modelo" },
  { key: "marca", label: "Marca" },
  { key: "tipo", label: "Tipo" },
  { key: "numero_serie_controle", label: "Nº Série do Controle" },
  { key: "numero_serie_tanque", label: "Nº Série do Tanque" },
  { key: "tensao_nominal", label: "Tensão Nominal" },
  { key: "nbi", label: "NBI" },
  { key: "frequencia_nominal", label: "Frequência Nominal" },
  { key: "corrente_nominal", label: "Corrente Nominal" },
  { key: "capacidade_interrupcao", label: "Capacidade de Interrupção" },
  { key: "numero_fases", label: "Nº de Fases" },
  { key: "tipo_controle", label: "Tipo de Controle" },
  { key: "modelo_controle", label: "Modelo Controle Eletrônico" },
  { key: "sensor_tensao", label: "Sensor de Tensão" },
  { key: "tc_interno", label: "TC Interno" },
  { key: "sequencia_operacao", label: "Sequência de Operação" },
  { key: "meio_interrupcao", label: "Meio de Interrupção" },
  { key: "massa_interruptor", label: "Massa do Interruptor" },
  { key: "massa_caixa_controle", label: "Massa da Caixa de Controle" },
  { key: "massa_total", label: "Massa Total" },
  { key: "norma_aplicavel", label: "Norma Aplicável" },
];

function TechnicalDataSection({ equipment }: { equipment: Equipment }) {
  // Only show if at least one technical field has data
  const hasData = TECHNICAL_FIELDS.some(
    ({ key }) => equipment[key] != null && equipment[key] !== ""
  );

  if (!hasData) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Dados Técnicos
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
        {TECHNICAL_FIELDS.map(({ key, label }) => {
          const value = equipment[key];
          if (value == null || value === "") return null;
          return (
            <div key={key}>
              <dt className="text-sm font-medium text-gray-500">{label}</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {String(value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
