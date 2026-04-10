"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function claimInspection(inspectionId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch the inspection
  const { data: inspection, error: inspError } = await supabase
    .from("inspections")
    .select("id, status, service_order_id, claimed_by")
    .eq("id", inspectionId)
    .single();

  if (inspError || !inspection) {
    return { success: false, error: "Ficha não encontrada." };
  }

  if (inspection.status !== "disponivel") {
    return { success: false, error: "Esta ficha não está disponível para reivindicação." };
  }

  if (inspection.claimed_by) {
    return { success: false, error: "Esta ficha já foi reivindicada." };
  }

  // Verify the user is assigned to this order (directly or via team)
  const { data: order, error: orderError } = await supabase
    .from("service_orders")
    .select("id, assigned_to, assigned_team_id")
    .eq("id", inspection.service_order_id)
    .single();

  if (orderError || !order) {
    return { success: false, error: "Ordem de serviço não encontrada." };
  }

  let hasAccess = order.assigned_to === user.id;

  if (!hasAccess && order.assigned_team_id) {
    const { data: membership } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", order.assigned_team_id)
      .eq("user_id", user.id)
      .maybeSingle();

    hasAccess = !!membership;
  }

  if (!hasAccess) {
    return { success: false, error: "Você não tem acesso a esta ordem de serviço." };
  }

  // Claim the ficha
  const { error: updateError } = await supabase
    .from("inspections")
    .update({
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
      inspector_id: user.id,
      status: "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", inspectionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath(`/dashboard/inspecoes/${inspectionId}`);
  revalidatePath(`/dashboard/ordens/${inspection.service_order_id}`);

  return { success: true };
}

export async function saveQrData(inspectionId: string, qrData: Record<string, string>) {
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

  // If status is draft, move to in_progress when QR data is saved
  const updateData: Record<string, unknown> = {
    qr_data: qrData,
  };
  if (inspection.status === "draft") {
    updateData.status = "in_progress";
  }

  const { error: updateError } = await supabase
    .from("inspections")
    .update(updateData)
    .eq("id", inspectionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath(`/dashboard/inspecoes/${inspectionId}`);
  return { success: true };
}
