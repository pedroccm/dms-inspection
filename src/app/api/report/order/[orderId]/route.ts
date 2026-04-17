import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const INSPECTION_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  in_progress: "Em Andamento",
  ready_for_review: "Pronta para Revisão",
  aprovado: "Aprovado",
  relatorio_reprovado: "Rel. Reprovado",
  equipamento_reprovado: "Eq. Reprovado",
  transferred: "Transferida",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { orderId } = await params;
  const supabase = await createClient();

  // Fetch the service order
  const { data: order, error: orderError } = await supabase
    .from("service_orders")
    .select(
      "*, assignee:profiles!assigned_to(full_name)"
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: "Ordem de servico nao encontrada" },
      { status: 404 }
    );
  }

  // Fetch all inspections for this service order
  const { data: inspections, error: inspError } = await supabase
    .from("inspections")
    .select(
      "*, equipment(copel_ra_code, manufacturer), inspector:profiles!inspector_id(full_name)"
    )
    .eq("service_order_id", orderId)
    .order("created_at", { ascending: true });

  if (inspError) {
    return NextResponse.json(
      { error: "Erro ao buscar inspecoes" },
      { status: 500 }
    );
  }

  const inspectionList = inspections ?? [];

  // Create PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString("pt-BR");

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("DIEN - Relatório da Ordem de Serviço", pageWidth / 2, 20, {
    align: "center",
  });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${today}`, pageWidth / 2, 28, { align: "center" });

  // Order info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Dados da Ordem", 14, 40);

  const assigneeName =
    (order.assignee as { full_name?: string } | null)?.full_name ?? "—";

  const orderData = [
    ["Titulo", order.title ?? "—"],
    ["Cliente", order.client_name ?? "—"],
    ["Contrato", order.contract_name ?? "—"],
    ["Local da Inspecao", order.location ?? "—"],
    ["Inspetor Responsavel", assigneeName],
    ["Data Inicio", formatDate(order.start_date)],
    ["Data Fim", formatDate(order.end_date)],
  ];

  autoTable(doc, {
    startY: 44,
    head: [["Campo", "Valor"]],
    body: orderData,
    theme: "grid",
    headStyles: { fillColor: [27, 43, 94], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
  });

  // Equipment summary table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentY = (doc as any).lastAutoTable?.finalY ?? 100;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Equipamentos", 14, currentY + 10);

  const equipmentRows = inspectionList.map((insp) => {
    const eq = insp.equipment as {
      copel_ra_code?: string;
      manufacturer?: string;
    } | null;
    return [
      eq?.copel_ra_code ?? "—",
      eq?.manufacturer ?? "—",
      INSPECTION_STATUS_LABELS[insp.status] ?? insp.status,
    ];
  });

  autoTable(doc, {
    startY: currentY + 14,
    head: [["Codigo Copel RA", "Fabricante", "Status"]],
    body: equipmentRows.length > 0 ? equipmentRows : [["—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: [27, 43, 94], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
  });

  // Summary counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable?.finalY ?? 160;

  const totalCount = inspectionList.length;
  const aprovadoCount = inspectionList.filter(
    (i) => i.status === "aprovado" || i.status === "transferred"
  ).length;
  const reprovadoCount = inspectionList.filter(
    (i) =>
      i.status === "equipamento_reprovado" ||
      i.status === "relatorio_reprovado"
  ).length;
  const pendingCount = totalCount - aprovadoCount - reprovadoCount;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo", 14, currentY + 10);

  autoTable(doc, {
    startY: currentY + 14,
    head: [["Descricao", "Quantidade"]],
    body: [
      ["Total de Equipamentos", String(totalCount)],
      ["Aprovados / Transferidos", String(aprovadoCount)],
      ["Reprovados", String(reprovadoCount)],
      ["Pendentes / Em Andamento", String(pendingCount)],
    ],
    theme: "grid",
    headStyles: { fillColor: [27, 43, 94], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
  });

  // Footer line
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable?.finalY ?? 200;

  if (currentY > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(14, currentY + 10, pageWidth - 14, currentY + 10);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${today}`, 14, currentY + 18);

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  const safeTitle = (order.title ?? "ordem")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 50);
  const fileDate = new Date().toISOString().split("T")[0];
  const filename = `relatorio_os_${safeTitle}_${fileDate}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
