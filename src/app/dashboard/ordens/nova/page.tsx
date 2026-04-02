import { requireAdmin } from "@/lib/auth";
import { getInspectors } from "@/lib/queries";
import { CreateOrderForm } from "./create-order-form";

export default async function NovaOrdemPage() {
  await requireAdmin();

  const inspectors = await getInspectors();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Nova Ordem de Servico
      </h1>
      <CreateOrderForm inspectors={inspectors} />
    </div>
  );
}
