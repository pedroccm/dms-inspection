"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

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
    return { error: "Todos os campos são obrigatórios." };
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

  const { error } = await supabase.from("equipment").insert({
    copel_ra_code: copelRaCode,
    copel_control_code: copelControlCode,
    mechanism_serial: mechanismSerial,
    control_box_serial: controlBoxSerial,
    protection_relay_serial: protectionRelaySerial,
    manufacturer,
    created_by: user.id,
  });

  if (error) {
    return { error: `Erro ao cadastrar equipamento: ${error.message}` };
  }

  revalidatePath("/dashboard/equipamentos");
  redirect("/dashboard/equipamentos");
}
