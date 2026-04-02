import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getInspectors } from "@/lib/queries";
import { getProductivityReport } from "@/lib/reports";
import { ReportFilters } from "./report-filters";
import { ExportCsv } from "./export-csv";

interface ProdutividadePageProps {
  searchParams: Promise<{
    inicio?: string;
    fim?: string;
    inspetor?: string;
  }>;
}

function getDefaultDates() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export default async function ProdutividadePage({
  searchParams,
}: ProdutividadePageProps) {
  await requireAdmin();

  const params = await searchParams;
  const defaults = getDefaultDates();

  const startDate = params.inicio ?? defaults.startDate;
  const endDate = params.fim ?? defaults.endDate;
  const inspectorId = params.inspetor;

  const [report, inspectors] = await Promise.all([
    getProductivityReport(startDate, endDate, inspectorId),
    getInspectors(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/dashboard/relatorios"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            ← Relatorios
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Relatorio de Produtividade
          </h1>
        </div>
        <ExportCsv rows={report.rows} />
      </div>

      <ReportFilters
        inspectors={inspectors.map((i) => ({
          id: i.id,
          full_name: i.full_name,
        }))}
        defaultStartDate={startDate}
        defaultEndDate={endDate}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                  Nome do Inspetor
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">
                  Total de Inspecoes
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900 hidden sm:table-cell">
                  Itens Aprovados
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900 hidden sm:table-cell">
                  Itens Reprovados
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900 hidden md:table-cell">
                  Itens NA
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">
                  Taxa de Aprovacao (%)
                </th>
              </tr>
            </thead>
            <tbody>
              {report.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Nenhuma inspecao encontrada no periodo selecionado.
                  </td>
                </tr>
              ) : (
                <>
                  {report.rows.map((row) => (
                    <tr
                      key={row.inspector_id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {row.inspector_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        {row.total_inspections}
                      </td>
                      <td className="px-6 py-4 text-sm text-green-600 text-right hidden sm:table-cell">
                        {row.approved_count}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600 text-right hidden sm:table-cell">
                        {row.rejected_count}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 text-right hidden md:table-cell">
                        {row.na_count}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        {row.approval_rate}%
                      </td>
                    </tr>
                  ))}

                  {/* Summary row */}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {report.totals.total_inspections}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-700 text-right hidden sm:table-cell">
                      {report.totals.approved_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-700 text-right hidden sm:table-cell">
                      {report.totals.rejected_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right hidden md:table-cell">
                      {report.totals.na_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {report.totals.approval_rate}%
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
