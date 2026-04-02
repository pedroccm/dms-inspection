import { requireAuth } from "@/lib/auth";
import { CreateEquipmentForm } from "./create-equipment-form";

export default async function NovoEquipamentoPage() {
  await requireAuth();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1B2B5E] mb-8">
        Novo Equipamento
      </h1>
      <CreateEquipmentForm />
    </div>
  );
}
