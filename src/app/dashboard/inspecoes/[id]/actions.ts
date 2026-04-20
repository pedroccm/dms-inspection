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
    return { success: false, error: "Item não encontrado." };
  }

  const { data: inspection, error: inspError } = await supabase
    .from("inspections")
    .select("id, inspector_id, status")
    .eq("id", item.inspection_id)
    .single();

  if (inspError || !inspection) {
    return { success: false, error: "Inspeção não encontrada." };
  }

  if (inspection.inspector_id !== user.id) {
    return { success: false, error: "Você não tem permissão para editar esta inspeção." };
  }

  if (inspection.status === "aprovado" || inspection.status === "equipamento_reprovado" || inspection.status === "transferred") {
    return { success: false, error: "Esta inspeção não pode mais ser editada." };
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
    rejection_reason: status === "rejected" ? (rejectionReason?.trim() ?? null) : null,
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
    return { success: false, error: "Inspeção não encontrada." };
  }

  if (inspection.inspector_id !== user.id) {
    return { success: false, error: "Você não tem permissão para editar esta inspeção." };
  }

  if (inspection.status === "aprovado" || inspection.status === "equipamento_reprovado" || inspection.status === "transferred") {
    return { success: false, error: "Esta inspeção não pode mais ser editada." };
  }

  const { error: updateError } = await supabase
    .from("inspections")
    .update({ observations: observations.trim(), updated_at: new Date().toISOString() })
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
    return { success: false, error: "Inspeção não encontrada." };
  }

  if (inspection.inspector_id !== user.id) {
    return { success: false, error: "Você não tem permissão para editar esta inspeção." };
  }

  // Only allow draft → in_progress transition
  if (status === "in_progress" && inspection.status !== "draft") {
    return { success: false, error: "Apenas inspeções em rascunho podem ser iniciadas." };
  }

  const { error: updateError } = await supabase
    .from("inspections")
    .update({
      status,
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
    return { success: false, error: "Inspeção não encontrada." };
  }

  if (inspection.inspector_id !== user.id) {
    return { success: false, error: "Você não tem permissão para editar esta inspeção." };
  }

  if (inspection.status === "aprovado" || inspection.status === "equipamento_reprovado" || inspection.status === "transferred") {
    return { success: false, error: "Esta inspeção não pode mais ser editada." };
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
      error: `Ainda existem ${pendingItems.length} itens pendentes de avaliação.`,
    };
  }

  const { error: updateError } = await supabase
    .from("inspections")
    .update({
      status: "ready_for_review",
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
    return { success: false, error: "Não autenticado." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
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
    return { success: false, error: "Inspeção não encontrada." };
  }

  if (inspection.status !== "aprovado") {
    return { success: false, error: "Apenas inspeções aprovadas podem ser marcadas como transferidas." };
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

  // Also mark the equipment as Cadastrado (registered), so the OS panel checkbox
  // and this button stay in sync. Trigger OS status sync afterwards.
  const { data: fullInsp } = await supabase
    .from("inspections")
    .select("equipment_id, service_order_id")
    .eq("id", inspectionId)
    .single();

  if (fullInsp?.equipment_id) {
    await supabase
      .from("equipment")
      .update({
        registered: true,
        registered_at: new Date().toISOString(),
        registered_by: profile.id,
      })
      .eq("id", fullInsp.equipment_id);
  }

  if (fullInsp?.service_order_id) {
    try {
      const { syncOrderStatus } = await import("@/app/dashboard/ordens/actions");
      await syncOrderStatus(fullInsp.service_order_id);
    } catch {
      // non-critical
    }
  }

  return { success: true };
}

// ─── Approval Flow Actions (RF-10) ────────────────────────────

async function requireAdminUser() {
  await requireAuth();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado.", user: null, supabase: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Apenas o Master pode realizar esta ação.", user: null, supabase: null, profile: null };
  }

  return { error: null, user, supabase, profile };
}

export async function approveInspection(inspectionId: string) {
  const { error: authError, supabase, profile } = await requireAdminUser();
  if (authError || !supabase || !profile) {
    return { success: false, error: authError ?? "Erro de autenticação." };
  }

  const { data: inspection, error: inspError } = await supabase
    .from("inspections")
    .select("id, status, service_order_id")
    .eq("id", inspectionId)
    .single();

  if (inspError || !inspection) {
    return { success: false, error: "Inspeção não encontrada." };
  }

  if (inspection.status !== "ready_for_review") {
    return { success: false, error: "Apenas inspeções prontas para revisão podem ser aprovadas." };
  }

  const { error: updateError } = await supabase
    .from("inspections")
    .update({
      status: "aprovado",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
      rejection_type: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inspectionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Auto-promote the parent OS to "aprovada" when all its inspections are approved.
  if (inspection.service_order_id) {
    try {
      const { syncOrderStatus } = await import("@/app/dashboard/ordens/actions");
      await syncOrderStatus(inspection.service_order_id);
    } catch {
      // Non-critical — the master can still tick equipment manually
    }
  }

  return { success: true };
}

export async function rejectReport(inspectionId: string, reason: string) {
  const { error: authError, supabase, profile } = await requireAdminUser();
  if (authError || !supabase || !profile) {
    return { success: false, error: authError ?? "Erro de autenticação." };
  }

  const { data: inspection, error: inspError } = await supabase
    .from("inspections")
    .select("id, status")
    .eq("id", inspectionId)
    .single();

  if (inspError || !inspection) {
    return { success: false, error: "Inspeção não encontrada." };
  }

  if (inspection.status !== "ready_for_review") {
    return { success: false, error: "Apenas inspeções prontas para revisão podem ser reprovadas." };
  }

  const { error: updateError } = await supabase
    .from("inspections")
    .update({
      status: "relatorio_reprovado",
      rejection_reason: reason.trim(),
      rejection_type: "relatorio",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", inspectionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function resumeInspection(inspectionId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: inspection, error: inspError } = await supabase
    .from("inspections")
    .select("id, inspector_id, status")
    .eq("id", inspectionId)
    .single();

  if (inspError || !inspection) {
    return { success: false, error: "Inspeção não encontrada." };
  }

  if (inspection.inspector_id !== user.id) {
    return { success: false, error: "Você não tem permissão para editar esta inspeção." };
  }

  if (inspection.status !== "relatorio_reprovado") {
    return { success: false, error: "Apenas inspeções com relatório reprovado podem ser retomadas." };
  }

  const { error: updateError } = await supabase
    .from("inspections")
    .update({
      status: "in_progress",
      rejection_reason: null,
      rejection_type: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inspectionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
