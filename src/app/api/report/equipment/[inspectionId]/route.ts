import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getInspectionById } from "@/lib/queries";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const STATUS_LABELS: Record<string, string> = {
  approved: "Aprovado",
  rejected: "Reprovado",
  na: "N/A",
  pending: "Pendente",
};

const INSPECTION_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  in_progress: "Em Andamento",
  ready_for_review: "Pronta para Revisao",
  aprovado: "Aprovado",
  relatorio_reprovado: "Relatorio Reprovado",
  equipamento_reprovado: "Equipamento Reprovado",
  transferred: "Transferida",
};

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

  // Create PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("DIEN - Relatorio de Inspecao", pageWidth / 2, 20, {
    align: "center",
  });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${dateStr}`, pageWidth / 2, 28, { align: "center" });

  // Equipment data
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Dados do Equipamento", 14, 40);

  const equipmentData = [
    ["Codigo Copel RA", equipment?.copel_ra_code ?? "—"],
    ["Codigo Copel Controle", equipment?.copel_control_code ?? "—"],
    ["N. Serie Mecanismo", equipment?.mechanism_serial ?? "—"],
    ["N. Serie Caixa Controle", equipment?.control_box_serial ?? "—"],
    ["N. Serie Rele Protecao", equipment?.protection_relay_serial ?? "—"],
    ["Fabricante", equipment?.manufacturer ?? "—"],
  ];

  autoTable(doc, {
    startY: 44,
    head: [["Campo", "Valor"]],
    body: equipmentData,
    theme: "grid",
    headStyles: { fillColor: [27, 43, 94], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
  });

  // Technical data (from QR code) - only if available
  const technicalFields: [string, string | undefined][] = [
    ["Modelo", equipment?.modelo],
    ["Marca", equipment?.marca],
    ["Tipo", equipment?.tipo],
    ["Tensao Nominal", equipment?.tensao_nominal],
    ["NBI", equipment?.nbi],
    ["Frequencia Nominal", equipment?.frequencia_nominal],
    ["Corrente Nominal", equipment?.corrente_nominal],
    ["Capacidade Interrupcao", equipment?.capacidade_interrupcao],
    ["Numero de Fases", equipment?.numero_fases],
    ["Tipo Controle", equipment?.tipo_controle],
    ["Modelo Controle", equipment?.modelo_controle],
    ["Meio Interrupcao", equipment?.meio_interrupcao],
    ["Norma Aplicavel", equipment?.norma_aplicavel],
  ];

  const availableTechnical = technicalFields.filter(([, v]) => v);

  if (availableTechnical.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastY = (doc as any).lastAutoTable?.finalY ?? 90;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Dados Tecnicos", 14, lastY + 10);

    autoTable(doc, {
      startY: lastY + 14,
      head: [["Campo", "Valor"]],
      body: availableTechnical.map(([k, v]) => [k, v ?? ""]),
      theme: "grid",
      headStyles: { fillColor: [27, 43, 94], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
    });
  }

  // Checklist results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentY = (doc as any).lastAutoTable?.finalY ?? 120;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resultado do Checklist", 14, currentY + 10);

  const checklistData = checklistItems.map((item) => [
    item.item_name,
    STATUS_LABELS[item.status] ?? item.status,
    item.rejection_reason ?? "",
  ]);

  autoTable(doc, {
    startY: currentY + 14,
    head: [["Item", "Status", "Motivo Reprovacao"]],
    body: checklistData.length > 0 ? checklistData : [["—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: [27, 43, 94], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 30 },
    },
  });

  // Observations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable?.finalY ?? 180;

  if (inspection.observations) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Observacoes", 14, currentY + 10);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(
      inspection.observations,
      pageWidth - 28
    );
    doc.text(splitText, 14, currentY + 18);
    currentY = currentY + 18 + splitText.length * 5;
  }

  // Footer
  const footerY = currentY + 15;

  // Check if we need a new page for footer
  if (footerY > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(14, currentY + 10, pageWidth - 14, currentY + 10);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Executor: ${inspectorName}`, 14, currentY + 18);
  doc.text(`Data: ${dateStr}`, 14, currentY + 24);
  doc.text(
    `Status: ${INSPECTION_STATUS_LABELS[inspection.status] ?? inspection.status}`,
    14,
    currentY + 30
  );

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  const copelCode = equipment?.copel_ra_code ?? "sem-codigo";
  const fileDate = (inspection.submitted_at ?? inspection.created_at)
    ? new Date(
        inspection.submitted_at ?? inspection.created_at
      )
        .toISOString()
        .split("T")[0]
    : new Date().toISOString().split("T")[0];
  const filename = `relatorio_${copelCode}_${fileDate}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
