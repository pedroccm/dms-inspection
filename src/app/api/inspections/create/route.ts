import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const { equipmentId, serviceOrderId } = body;

  if (!equipmentId) {
    return NextResponse.json({ error: "Equipamento não informado." }, { status: 400 });
  }

  // Check if there's already an active inspection for this equipment
  const { data: existing } = await supabase
    .from("inspections")
    .select("id")
    .eq("equipment_id", equipmentId)
    .not("status", "in", '("equipamento_reprovado","transferred")')
    .maybeSingle();

  if (existing) {
    // Already has an inspection — redirect to it
    return NextResponse.json({ inspectionId: existing.id });
  }

  // Create new inspection
  const { data: inspection, error } = await supabase
    .from("inspections")
    .insert({
      equipment_id: equipmentId,
      service_order_id: serviceOrderId,
      inspector_id: user.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Erro ao criar inspeção: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ inspectionId: inspection.id });
}
