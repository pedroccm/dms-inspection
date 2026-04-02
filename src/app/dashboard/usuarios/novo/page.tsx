import { requireAdmin } from "@/lib/auth";
import { CreateUserForm } from "./create-user-form";

export default async function NovoUsuarioPage() {
  await requireAdmin();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1B2B5E] mb-8">Novo Usuário</h1>
      <CreateUserForm />
    </div>
  );
}
