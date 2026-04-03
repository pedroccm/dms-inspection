import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

const STATUS_LABELS: Record<string, string> = {
  approved: "Aprovado",
  rejected: "Reprovado",
  na: "N/A",
  pending: "Pendente",
};

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
    .select("id, title")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: "Ordem de serviço não encontrada" },
      { status: 404 }
    );
  }

  // Fetch all inspections for this service order with their equipment, checklist items, and inspector
  const { data: inspections, error: inspError } = await supabase
    .from("inspections")
    .select(
      "*, equipment(*), checklist_items(*), inspector:profiles!inspector_id(full_name)"
    )
    .eq("service_order_id", orderId)
    .order("created_at", { ascending: true });

  if (inspError) {
    return NextResponse.json(
      { error: "Erro ao buscar inspeções" },
      { status: 500 }
    );
  }

  if (!inspections || inspections.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma inspeção encontrada para esta ordem" },
      { status: 404 }
    );
  }

  // Build comprehensive CSV - each row = one checklist item
  const lines: string[] = [];

  // Header
  lines.push(
    "Código Copel RA,Fabricante,Item,Resultado,Motivo Reprovação,Inspetor,Data"
  );

  for (const inspection of inspections) {
    const equipment = inspection.equipment as {
      copel_ra_code?: string;
      manufacturer?: string;
    } | null;
    const inspector = inspection.inspector as {
      full_name?: string;
    } | null;
    const checklistItems = (inspection.checklist_items ?? []) as {
      item_name: string;
      status: string;
      rejection_reason: string | null;
      sort_order: number;
    }[];
    const dateStr = formatDate(
      inspection.submitted_at ?? inspection.created_at
    );

    // Sort by sort_order
    checklistItems.sort((a, b) => a.sort_order - b.sort_order);

    for (const item of checklistItems) {
      lines.push(
        [
          escapeCSV(equipment?.copel_ra_code),
          escapeCSV(equipment?.manufacturer),
          escapeCSV(item.item_name),
          escapeCSV(STATUS_LABELS[item.status] ?? item.status),
          escapeCSV(item.rejection_reason),
          escapeCSV(inspector?.full_name),
          escapeCSV(dateStr),
        ].join(",")
      );
    }
  }

  const csv = lines.join("\n");
  const fileDate = new Date().toISOString().split("T")[0];
  const filename = `ordem_${orderId}_${fileDate}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
