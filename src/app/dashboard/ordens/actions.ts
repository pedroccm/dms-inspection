"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function createServiceOrder(formData: FormData) {
  const user = await requireAdmin();

  const title = (formData.get("title") as string)?.trim();
  const clientName = (formData.get("client_name") as string)?.trim();
  const location = (formData.get("location") as string)?.trim() || null;
  const startDate = (formData.get("start_date") as string)?.trim() || null;
  const endDate = (formData.get("end_date") as string)?.trim() || null;
  const assignedTo = (formData.get("assigned_to") as string)?.trim();

  if (!title || !clientName || !assignedTo) {
    return { error: "Titulo, nome do cliente e inspetor sao obrigatorios." };
  }

  if (startDate && endDate && startDate > endDate) {
    return { error: "A data de inicio nao pode ser posterior a data de fim." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_orders")
    .insert({
      title,
      client_name: clientName,
      location,
      start_date: startDate,
      end_date: endDate,
      assigned_to: assignedTo,
      status: "open",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Erro ao criar ordem de servico: ${error.message}` };
  }

  revalidatePath("/dashboard/ordens");
  redirect(`/dashboard/ordens/${data.id}`);
}

export async function addEquipmentToOrder(orderId: string, equipmentId: string) {
  await requireAdmin();

  const supabase = await createClient();

  // Check if equipment is already in this order
  const { data: existing } = await supabase
    .from("service_order_equipment")
    .select("id")
    .eq("service_order_id", orderId)
    .eq("equipment_id", equipmentId)
    .maybeSingle();

  if (existing) {
    return { error: "Este equipamento ja esta nesta ordem de servico." };
  }

  // Check if equipment is in another active (non-completed/cancelled) order
  const { data: activeOrders } = await supabase
    .from("service_order_equipment")
    .select("id, service_order_id, service_orders:service_order_id(status)")
    .eq("equipment_id", equipmentId);

  const inActiveOrder = (activeOrders ?? []).some((soe: Record<string, unknown>) => {
    const so = soe.service_orders as { status: string } | null;
    return so && (so.status === "open" || so.status === "in_progress");
  });

  if (inActiveOrder) {
    return { warning: "Atenção: este equipamento ja esta em outra ordem de servico ativa." };
  }

  const { error } = await supabase
    .from("service_order_equipment")
    .insert({
      service_order_id: orderId,
      equipment_id: equipmentId,
      inspection_status: "not_started",
    });

  if (error) {
    return { error: `Erro ao adicionar equipamento: ${error.message}` };
  }

  revalidatePath(`/dashboard/ordens/${orderId}`);
  return { success: true };
}

export async function removeEquipmentFromOrder(orderId: string, equipmentId: string) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase
    .from("service_order_equipment")
    .delete()
    .eq("service_order_id", orderId)
    .eq("equipment_id", equipmentId);

  if (error) {
    return { error: `Erro ao remover equipamento: ${error.message}` };
  }

  revalidatePath(`/dashboard/ordens/${orderId}`);
  return { success: true };
}
