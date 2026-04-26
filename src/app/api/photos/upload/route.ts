import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PHOTO_TYPES } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const inspectionId = formData.get("inspectionId") as string;
  const rawPhotoType = formData.get("photoType") as string;
  const label = formData.get("label") as string | null;

  if (!file || !inspectionId || !rawPhotoType) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  // Resolve the photo slot key. When callers send "auto" (e.g. the extra-photo
  // button under Observations), or a timestamp-based photo_<bigNumber>, assign
  // the next sequential photo_N so the storage key matches the numbering shown
  // in the main photo grid ("Foto 7", "Foto 8", ...).
  let photoType = rawPhotoType;
  const isAuto = rawPhotoType === "auto";
  const timestampMatch = rawPhotoType.match(/^photo_(\d+)$/);
  const looksLikeTimestamp =
    timestampMatch !== null && Number(timestampMatch[1]) > 1000;
  if (isAuto || looksLikeTimestamp) {
    const { data: existing } = await supabase
      .from("photos")
      .select("photo_type")
      .eq("inspection_id", inspectionId);

    let maxNum = DEFAULT_PHOTO_TYPES.length; // dynamic slots start after the defaults
    for (const row of existing ?? []) {
      const m = (row.photo_type as string).match(/^photo_(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        // Ignore timestamp-based keys (legacy / concurrent uploads) when
        // picking the next slot number.
        if (n > 0 && n <= 1000) {
          maxNum = Math.max(maxNum, n);
        }
      }
    }
    photoType = `photo_${maxNum + 1}`;
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
