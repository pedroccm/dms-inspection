"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function createInspection(formData: FormData) {
  const user = await requireAuth();

  const equipmentId = (formData.get("equipment_id") as string)?.trim();
  const serviceOrderId = (formData.get("service_order_id") as string)?.trim();

  if (!equipmentId) {
    return { error: "Selecione um equipamento." };
  }

  if (!serviceOrderId) {
    return { error: "Selecione uma ordem de serviço." };
  }

  const supabase = await createClient();

  // Validate equipment exists
  const { data: equipment } = await supabase
    .from("equipment")
    .select("id")
    .eq("id", equipmentId)
    .maybeSingle();

  if (!equipment) {
    return { error: "Equipamento não encontrado." };
  }

  // Validate service order exists
  const { data: serviceOrder } = await supabase
    .from("service_orders")
    .select("id")
    .eq("id", serviceOrderId)
    .maybeSingle();

  if (!serviceOrder) {
    return { error: "Ordem de serviço não encontrada." };
  }

  // Validate equipment is part of this service order
  const { data: soEquipment } = await supabase
    .from("service_order_equipment")
    .select("id")
    .eq("service_order_id", serviceOrderId)
    .eq("equipment_id", equipmentId)
    .maybeSingle();

  if (!soEquipment) {
    return {
      error:
        "Este equipamento não está associado à ordem de serviço selecionada.",
    };
  }

  // Check for existing in-progress inspection for same equipment by same user
  const { data: existingInspection } = await supabase
    .from("inspections")
    .select("id")
    .eq("equipment_id", equipmentId)
    .eq("inspector_id", user.id)
    .in("status", ["draft", "in_progress"])
    .maybeSingle();

  if (existingInspection) {
    return {
      error: `Já existe uma inspeção em andamento para este equipamento.`,
      existingInspectionId: existingInspection.id,
    };
  }

  // Create inspection (DB trigger auto-creates 18 checklist items)
  const { data: newInspection, error } = await supabase
    .from("inspections")
    .insert({
      equipment_id: equipmentId,
      service_order_id: serviceOrderId,
      inspector_id: user.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Erro ao criar inspeção: ${error.message}` };
  }

  revalidatePath("/dashboard/inspecoes");
  redirect(`/dashboard/inspecoes/${newInspection.id}`);
}
