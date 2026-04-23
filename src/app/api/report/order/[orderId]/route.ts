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
  transferred: "Cadastrada",
};

// Derived equipment status matching the UI (5 stages):
// Pendente → Em Inspeção → Concluído → Relatório Aprovado → Cadastrada
function getEquipmentStatusLabel(
  inspectionStatus: string | null | undefined,
  registered: boolean | undefined
): string {
  if (registered) return "Cadastrada";
  if (!inspectionStatus) return "Pendente";
  if (inspectionStatus === "transferred") return "Cadastrada";
  if (inspectionStatus === "aprovado") return "Relatório Aprovado";
  if (inspectionStatus === "ready_for_review") return "Concluído";
  if (inspectionStatus === "disponivel") return "Pendente";
  return "Em Inspeção";
}

// Ensure the "052R-" / "300-" prefix is present even if the stored value
// only contains the numeric portion.
function withPrefix(prefix: string, value: string | null | undefined): string {
  if (!value) return "—";
  const v = String(value).trim();
  if (!v) return "—";
  return v.toUpperCase().startsWith(prefix.toUpperCase()) ? v : `${prefix}${v}`;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  in_progress: "Aberta",
  aprovada: "Aberta",
  finalizada: "Finalizada",
  medida: "Medida",
  faturada: "Faturada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
      "*, assignee:profiles!assigned_to(full_name), inspection_location:inspection_locations!location_id(name)"
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
      "*, equipment(copel_ra_code, manufacturer, numero_052r, numero_300, registered, marca, numero_serie_tanque, numero_serie_controle), inspector:profiles!inspector_id(full_name)"
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

  // Create PDF — landscape to fit the wider equipment summary table
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();
  const nowText = formatDateTime(now);

  // Header — document title carries the OS number
  const orderNumber = (order.order_number ?? order.title ?? "").toString();
  const titleText = `RELATÓRIO DA ORDEM DE SERVIÇO – ${orderNumber}`.toUpperCase();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(titleText, pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${nowText}`, pageWidth / 2, 28, { align: "center" });

  const assigneeName =
    (order.assignee as { full_name?: string } | null)?.full_name ?? "—";

  const locationName =
    (order.inspection_location as { name?: string } | null)?.name
    ?? order.location
    ?? "—";

  const orderData = [
    ["Cliente", order.client_name ?? "—"],
    ["Contrato", order.contract_name ?? "—"],
    ["Local da Inspeção", locationName],
    ["Inspetor Responsável", assigneeName],
    ["Status", ORDER_STATUS_LABELS[order.status] ?? order.status],
    ["Data de início da inspeção", formatDate(order.start_date)],
    ["Data da finalização do cadastro", formatDate(order.finalized_at ?? null)],
  ];

  autoTable(doc, {
    startY: 36,
    body: orderData,
    theme: "grid",
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
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
      marca?: string;
      numero_052r?: string;
      numero_300?: string;
      numero_serie_tanque?: string;
      numero_serie_controle?: string;
      registered?: boolean;
    } | null;
    const relayData =
      (insp as { relay_data?: Record<string, string> | null }).relay_data ?? null;
    return [
      eq?.marca || eq?.manufacturer || "—",
      withPrefix("052R-", eq?.numero_052r),
      withPrefix("300-", eq?.numero_300),
      eq?.numero_serie_tanque || "—",
      relayData?.numero_serie || "—",
      eq?.numero_serie_controle || "—",
      getEquipmentStatusLabel(insp.status, eq?.registered),
    ];
  });

  autoTable(doc, {
    startY: currentY + 14,
    head: [[
      "Fabricante",
      "Nº Copel do Religador",
      "Nº Copel do controle",
      "Nº de série do religador",
      "Nº de série do relé",
      "Nº de série do controle",
      "STATUS",
    ]],
    body: equipmentRows.length > 0 ? equipmentRows : [["—", "—", "—", "—", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: [27, 43, 94], fontSize: 9, halign: "center" },
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
  const cadastradoCount = inspectionList.filter(
    (i) => (i.equipment as { registered?: boolean } | null)?.registered
  ).length;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo", 14, currentY + 10);

  autoTable(doc, {
    startY: currentY + 14,
    head: [["Descricao", "Quantidade"]],
    body: [
      ["Total de Equipamentos", String(totalCount)],
      ["Aprovados", String(aprovadoCount)],
      ["Cadastrados", `${cadastradoCount}/${totalCount}`],
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
  doc.text(`Gerado em: ${nowText}`, 14, currentY + 18);

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
