import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { photoId, storagePath } = await request.json();

  if (!photoId || !storagePath) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  // Delete from DB
  const { error: dbError } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Delete from storage
  await supabase.storage.from("inspection-photos").remove([storagePath]);

  return NextResponse.json({ success: true });
}
