"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import type { ChecklistItemStatus } from "@/lib/types";

export async function updateChecklistItem(
  itemId: string,
  status: ChecklistItemStatus,
  rejectionReason?: string
) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch the checklist item and its inspection to validate ownership and editability
  const { data: item, error: itemError } = await supabase
    .from("checklist_items")
    .select("id, inspection_id")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    return { success: false, error: "Item nao encontrado." };
  }

  const { data: inspection, error: inspError } = await supabase
    .from("inspections")
    .select("id, inspector_id, status")
    .eq("id", item.inspection_id)
    .single();

  if (inspError || !inspection) {
    return { success: false, error: "Inspecao nao encontrada." };
  }

  if (inspection.inspector_id !== user.id) {
    return { success: false, error: "Voce nao tem permissao para editar esta inspecao." };
  }

  if (inspection.status === "submitted" || inspection.status === "transferred") {
    return { success: false, error: "Esta inspecao nao pode mais ser editada." };
  }

  // Validate rejection reason when status is rejected
  if (status === "rejected") {
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      return {
        success: false,
        error: "Descreva o motivo com pelo menos 10 caracteres.",
      };
    }
  }

  // Build update payload
  const updateData: Record<string, unknown> = {
    status,
    checked: status === "approved",
    rejection_reason: status === "rejected" ? (rejectionReason?.trim() ?? null) : null,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("checklist_items")
    .update(updateData)
    .eq("id", itemId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function updateInspectionObservations(
  inspectionId: string,
  observations: string
) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: inspection, error: inspError } = await supabase
    .from("inspections")
    .select("id, inspector_id, status")
    .eq("id", inspectionId)
    .single();

  if (inspError || !inspection) {
    return { success: false, error: "Inspecao nao encontrada." };
  }

  if (inspection.inspector_id !== user.id) {
    return { success: false, error: "Voce nao tem permissao para editar esta inspecao." };
  }

  if (inspection.status === "submitted" || inspection.status === "transferred") {
    return { success: false, error: "Esta inspecao nao pode mais ser editada." };
  }

  const { error: updateError } = await supabase
    .from("inspections")
    .update({ notes: observations.trim(), updated_at: new Date().toISOString() })
    .eq("id", inspectionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function updateInspectionStatus(
  inspectionId: string,
  status: "draft" | "in_progress"
) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: inspection, error: inspError } = await supabase
    .from("inspections")
    .select("id, inspector_id, status")
    .eq("id", inspectionId)
    .single();

  if (inspError || !inspection) {
    return { success: false, error: "Inspecao nao encontrada." };
  }

  if (inspection.inspector_id !== user.id) {
    return { success: false, error: "Voce nao tem permissao para editar esta inspecao." };
  }

  // Only allow draft → in_progress transition
  if (status === "in_progress" && inspection.status !== "draft") {
    return { success: false, error: "Apenas inspecoes em rascunho podem ser iniciadas." };
  }

  const { error: updateError } = await supabase
    .from("inspections")
    .update({
      status,
      started_at: status === "in_progress" ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inspectionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function completeInspectionEvaluation(inspectionId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: inspection, error: inspError } = await supabase
    .from("inspections")
    .select("id, inspector_id, status")
    .eq("id", inspectionId)
    .single();

  if (inspError || !inspection) {
    return { success: false, error: "Inspecao nao encontrada." };
  }

  if (inspection.inspector_id !== user.id) {
    return { success: false, error: "Voce nao tem permissao para editar esta inspecao." };
  }

  if (inspection.status === "submitted" || inspection.status === "transferred") {
    return { success: false, error: "Esta inspecao nao pode mais ser editada." };
  }

  // Check all items are evaluated
  const { data: items, error: itemsError } = await supabase
    .from("checklist_items")
    .select("id, status")
    .eq("inspection_id", inspectionId);

  if (itemsError) {
    return { success: false, error: itemsError.message };
  }

  const pendingItems = (items ?? []).filter((i) => i.status === "pending");
  if (pendingItems.length > 0) {
    return {
      success: false,
      error: `Ainda existem ${pendingItems.length} itens pendentes de avaliacao.`,
    };
  }

  const { error: updateError } = await supabase
    .from("inspections")
    .update({
      status: "ready_for_review",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", inspectionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function markAsTransferred(inspectionId: string) {
  await requireAuth();
  const supabase = await createClient();

  // Verify the user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nao autenticado." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Apenas administradores podem marcar como transferida." };
  }

  const { data: inspection, error: inspError } = await supabase
    .from("inspections")
    .select("id, status")
    .eq("id", inspectionId)
    .single();

  if (inspError || !inspection) {
    return { success: false, error: "Inspecao nao encontrada." };
  }

  if (inspection.status !== "submitted") {
    return { success: false, error: "Apenas inspecoes enviadas podem ser marcadas como transferidas." };
  }

  const { error: updateError } = await supabase
    .from("inspections")
    .update({
      status: "transferred",
      updated_at: new Date().toISOString(),
    })
    .eq("id", inspectionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
