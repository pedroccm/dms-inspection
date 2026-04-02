"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

export async function createUser(formData: FormData) {
  await requireAdmin();

  const fullName = formData.get("full_name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as UserRole;

  if (!fullName || !email || !password || !role) {
    return { error: "Todos os campos são obrigatórios." };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter no mínimo 6 caracteres." };
  }

  const supabase = createAdminClient();

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return { error: "Este e-mail já está cadastrado." };
    }
    return { error: `Erro ao criar usuário: ${authError.message}` };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    full_name: fullName,
    role,
    active: true,
  });

  if (profileError) {
    // Rollback: delete the auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { error: `Erro ao criar perfil: ${profileError.message}` };
  }

  revalidatePath("/dashboard/usuarios");
  redirect("/dashboard/usuarios");
}

export async function updateUser(id: string, formData: FormData) {
  await requireAdmin();

  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as UserRole;

  if (!fullName || !role) {
    return { error: "Nome e função são obrigatórios." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: `Erro ao atualizar usuário: ${error.message}` };
  }

  revalidatePath("/dashboard/usuarios");
  redirect("/dashboard/usuarios");
}

export async function toggleUserActive(id: string) {
  await requireAdmin();

  const supabase = createAdminClient();

  // Get current status
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("active")
    .eq("id", id)
    .single();

  if (fetchError || !profile) {
    return { error: "Usuário não encontrado." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      active: !profile.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: `Erro ao alterar status: ${error.message}` };
  }

  revalidatePath("/dashboard/usuarios");
}
