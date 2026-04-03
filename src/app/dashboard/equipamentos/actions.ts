"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

// Expanded equipment fields from QR Code
const EXPANDED_FIELDS = [
  "modelo",
  "numero_serie_controle",
  "numero_serie_tanque",
  "marca",
  "tipo",
  "tensao_nominal",
  "nbi",
  "frequencia_nominal",
  "corrente_nominal",
  "capacidade_interrupcao",
  "numero_fases",
  "tipo_controle",
  "modelo_controle",
  "sensor_tensao",
  "tc_interno",
  "sequencia_operacao",
  "meio_interrupcao",
  "massa_interruptor",
  "massa_caixa_controle",
  "massa_total",
  "norma_aplicavel",
  "qr_code_raw",
] as const;

export async function createEquipment(formData: FormData) {
  const user = await requireAuth();

  const copelRaCode = (formData.get("copel_ra_code") as string)?.trim();
  const copelControlCode = (formData.get("copel_control_code") as string)?.trim();
  const mechanismSerial = (formData.get("mechanism_serial") as string)?.trim();
  const controlBoxSerial = (formData.get("control_box_serial") as string)?.trim();
  const protectionRelaySerial = (formData.get("protection_relay_serial") as string)?.trim();
  const manufacturer = (formData.get("manufacturer") as string)?.trim();

  if (
    !copelRaCode ||
    !copelControlCode ||
    !mechanismSerial ||
    !controlBoxSerial ||
    !protectionRelaySerial ||
    !manufacturer
  ) {
    return { error: "Todos os campos obrigatórios devem ser preenchidos." };
  }

  const supabase = await createClient();

  // Check for duplicate copel_ra_code
  const { data: existing } = await supabase
    .from("equipment")
    .select("id")
    .eq("copel_ra_code", copelRaCode)
    .maybeSingle();

  if (existing) {
    return { error: `Equipamento ${copelRaCode} já cadastrado.` };
  }

  // Build insert payload with expanded fields
  const insertData: Record<string, string> = {
    copel_ra_code: copelRaCode,
    copel_control_code: copelControlCode,
    mechanism_serial: mechanismSerial,
    control_box_serial: controlBoxSerial,
    protection_relay_serial: protectionRelaySerial,
    manufacturer,
    created_by: user.id,
  };

  // Add expanded fields if provided
  for (const field of EXPANDED_FIELDS) {
    const value = (formData.get(field) as string)?.trim();
    if (value) {
      insertData[field] = value;
    }
  }

  const { error } = await supabase.from("equipment").insert(insertData);

  if (error) {
    return { error: `Erro ao cadastrar equipamento: ${error.message}` };
  }

  revalidatePath("/dashboard/equipamentos");
  redirect("/dashboard/equipamentos");
}
