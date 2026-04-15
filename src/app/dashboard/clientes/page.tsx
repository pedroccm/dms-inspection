import { requireAdmin } from "@/lib/auth";
import { getClients } from "@/lib/queries";
import { ClientForm } from "./client-form";
import { DeleteClientButton } from "./delete-client-button";

export default async function ClientesPage() {
  await requireAdmin();

  const clients = await getClients();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1B2B5E] mb-8">Clientes</h1>

      <ClientForm />

      <div className="bg-white rounded-lg shadow overflow-hidden mt-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-[#1B2B5E]">
                <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                  Nome
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                  Criado em
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Nenhum cliente cadastrado.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(client.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4">
                      <DeleteClientButton clientId={client.id} />
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
