"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

interface EquipmentImportRow {
  copel_ra_code: string;
  copel_control_code?: string;
  mechanism_serial?: string;
  control_box_serial?: string;
  protection_relay_serial?: string;
  manufacturer?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importEquipmentToOrder(
  orderId: string,
  equipmentList: EquipmentImportRow[]
): Promise<ImportResult> {
  const user = await requireAdmin();
  const supabase = await createClient();

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  for (const row of equipmentList) {
    const copelRaCode = row.copel_ra_code?.trim();
    if (!copelRaCode) {
      result.errors.push("Linha ignorada: copel_ra_code vazio.");
      continue;
    }

    try {
      // Check if equipment with this copel_ra_code already exists
      const { data: existing } = await supabase
        .from("equipment")
        .select("id")
        .eq("copel_ra_code", copelRaCode)
        .maybeSingle();

      let equipmentId: string;

      if (existing) {
        equipmentId = existing.id;
      } else {
        // Create the equipment record
        const { data: created, error: createError } = await supabase
          .from("equipment")
          .insert({
            copel_ra_code: copelRaCode,
            copel_control_code: row.copel_control_code?.trim() || "",
            mechanism_serial: row.mechanism_serial?.trim() || "",
            control_box_serial: row.control_box_serial?.trim() || "",
            protection_relay_serial: row.protection_relay_serial?.trim() || "",
            manufacturer: row.manufacturer?.trim() || "",
            created_by: user.id,
          })
          .select("id")
          .single();

        if (createError || !created) {
          result.errors.push(
            `Erro ao criar equipamento ${copelRaCode}: ${createError?.message ?? "Erro desconhecido"}`
          );
          continue;
        }
        equipmentId = created.id;
      }

      // Check if already linked to this order
      const { data: linked } = await supabase
        .from("service_order_equipment")
        .select("id")
        .eq("service_order_id", orderId)
        .eq("equipment_id", equipmentId)
        .maybeSingle();

      if (linked) {
        result.skipped++;
        continue;
      }

      // Link to order
      const { error: linkError } = await supabase
        .from("service_order_equipment")
        .insert({
          service_order_id: orderId,
          equipment_id: equipmentId,
        });

      if (linkError) {
        result.errors.push(
          `Erro ao vincular equipamento ${copelRaCode}: ${linkError.message}`
        );
        continue;
      }

      result.imported++;
    } catch (err) {
      result.errors.push(
        `Erro inesperado ao processar ${copelRaCode}: ${err instanceof Error ? err.message : "Erro desconhecido"}`
      );
    }
  }

  revalidatePath(`/dashboard/ordens/${orderId}`);
  return result;
}
