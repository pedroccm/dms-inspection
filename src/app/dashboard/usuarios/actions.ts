"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import {
  isAllowedEmailDomain,
  ALLOWED_EMAIL_DOMAINS_ERROR,
} from "@/lib/email-domains";
import type { UserRole, UserImpact } from "@/lib/types";

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

  if (!isAllowedEmailDomain(email)) {
    return { error: ALLOWED_EMAIL_DOMAINS_ERROR };
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

export async function getUserImpact(userId: string): Promise<UserImpact> {
  await requireAdmin();

  const supabase = createAdminClient();

  const [serviceOrders, inspections, equipment, teamMemberships] =
    await Promise.all([
      supabase
        .from("service_orders")
        .select("id", { count: "exact", head: true })
        .or(
          `assigned_to.eq.${userId},created_by.eq.${userId},billed_by.eq.${userId}`,
        ),
      supabase
        .from("inspections")
        .select("id", { count: "exact", head: true })
        .or(
          `inspector_id.eq.${userId},reviewed_by.eq.${userId},claimed_by.eq.${userId}`,
        ),
      supabase
        .from("equipment")
        .select("id", { count: "exact", head: true })
        .or(`created_by.eq.${userId},registered_by.eq.${userId}`),
      supabase
        .from("team_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

  return {
    serviceOrders: serviceOrders.count ?? 0,
    inspections: inspections.count ?? 0,
    equipment: equipment.count ?? 0,
    teamMemberships: teamMemberships.count ?? 0,
  };
}

export async function deleteUser(userId: string, transferToId: string) {
  const currentUser = await requireAdmin();

  if (userId === currentUser.id) {
    return { error: "Você não pode excluir a si mesmo." };
  }

  if (!transferToId) {
    return { error: "Selecione um usuário para transferir o trabalho." };
  }

  if (userId === transferToId) {
    return { error: "Não é possível transferir para o próprio usuário a ser excluído." };
  }

  const supabase = createAdminClient();

  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, role, active")
    .in("id", [userId, transferToId]);

  if (usersError || !users || users.length !== 2) {
    return { error: "Usuário de origem ou destino não encontrado." };
  }

  const source = users.find((u) => u.id === userId);
  const target = users.find((u) => u.id === transferToId);

  if (!source || !target) {
    return { error: "Usuário inválido." };
  }

  if (source.role !== target.role) {
    return { error: "O usuário de destino deve ter o mesmo papel." };
  }

  if (!target.active) {
    return { error: "O usuário de destino deve estar ativo." };
  }

  const transfers: Array<{
    table: "service_orders" | "inspections" | "equipment";
    column: string;
    label: string;
  }> = [
    { table: "service_orders", column: "assigned_to", label: "OS (atribuídas)" },
    { table: "service_orders", column: "created_by", label: "OS (criadas)" },
    { table: "service_orders", column: "billed_by", label: "OS (faturadas)" },
    { table: "inspections", column: "inspector_id", label: "inspeções (executor)" },
    { table: "inspections", column: "reviewed_by", label: "inspeções (revisor)" },
    { table: "inspections", column: "claimed_by", label: "inspeções (assumidas)" },
    { table: "equipment", column: "created_by", label: "equipamentos (criados)" },
    { table: "equipment", column: "registered_by", label: "equipamentos (cadastrados)" },
  ];

  for (const { table, column, label } of transfers) {
    const { error } = await supabase
      .from(table)
      .update({ [column]: transferToId })
      .eq(column, userId);
    if (error) {
      return { error: `Erro ao transferir ${label}: ${error.message}` };
    }
  }

  // Remove team memberships instead of transferring (avoids duplicates
  // when the target is already a member of the same team).
  const { error: teamError } = await supabase
    .from("team_members")
    .delete()
    .eq("user_id", userId);
  if (teamError) {
    return { error: `Erro ao remover participações em equipes: ${teamError.message}` };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);
  if (profileError) {
    return { error: `Erro ao excluir perfil: ${profileError.message}` };
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) {
    return { error: `Erro ao excluir usuário de autenticação: ${authError.message}` };
  }

  revalidatePath("/dashboard/usuarios");
  return { success: true };
}
