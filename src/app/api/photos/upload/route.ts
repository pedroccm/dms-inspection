import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const inspectionId = formData.get("inspectionId") as string;
  const photoType = formData.get("photoType") as string;
  const label = formData.get("label") as string | null;

  if (!file || !inspectionId || !photoType) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const timestamp = Date.now();
  const storagePath = `inspections/${inspectionId}/${photoType}_${timestamp}.${ext}`;

  // Upload to storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("inspection-photos")
    .upload(storagePath, buffer, {
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Erro no upload: ${uploadError.message}` }, { status: 500 });
  }

  // Insert DB record
  const { data, error: insertError } = await supabase
    .from("photos")
    .insert({
      inspection_id: inspectionId,
      photo_type: photoType,
      storage_path: storagePath,
      file_size: file.size,
      label: label || null,
    })
    .select()
    .single();

  if (insertError) {
    // Rollback storage
    await supabase.storage.from("inspection-photos").remove([storagePath]);
    return NextResponse.json({ error: `Erro ao salvar: ${insertError.message}` }, { status: 500 });
  }

  // Generate signed URL
  const { data: signedData } = await supabase.storage
    .from("inspection-photos")
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json({
    photo: data,
    signedUrl: signedData?.signedUrl ?? null,
  });
}
