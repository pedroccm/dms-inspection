import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";
import { EditUserForm } from "./edit-user-form";

interface EditarUsuarioPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarUsuarioPage({
  params,
}: EditarUsuarioPageProps) {
  await requireAdmin();

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) {
    notFound();
  }

  // Get email from auth
  const { data: authData } = await supabase.auth.admin.getUserById(id);
  const email = authData?.user?.email ?? "";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1B2B5E] mb-8">Editar Usuário</h1>
      <EditUserForm profile={profile as Profile} email={email} />
    </div>
  );
}
