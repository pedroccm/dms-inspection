import { requireAuth } from "@/lib/auth";
import { getAllEquipment, getServiceOrders } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { NewInspectionForm } from "./new-inspection-form";

interface NovaInspecaoPageProps {
  searchParams: Promise<{ equipment_id?: string }>;
}

export default async function NovaInspecaoPage({
  searchParams,
}: NovaInspecaoPageProps) {
  await requireAuth();

  const params = await searchParams;
  const preselectedEquipmentId = params.equipment_id;

  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";

  const [equipment, serviceOrders] = await Promise.all([
    getAllEquipment(),
    getServiceOrders(
      isAdmin ? undefined : { assigned_to: profile?.id }
    ),
  ]);

  const equipmentOptions = equipment.map((eq) => ({
    value: eq.id,
    label: `${eq.copel_ra_code} — ${eq.manufacturer}`,
  }));

  const serviceOrderOptions = serviceOrders.map((so) => ({
    value: so.id,
    label: so.title,
  }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1B2B5E] mb-8">Nova Inspeção</h1>
      <NewInspectionForm
        equipmentOptions={equipmentOptions}
        serviceOrderOptions={serviceOrderOptions}
        preselectedEquipmentId={preselectedEquipmentId}
      />
    </div>
  );
}
