import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getEquipmentByServiceOrderId,
  getInspectionById,
  getServiceOrderById,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { RELAY_FIELD_ORDER } from "@/lib/relay-qr-parser";
import { QR_FIELD_ORDER } from "@/lib/qr-parser";
import { getPhotoLabel } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  approved: "Aprovado",
  rejected: "Reprovado",
  na: "N/A",
  pending: "Pendente",
};

const INSPECTION_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  in_progress: "Em Andamento",
  ready_for_review: "Pronta para Revisão",
  aprovado: "Aprovado",
  relatorio_reprovado: "Relatório Reprovado",
  equipamento_reprovado: "Equipamento Reprovado",
  transferred: "Cadastrada",
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("pt-BR");
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
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
  // QR data is saved on the inspection row (not synced to equipment columns),
  // so it's the primary source for marca / serials; equipment fields act as
  // fallback (filled only when an equipment is created manually).
  const qrData =
    (inspection as { qr_data?: Record<string, string> | null }).qr_data ?? null;
  const relayData =
    (inspection as { relay_data?: Record<string, string> | null }).relay_data ??
    null;
  const inspectorName =
    (inspection.inspector as { full_name?: string } | undefined)?.full_name ??
    "—";
  const dateTimeStr = formatDateTime(
    inspection.submitted_at ?? inspection.created_at
  );
  const statusLabel =
    INSPECTION_STATUS_LABELS[inspection.status] ?? inspection.status;

  // Compute inspection reference (OS_NUMBER-XX/YY) for title and filename.
  let inspectionRef: string | null = null;
  let orderNumber: string | null = null;
  let positionIndex = 0;
  let positionTotal = 0;
  if (inspection.service_order_id) {
    try {
      const [order, equipmentList] = await Promise.all([
        getServiceOrderById(inspection.service_order_id),
        getEquipmentByServiceOrderId(inspection.service_order_id),
      ]);
      orderNumber = order?.order_number ?? null;
      positionTotal = equipmentList.length;
      const idx = equipmentList.findIndex(
        (eq) => eq.id === inspection.equipment_id
      );
      positionIndex = idx >= 0 ? idx + 1 : 0;
      if (orderNumber && positionTotal > 0 && positionIndex > 0) {
        const pad = (n: number) => String(n).padStart(2, "0");
        inspectionRef = `${orderNumber}-${pad(positionIndex)}/${pad(positionTotal)}`;
      }
    } catch {
      // Non-critical
    }
  }

  // Create PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header — uppercase title with OS number / equipment position
  const titleBase = "RELATÓRIO DE INSPEÇÃO DO EQUIPAMENTO";
  const titleText = inspectionRef ? `${titleBase} ${inspectionRef}` : titleBase;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(titleText, pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${dateTimeStr}`, pageWidth / 2, 28, { align: "center" });

  // Equipment info table — no header row, no Campo/Valor.
  // 052R is the "Nº COPEL RELIGADOR"; 300 is the "Nº COPEL DO CONTROLE".
  const numero052r = equipment?.numero_052r || equipment?.copel_ra_code || "—";
  const numero300 =
    equipment?.numero_300 || equipment?.copel_control_code || "—";
  const marca =
    qrData?.marca || equipment?.marca || equipment?.manufacturer || "—";
  const modelo = qrData?.modelo || equipment?.modelo || "—";
  const fabricanteRele = relayData?.fabricante || "—";
  const modeloRele = relayData?.modelo || "—";
  const serieMecanismo =
    qrData?.numero_serie_tanque ||
    equipment?.numero_serie_tanque ||
    equipment?.mechanism_serial ||
    "—";
  const serieControle =
    qrData?.numero_serie_controle ||
    equipment?.numero_serie_controle ||
    equipment?.control_box_serial ||
    "—";
  const serieRele =
    relayData?.numero_serie || equipment?.protection_relay_serial || "—";

  const equipmentRows: [string, string][] = [
    ["Nº Copel Religador", numero052r],
    ["Nº Copel do Controle", numero300],
    ["Marca", marca],
    ["Modelo", modelo],
    ["Fabricante do Relé", fabricanteRele],
    ["Modelo do Relé", modeloRele],
    ["Nº Série Mecanismo", serieMecanismo],
    ["Nº Série Caixa Controle", serieControle],
    ["Nº Série Relé Proteção", serieRele],
    ["Inspetor", inspectorName],
    ["Status", statusLabel],
  ];

  autoTable(doc, {
    startY: 36,
    body: equipmentRows,
    theme: "grid",
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
  });

  // Equipment data (formerly "Dados do QR Code (Equipamento)") — comes BEFORE relay data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentY = (doc as any).lastAutoTable?.finalY ?? 80;

  const qrRows = qrData
    ? QR_FIELD_ORDER.map(
        (field) => [field.label, qrData[field.key] ?? ""] as [string, string]
      ).filter(([, v]) => v)
    : [];
  if (qrRows.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Dados do Equipamento", 14, currentY + 10);

    autoTable(doc, {
      startY: currentY + 14,
      body: qrRows,
      theme: "grid",
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable?.finalY ?? currentY + 14;
  }

  // Relay data — only if present
  const relayRows = relayData
    ? RELAY_FIELD_ORDER.map(
        (field) =>
          [field.label, relayData[field.key] ?? ""] as [string, string]
      ).filter(([, v]) => v)
    : [];

  if (relayRows.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Dados do Relé de Proteção", 14, currentY + 10);

    autoTable(doc, {
      startY: currentY + 14,
      body: relayRows,
      theme: "grid",
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable?.finalY ?? currentY + 14;
  }

  // Checklist results
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
    head: [["Item", "Status", "Motivo Reprovação"]],
    body: checklistData.length > 0 ? checklistData : [["—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: [27, 43, 94], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 30 },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable?.finalY ?? currentY + 14;

  // Observations
  if (inspection.observations) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Observações", 14, currentY + 10);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(
      inspection.observations,
      pageWidth - 28
    );
    doc.text(splitText, 14, currentY + 18);
    currentY = currentY + 18 + splitText.length * 5;
  }

  // Photos — embed each photo on its own portion of a page
  const photos = inspection.photos ?? [];
  if (photos.length > 0) {
    const supabase = await createClient();
    doc.addPage();
    let photoY = 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Fotos da Inspeção", pageWidth / 2, photoY, { align: "center" });
    photoY += 10;

    const maxImgWidth = pageWidth - 28;
    const maxImgHeight = 100;
    const fallbackHeight = 12;

    for (const photo of photos) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const label = getPhotoLabel(photo.photo_type, photo.label);

      try {
        const { data: blob } = await supabase.storage
          .from("inspection-photos")
          .download(photo.storage_path);

        if (blob) {
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const contentType = blob.type || "image/jpeg";
          const format = contentType.includes("png") ? "PNG" : "JPEG";
          const dataUrl = `data:${contentType};base64,${base64}`;

          const props = doc.getImageProperties(dataUrl);
          const scale = Math.min(
            maxImgWidth / props.width,
            maxImgHeight / props.height
          );
          const drawW = props.width * scale;
          const drawH = props.height * scale;

          if (photoY + 4 + drawH + 8 > pageHeight - 14) {
            doc.addPage();
            photoY = 20;
          }

          doc.text(label, 14, photoY);
          photoY += 4;

          const xOffset = 14 + (maxImgWidth - drawW) / 2;
          doc.addImage(
            dataUrl,
            format,
            xOffset,
            photoY,
            drawW,
            drawH,
            undefined,
            "FAST"
          );
          photoY += drawH + 8;
        } else {
          if (photoY + 4 + fallbackHeight + 8 > pageHeight - 14) {
            doc.addPage();
            photoY = 20;
          }
          doc.text(label, 14, photoY);
          photoY += 4;
          doc.setFontSize(9);
          doc.setFont("helvetica", "italic");
          doc.text("(não foi possível carregar a imagem)", 14, photoY + 10);
          photoY += fallbackHeight + 8;
        }
      } catch {
        if (photoY + 4 + fallbackHeight + 8 > pageHeight - 14) {
          doc.addPage();
          photoY = 20;
        }
        doc.text(label, 14, photoY);
        photoY += 4;
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text("(erro ao carregar imagem)", 14, photoY + 10);
        photoY += fallbackHeight + 8;
      }
    }
  }

  // Page numbers — added last, after total page count is known.
  const totalPages = doc.getNumberOfPages();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${pad2(i)}/${pad2(totalPages)}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }
  doc.setTextColor(0, 0, 0);

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  const refForFilename =
    (orderNumber && positionIndex > 0 && positionTotal > 0
      ? `${orderNumber}-${pad2(positionIndex)}-${pad2(positionTotal)}`
      : null) ??
    equipment?.copel_ra_code ??
    "sem-codigo";
  const fileDate = (inspection.submitted_at ?? inspection.created_at)
    ? new Date(inspection.submitted_at ?? inspection.created_at)
        .toISOString()
        .split("T")[0]
    : new Date().toISOString().split("T")[0];
  const filename = `relatorio_${refForFilename}_${fileDate}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
