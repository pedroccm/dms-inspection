"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function createClientAction(formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();

  if (!name) {
    return { error: "Nome do cliente é obrigatório." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("clients").insert({ name });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um cliente com este nome." };
    }
    return { error: `Erro ao criar cliente: ${error.message}` };
  }

  revalidatePath("/dashboard/clientes");
  return { success: true };
}

export async function deleteClientAction(clientId: string) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase.from("clients").delete().eq("id", clientId);

  if (error) {
    return { error: `Erro ao excluir cliente: ${error.message}` };
  }

  revalidatePath("/dashboard/clientes");
  return { success: true };
}
