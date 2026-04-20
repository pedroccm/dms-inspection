import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getInspectionById } from "@/lib/queries";
import { RELAY_FIELD_ORDER } from "@/lib/relay-qr-parser";

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { inspectionId } = await params;

  let inspection;
  try {
    inspection = await getInspectionById(inspectionId);
  } catch {
    return NextResponse.json(
      { error: "Inspeção não encontrada" },
      { status: 404 }
    );
  }

  if (!inspection) {
    return NextResponse.json(
      { error: "Inspeção não encontrada" },
      { status: 404 }
    );
  }

  const equipment = inspection.equipment;
  const checklistItems = inspection.checklist_items ?? [];
  const inspectorName =
    (inspection.inspector as { full_name?: string } | undefined)?.full_name ??
    "";
  const dateStr = formatDate(inspection.submitted_at ?? inspection.created_at);

  // Build CSV content
  const lines: string[] = [];

  // Equipment header
  lines.push(
    "Código Copel RA,Código Copel Controle,Mecanismo (052R),Controle (300),Nº Série Mecanismo,Nº Série Caixa Controle,Nº Série Relé Proteção,Fabricante,Cadastrado"
  );
  lines.push(
    [
      escapeCSV(equipment?.copel_ra_code),
      escapeCSV(equipment?.copel_control_code),
      escapeCSV(equipment?.numero_052r),
      escapeCSV(equipment?.numero_300),
      escapeCSV(equipment?.mechanism_serial),
      escapeCSV(equipment?.control_box_serial),
      escapeCSV(equipment?.protection_relay_serial),
      escapeCSV(equipment?.manufacturer),
      escapeCSV(equipment?.registered ? "Sim" : "Nao"),
    ].join(",")
  );

  // Blank line separator
  lines.push("");

  // Relay data section (optional)
  const relayData = (inspection as { relay_data?: Record<string, string> | null }).relay_data ?? null;
  const relayRows = relayData
    ? RELAY_FIELD_ORDER.filter(({ key }) => relayData[key])
    : [];
  if (relayRows.length > 0) {
    lines.push("Dados do Relé de Proteção");
    lines.push("Campo,Valor");
    for (const field of relayRows) {
      lines.push([escapeCSV(field.label), escapeCSV(relayData![field.key])].join(","));
    }
    lines.push("");
  }

  // Checklist items header
  lines.push("Item de Inspeção,Resultado,Motivo da Reprovação");

  const statusLabels: Record<string, string> = {
    approved: "Aprovado",
    rejected: "Reprovado",
    na: "N/A",
    pending: "Pendente",
  };

  for (const item of checklistItems) {
    lines.push(
      [
        escapeCSV(item.item_name),
        escapeCSV(statusLabels[item.status] ?? item.status),
        escapeCSV(item.rejection_reason),
      ].join(",")
    );
  }

  // Blank line separator
  lines.push("");

  // Observations
  lines.push("Observações");
  lines.push(escapeCSV(inspection.observations));

  // Blank line separator
  lines.push("");

  // Inspector and date
  lines.push(`Inspetor,${escapeCSV(inspectorName)}`);
  lines.push(`Data,${escapeCSV(dateStr)}`);

  const csv = lines.join("\n");
  const copelCode = equipment?.copel_ra_code ?? "sem-codigo";
  const fileDate = (inspection.submitted_at ?? inspection.created_at)
    ? new Date(
        inspection.submitted_at ?? inspection.created_at
      ).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const filename = `inspecao_${copelCode}_${fileDate}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
