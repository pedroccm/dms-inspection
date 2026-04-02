import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInspectionAuditLogs } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { inspectionId } = await params;

  try {
    const entries = await getInspectionAuditLogs(inspectionId);
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return NextResponse.json(
      { error: "Erro ao buscar historico." },
      { status: 500 }
    );
  }
}
