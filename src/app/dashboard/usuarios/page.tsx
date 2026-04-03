import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";
import { ToggleActiveButton } from "./toggle-active-button";

export default async function UsuariosPage() {
  await requireAdmin();

  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch emails from auth.users via admin API
  const { data: authData } = await supabase.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (authData?.users) {
    for (const user of authData.users) {
      emailMap.set(user.id, user.email ?? "");
    }
  }

  const users = (profiles as Profile[]) ?? [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-[#1B2B5E]">
          Gerenciamento de Usuários
        </h1>
        <Link
          href="/dashboard/usuarios/novo"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-[#F5A623] rounded-lg hover:bg-[#E8941E] transition-colors min-h-[44px]"
        >
          Novo Usuário
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-[#1B2B5E]">
                <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                  Nome
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                  E-mail
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                  Função
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {user.full_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {emailMap.get(user.id) ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {user.role === "admin" ? "Master" : "Executor"}
                    </td>
                    <td className="px-6 py-4">
                      {user.active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/usuarios/${user.id}/editar`}
                          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#F5A623] bg-[#FFF4E0] rounded-lg hover:bg-[#FFE8C0] transition-colors min-h-[44px]"
                        >
                          Editar
                        </Link>
                        <ToggleActiveButton
                          userId={user.id}
                          active={user.active}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
