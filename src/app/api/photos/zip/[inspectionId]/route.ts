import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getInspectionById } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { buildZip, uniqueZipName, type ZipEntry } from "@/lib/zip";
import { getPhotoDownloadName, DEFAULT_PHOTO_TYPES } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { inspectionId } = await params;

  let inspection;
  try {
    inspection = await getInspectionById(inspectionId);
  } catch {
    return NextResponse.json(
      { error: "Inspeção não encontrada" },
      { status: 404 }
    );
  }
  if (!inspection) {
    return NextResponse.json(
      { error: "Inspeção não encontrada" },
      { status: 404 }
    );
  }

  const photos = inspection.photos ?? [];
  if (photos.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma foto disponível para download." },
      { status: 404 }
    );
  }

  const numero052r =
    inspection.equipment?.numero_052r ?? inspection.numero_052r ?? null;
  const numero300 =
    inspection.equipment?.numero_300 ?? inspection.numero_300 ?? null;

  const supabase = await createClient();
  const entries: ZipEntry[] = [];
  const usedNames = new Set<string>();

  // Sort photos so default slots come first in the order defined, then
  // dynamic photos by their photo_type (photo_7, photo_8, ...).
  const orderIndex = (t: string): number => {
    const idx = DEFAULT_PHOTO_TYPES.indexOf(t);
    if (idx >= 0) return idx;
    const m = t.match(/^photo_(\d+)$/);
    if (m) return 1000 + parseInt(m[1], 10);
    return 9999;
  };
  const orderedPhotos = [...photos].sort(
    (a, b) => orderIndex(a.photo_type) - orderIndex(b.photo_type)
  );

  for (const photo of orderedPhotos) {
    try {
      const { data: blob, error } = await supabase.storage
        .from("inspection-photos")
        .download(photo.storage_path);

      if (error || !blob) continue;

      const arrayBuffer = await blob.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      const filename = getPhotoDownloadName(
        photo.photo_type,
        photo.label,
        photo.storage_path,
        numero052r,
        numero300
      );

      entries.push({
        name: uniqueZipName(filename, usedNames),
        data,
      });
    } catch {
      // Skip files that fail to download
    }
  }

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "Falha ao baixar fotos do armazenamento." },
      { status: 500 }
    );
  }

  const zip = buildZip(entries);

  const equipment = inspection.equipment;
  const refParts: string[] = ["fotos"];
  const clean052r = (numero052r ?? "").trim().replace(/^052R[-\s]?/i, "").trim();
  const clean300 = (numero300 ?? "").trim().replace(/^300[-\s]?/i, "").trim();
  if (clean052r) refParts.push(`052R-${clean052r}`);
  if (clean300) refParts.push(`300-${clean300}`);
  if (refParts.length === 1 && equipment?.copel_ra_code) {
    refParts.push(equipment.copel_ra_code);
  }
  const zipFilename = `${refParts.join("_")}.zip`;

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
      "Content-Length": String(zip.length),
    },
  });
}
