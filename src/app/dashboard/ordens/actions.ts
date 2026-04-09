"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { getNextOrderNumber } from "@/lib/queries";

export async function createServiceOrder(formData: FormData) {
  const user = await requireAdmin();

  const clientName = (formData.get("client_name") as string)?.trim();
  const startDate = (formData.get("start_date") as string)?.trim() || null;
  const assignedTo = (formData.get("assigned_to") as string)?.trim();
  const equipmentCountStr = (formData.get("equipment_count") as string)?.trim();
  const clientRequestDate = (formData.get("client_request_date") as string)?.trim() || null;
  const locationId = (formData.get("location_id") as string)?.trim() || null;
  const newLocationName = (formData.get("new_location_name") as string)?.trim() || null;
  const assignedTeamId = (formData.get("assigned_team_id") as string)?.trim() || null;

  const equipmentCount = parseInt(equipmentCountStr || "0", 10);

  if (!clientName || !assignedTo) {
    return { error: "Nome do cliente e executor são obrigatórios." };
  }

  if (!equipmentCount || equipmentCount < 1) {
    return { error: "A quantidade de equipamentos deve ser pelo menos 1." };
  }

  // Collect 052R and 300 numbers from form
  const fichaNumbers: { numero_052r: string; numero_300: string }[] = [];
  for (let i = 0; i < equipmentCount; i++) {
    const n052r = (formData.get(`numero_052r_${i}`) as string)?.trim() || "";
    const n300 = (formData.get(`numero_300_${i}`) as string)?.trim() || "";
    if (!n052r || !n300) {
      return { error: `Preencha os números 052R e 300 para o equipamento ${i + 1}.` };
    }
    fichaNumbers.push({ numero_052r: `052R-${n052r}`, numero_300: `300-${n300}` });
  }

  const supabase = await createClient();

  // If new location, create it first
  let finalLocationId = locationId;
  if (locationId === "__new__" && newLocationName) {
    const { data: newLoc, error: locError } = await supabase
      .from("inspection_locations")
      .insert({ name: newLocationName })
      .select("id")
      .single();

    if (locError) {
      return { error: `Erro ao criar local: ${locError.message}` };
    }
    finalLocationId = newLoc.id;
  } else if (locationId === "__new__") {
    return { error: "Informe o nome do novo local." };
  }

  // Auto-generate order number
  const orderNumber = await getNextOrderNumber();

  const { data, error } = await supabase
    .from("service_orders")
    .insert({
      title: orderNumber,
      order_number: orderNumber,
      client_name: clientName,
      location: null,
      location_id: finalLocationId || null,
      start_date: startDate,
      end_date: null,
      assigned_to: assignedTo,
      assigned_team_id: assignedTeamId || null,
      equipment_count: equipmentCount,
      client_request_date: clientRequestDate,
      status: "open",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Erro ao criar ordem de serviço: ${error.message}` };
  }

  // Create inspection fichas (one per equipment)
  const inspectionInserts = fichaNumbers.map((ficha) => ({
    service_order_id: data.id,
    status: "disponivel" as const,
    numero_052r: ficha.numero_052r,
    numero_300: ficha.numero_300,
  }));

  const { error: fichaError } = await supabase
    .from("inspections")
    .insert(inspectionInserts);

  if (fichaError) {
    return { error: `Ordem criada, mas erro ao criar fichas: ${fichaError.message}` };
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
    return { error: "Este equipamento já está nesta ordem de serviço." };
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

  const { error } = await supabase
    .from("service_order_equipment")
    .insert({
      service_order_id: orderId,
      equipment_id: equipmentId,
    });

  if (error) {
    return { error: `Erro ao adicionar equipamento: ${error.message}` };
  }

  revalidatePath(`/dashboard/ordens/${orderId}`);

  if (inActiveOrder) {
    return { warning: "Equipamento adicionado. Atenção: este equipamento já está em outra ordem de serviço ativa." };
  }

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
