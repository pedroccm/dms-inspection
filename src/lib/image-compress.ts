/**
 * Client-side image compression.
 *
 * Mobile cameras produce 4-12 MB photos that blow past Netlify's 6 MB request
 * body limit on synchronous functions — the request is rejected at the CDN
 * edge before reaching the Next.js route, and the client sees an HTML error
 * page instead of JSON ("Unexpected token '<'"). Compressing on the client
 * keeps every upload under ~2 MB and also converts HEIC/HEIF snapshots to
 * the JPEG bytes that Supabase Storage and the browser image tag can
 * render everywhere.
 */

const DEFAULT_MAX_DIMENSION = 2000; // px, long edge
const DEFAULT_QUALITY = 0.85;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB target

async function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao converter imagem."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  /** If the original file is smaller than this, it is returned untouched. */
  skipBelow?: number;
}

/**
 * Compress/resize an image file. Returns a new File with .jpg extension.
 * If the original is already small enough, returns it as-is.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const skipBelow = options.skipBelow ?? DEFAULT_MAX_BYTES;

  // Skip compression if file is already small enough AND is a common format
  const isAlreadyGood =
    file.size < skipBelow &&
    (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp");
  if (isAlreadyGood) return file;

  try {
    const img = await fileToImage(file);

    // Compute target dimensions keeping aspect ratio
    let { width, height } = img;
    if (width > maxDimension || height > maxDimension) {
      if (width >= height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context não disponível.");

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    // If compression fails (e.g. unsupported HEIC on some browsers), fall back
    // to the original file so the user still gets the error they expect rather
    // than a silent failure.
    return file;
  }
}
