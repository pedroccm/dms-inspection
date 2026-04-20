"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ExtraPhotoButtonProps {
  inspectionId: string;
}

/**
 * Shortcut button under the Observations block. Lets the inspector capture
 * an extra photo right where they're writing notes, without scrolling up to
 * the photo section. Uploads with a unique dynamic key so the photo appears
 * in the main photo grid after the page refresh.
 */
export function ExtraPhotoButton({ inspectionId }: ExtraPhotoButtonProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      if (file.size > 10 * 1024 * 1024) {
        setError(`Imagem muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB, máx 10MB).`);
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("inspectionId", inspectionId);
      formData.append("photoType", `photo_${Date.now()}`);
      formData.append("label", "Foto Adicional");

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error ?? "Erro no upload.");
      }

      setLastUpload(file.name);
      setTimeout(() => setLastUpload(null), 4000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar foto.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 self-start px-4 py-2 text-sm font-medium text-[#F5A623] bg-[#FFF4E0] border border-[#F5A623] rounded-lg hover:bg-[#FFE8C0] transition-colors min-h-[40px] disabled:opacity-60"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
          />
        </svg>
        {uploading ? "Enviando..." : "Adicionar foto à observação"}
      </button>
      {lastUpload && (
        <span className="text-xs text-green-600">
          Foto enviada: {lastUpload}
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
