import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { photoId, label } = await request.json();

  if (!photoId) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const trimmed = typeof label === "string" ? label.trim() : null;

  const { data, error } = await supabase
    .from("photos")
    .update({ label: trimmed ? trimmed : null })
    .eq("id", photoId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ photo: data });
}
