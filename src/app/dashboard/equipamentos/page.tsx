import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getEquipment } from "@/lib/queries";
import { EquipmentSearch } from "./equipment-search";

interface EquipamentosPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function EquipamentosPage({
  searchParams,
}: EquipamentosPageProps) {
  await requireAuth();

  const { q } = await searchParams;
  const equipment = await getEquipment(q ? { search: q } : undefined);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Equipamentos</h1>
        <Link
          href="/dashboard/equipamentos/novo"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
        >
          Novo Equipamento
        </Link>
      </div>

      <div className="mb-6">
        <EquipmentSearch defaultValue={q} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                  Código Copel RA
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                  Fabricante
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 hidden sm:table-cell">
                  Nº Série Mecanismo
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 hidden md:table-cell">
                  Data Cadastro
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {equipment.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Nenhum equipamento cadastrado.
                  </td>
                </tr>
              ) : (
                equipment.map((eq) => (
                  <tr
                    key={eq.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {eq.copel_ra_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {eq.manufacturer}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                      {eq.mechanism_serial}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                      {new Date(eq.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/equipamentos/${eq.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors min-h-[44px]"
                      >
                        Detalhes
                      </Link>
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
