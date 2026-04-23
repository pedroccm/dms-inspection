import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getEquipment, getDistinctManufacturers } from "@/lib/queries";
import { EquipmentSearch } from "./equipment-search";
import { EquipmentTable, type EquipmentRow } from "./equipment-table";
import { Pagination } from "@/components/ui/pagination";

interface EquipamentosPageProps {
  searchParams: Promise<{
    q?: string;
    manufacturer?: string;
    page?: string;
  }>;
}

export default async function EquipamentosPage({
  searchParams,
}: EquipamentosPageProps) {
  await requireAuth();

  const params = await searchParams;
  const q = params.q;
  const manufacturer = params.manufacturer;
  const page = Math.max(1, Number(params.page) || 1);
  const perPage = 20;

  const [{ data: equipment, count }, manufacturers] = await Promise.all([
    getEquipment({
      search: q || undefined,
      manufacturer: manufacturer || undefined,
      page,
      perPage,
    }),
    getDistinctManufacturers(),
  ]);

  const totalPages = Math.ceil(count / perPage);
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, count);

  // Build search params for pagination links (excluding "page")
  const paginationParams: Record<string, string> = {};
  if (q) paginationParams.q = q;
  if (manufacturer) paginationParams.manufacturer = manufacturer;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-[#1B2B5E]">Equipamentos</h1>
        <Link
          href="/dashboard/equipamentos/novo"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-[#F5A623] rounded-lg hover:bg-[#E8941E] transition-colors min-h-[44px]"
        >
          Novo Equipamento
        </Link>
      </div>

      <div className="mb-6">
        <EquipmentSearch
          defaultSearch={q}
          defaultManufacturer={manufacturer}
          manufacturers={manufacturers}
        />
      </div>

      {count > 0 && (
        <p className="text-sm text-gray-600 mb-4">
          Mostrando {from}-{to} de {count} equipamentos
        </p>
      )}

      <EquipmentTable
        rows={equipment.map((eq): EquipmentRow => ({
          id: eq.id,
          copelRaCode: eq.copel_ra_code,
          manufacturer: eq.manufacturer,
          mechanismSerial: eq.mechanism_serial,
          createdAt: eq.created_at,
        }))}
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/dashboard/equipamentos"
        searchParams={paginationParams}
      />
    </div>
  );
}
