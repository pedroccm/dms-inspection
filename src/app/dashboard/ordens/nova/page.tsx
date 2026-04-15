import { requireAdmin } from "@/lib/auth";
import { getInspectors, getInspectionLocations, getClients, getNextOrderNumber } from "@/lib/queries";
import { CreateOrderForm } from "./create-order-form";

export default async function NovaOrdemPage() {
  await requireAdmin();

  const [inspectors, locations, clients, nextOrderNumber] = await Promise.all([
    getInspectors(),
    getInspectionLocations(),
    getClients(),
    getNextOrderNumber(),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1B2B5E] mb-8">
        Nova Ordem de Serviço
      </h1>
      <CreateOrderForm
        inspectors={inspectors}
        locations={locations}
        clients={clients}
        nextOrderNumber={nextOrderNumber}
      />
    </div>
  );
}
