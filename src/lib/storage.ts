import { createClient } from "@/lib/supabase/client";
import type { Photo } from "@/lib/types";

const BUCKET = "inspection-photos";

/**
 * Upload a photo to Supabase Storage and insert a record in the photos table.
 * Accepts any photo_type string (fixed or dynamic) and an optional custom label.
 */
export async function uploadInspectionPhoto(
  inspectionId: string,
  photoType: string,
  file: File,
  onProgress?: (percent: number) => void,
  label?: string | null
): Promise<Photo> {
  const supabase = createClient();

  const ext = file.name.split(".").pop() ?? "jpg";
  const timestamp = Date.now();
  const storagePath = `inspections/${inspectionId}/${photoType}_${timestamp}.${ext}`;

  // Signal start
  onProgress?.(10);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Erro ao enviar foto: ${uploadError.message}`);
  }

  onProgress?.(70);

  // Insert record in photos table
  const { data, error: insertError } = await supabase
    .from("photos")
    .insert({
      inspection_id: inspectionId,
      photo_type: photoType,
      storage_path: storagePath,
      file_size: file.size,
      label: label ?? null,
    })
    .select()
    .single();

  if (insertError) {
    // Rollback: delete uploaded file
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`Erro ao salvar registro: ${insertError.message}`);
  }

  onProgress?.(100);

  return data as Photo;
}

/**
 * Delete a photo from Supabase Storage and remove the record from the photos table.
 */
export async function deleteInspectionPhoto(
  photoId: string,
  storagePath: string
): Promise<void> {
  const supabase = createClient();

  const { error: deleteError } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId);

  if (deleteError) {
    throw new Error(`Erro ao remover registro: ${deleteError.message}`);
  }

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (storageError) {
    console.error("Erro ao remover arquivo do storage:", storageError.message);
  }
}

/**
 * Generate a signed URL for a photo in the private bucket.
 */
export async function getPhotoUrl(storagePath: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 300); // 5 min expiry

  if (error) {
    throw new Error(`Erro ao gerar URL: ${error.message}`);
  }

  return data.signedUrl;
}
