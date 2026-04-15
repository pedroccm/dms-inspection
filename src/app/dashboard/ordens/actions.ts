"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { getNextOrderNumber } from "@/lib/queries";

export async function createServiceOrder(formData: FormData) {
  const user = await requireAdmin();

  const clientNameRaw = (formData.get("client_name") as string)?.trim();
  const newClientName = (formData.get("new_client_name") as string)?.trim() || null;
  const startDate = (formData.get("start_date") as string)?.trim() || null;
  const assignedTo = (formData.get("assigned_to") as string)?.trim();
  const equipmentCountStr = (formData.get("equipment_count") as string)?.trim();
  const clientRequestDate = (formData.get("client_request_date") as string)?.trim() || null;
  const locationId = (formData.get("location_id") as string)?.trim() || null;
  const newLocationName = (formData.get("new_location_name") as string)?.trim() || null;
  const assignedTeamId = (formData.get("assigned_team_id") as string)?.trim() || null;

  const equipmentCount = parseInt(equipmentCountStr || "0", 10);

  // Resolve client name: inline new client or selected existing
  let clientName = clientNameRaw;
  if (clientNameRaw === "__new__") {
    if (!newClientName) {
      return { error: "Informe o nome do novo cliente." };
    }
    clientName = newClientName;

    // Persist new client to clients table
    const supabaseForClient = await createClient();
    await supabaseForClient.from("clients").insert({ name: newClientName });
  }

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

  // Create equipment records (one per ficha number pair)
  const equipmentInserts = fichaNumbers.map((ficha, index) => ({
    copel_ra_code: `PENDENTE-${crypto.randomUUID().slice(0, 8)}`,
    numero_052r: ficha.numero_052r,
    numero_300: ficha.numero_300,
    service_order_id: data.id,
    created_by: user.id,
  }));

  const { data: equipmentRows, error: equipError } = await supabase
    .from("equipment")
    .insert(equipmentInserts)
    .select("id");

  if (equipError) {
    return { error: `Ordem criada, mas erro ao criar equipamentos: ${equipError.message}` };
  }

  // Link equipment to the service order via junction table
  if (equipmentRows && equipmentRows.length > 0) {
    const junctionInserts = equipmentRows.map((eq) => ({
      service_order_id: data.id,
      equipment_id: eq.id,
    }));

    const { error: junctionError } = await supabase
      .from("service_order_equipment")
      .insert(junctionInserts);

    if (junctionError) {
      return { error: `Equipamentos criados, mas erro ao vincular à ordem: ${junctionError.message}` };
    }
  }

  revalidatePath("/dashboard/ordens");
  redirect(`/dashboard/ordens/${data.id}`);
}

export async function updateEquipmentNumbers(
  orderId: string,
  equipmentId: string,
  formData: FormData
) {
  await requireAdmin();

  const n052r = (formData.get("numero_052r") as string)?.trim();
  const n300 = (formData.get("numero_300") as string)?.trim();

  if (!n052r || !n300) {
    return { error: "Ambos os números são obrigatórios." };
  }

  const supabase = await createClient();

  // Verify order is still open/in_progress
  const { data: order } = await supabase
    .from("service_orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!order || (order.status !== "open" && order.status !== "in_progress")) {
    return { error: "Só é possível editar equipamentos de ordens abertas ou em andamento." };
  }

  const { error } = await supabase
    .from("equipment")
    .update({
      numero_052r: `052R-${n052r}`,
      numero_300: `300-${n300}`,
    })
    .eq("id", equipmentId);

  if (error) {
    return { error: `Erro ao atualizar: ${error.message}` };
  }

  revalidatePath(`/dashboard/ordens/${orderId}`);
  return { success: true };
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

export async function deleteServiceOrder(orderId: string) {
  await requireAdmin();

  const supabase = await createClient();

  // 1. Get all equipment for this order
  const { data: equipment } = await supabase
    .from("equipment")
    .select("id")
    .eq("service_order_id", orderId);

  const equipmentIds = (equipment ?? []).map((e) => e.id);

  if (equipmentIds.length > 0) {
    // 2. Get all inspections for these equipment
    const { data: inspections } = await supabase
      .from("inspections")
      .select("id")
      .in("equipment_id", equipmentIds);

    const inspectionIds = (inspections ?? []).map((i) => i.id);

    if (inspectionIds.length > 0) {
      // 3. Delete checklist items
      await supabase
        .from("checklist_items")
        .delete()
        .in("inspection_id", inspectionIds);

      // 4. Delete photos (from DB — storage cleanup is separate)
      const { data: photos } = await supabase
        .from("photos")
        .select("storage_path")
        .in("inspection_id", inspectionIds);

      await supabase
        .from("photos")
        .delete()
        .in("inspection_id", inspectionIds);

      // 5. Delete photo files from storage
      if (photos && photos.length > 0) {
        const paths = photos.map((p) => p.storage_path);
        await supabase.storage.from("inspection-photos").remove(paths);
      }

      // 6. Delete form locks
      await supabase
        .from("form_locks")
        .delete()
        .in("inspection_id", inspectionIds);

      // 7. Delete inspections
      await supabase
        .from("inspections")
        .delete()
        .in("id", inspectionIds);
    }

    // 8. Delete service_order_equipment junction
    await supabase
      .from("service_order_equipment")
      .delete()
      .eq("service_order_id", orderId);

    // 9. Delete equipment
    await supabase
      .from("equipment")
      .delete()
      .in("id", equipmentIds);
  }

  // 10. Delete inspections directly linked to order (without equipment)
  const { data: directInspections } = await supabase
    .from("inspections")
    .select("id")
    .eq("service_order_id", orderId);

  if (directInspections && directInspections.length > 0) {
    const ids = directInspections.map((i) => i.id);
    await supabase.from("checklist_items").delete().in("inspection_id", ids);
    await supabase.from("photos").delete().in("inspection_id", ids);
    await supabase.from("form_locks").delete().in("inspection_id", ids);
    await supabase.from("inspections").delete().in("id", ids);
  }

  // 11. Delete the service order itself
  const { error } = await supabase
    .from("service_orders")
    .delete()
    .eq("id", orderId);

  if (error) {
    return { error: `Erro ao excluir ordem: ${error.message}` };
  }

  revalidatePath("/dashboard/ordens");
  redirect("/dashboard/ordens");
}
