"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function createContractAction(formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();

  if (!name) {
    return { error: "Nome do contrato é obrigatório." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("contracts").insert({ name });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um contrato com este nome." };
    }
    return { error: `Erro ao criar contrato: ${error.message}` };
  }

  revalidatePath("/dashboard/contratos");
  return { success: true };
}

export async function deleteContractAction(contractId: string) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase.from("contracts").delete().eq("id", contractId);

  if (error) {
    return { error: `Erro ao excluir contrato: ${error.message}` };
  }

  revalidatePath("/dashboard/contratos");
  return { success: true };
}
