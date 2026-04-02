import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getEquipmentById } from "@/lib/queries";

interface EquipamentoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EquipamentoDetailPage({
  params,
}: EquipamentoDetailPageProps) {
  await requireAuth();

  const { id } = await params;

  let equipment;
  try {
    equipment = await getEquipmentById(id);
  } catch {
    notFound();
  }

  if (!equipment) {
    notFound();
  }

  const inspections = equipment.inspections ?? [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Equipamento: {equipment.copel_ra_code}
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/inspecoes/nova?equipment_id=${equipment.id}`}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors min-h-[44px]"
          >
            Nova Inspeção
          </Link>
          <Link
            href="/dashboard/equipamentos"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            Voltar
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Dados do Equipamento
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Código Copel do RA (Mecanismo)
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.copel_ra_code}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Código Copel do Controle
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.copel_control_code}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Número de Série do Mecanismo
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.mechanism_serial}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Número de Série da Caixa de Controle
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.control_box_serial}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Número de Série do Relé de Proteção
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.protection_relay_serial}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Fabricante do Religador
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.manufacturer}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Data de Cadastro
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(equipment.created_at).toLocaleDateString("pt-BR")}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Histórico de Inspeções
          </h2>
        </div>
        {inspections.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma inspeção realizada neste equipamento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                    Data
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                    Inspetor
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((inspection) => (
                  <tr
                    key={inspection.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(inspection.created_at).toLocaleDateString(
                        "pt-BR"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {inspection.inspector?.full_name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {inspection.status}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/inspecoes/${inspection.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
