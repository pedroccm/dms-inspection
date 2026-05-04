"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/image-compress";

interface ExtraPhotoButtonProps {
  inspectionId: string;
}

type UploadStatus = "uploading" | "success" | "error";

interface UploadEntry {
  id: string;
  fileName: string;
  localUrl: string;
  status: UploadStatus;
  errorMsg?: string;
  photoId?: string;
  storagePath?: string;
}

/**
 * Shortcut button under the Observations block. Lets the inspector capture
 * an extra photo right where they're writing notes, without scrolling up to
 * the photo section. Shows an inline thumbnail preview (instant, from the
 * local file) with upload status, click-to-view full size, and a remove
 * button. Dispatches a "photo:added" event so the main photo grid can pick
 * up the new photo, scroll to it and flash a highlight.
 */
export function ExtraPhotoButton({ inspectionId }: ExtraPhotoButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Revoke object URLs on unmount to avoid leaks
  useEffect(() => {
    return () => {
      uploads.forEach((u) => URL.revokeObjectURL(u.localUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateEntry(id: string, patch: Partial<UploadEntry>) {
    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;

    const id = crypto.randomUUID();
    const localUrl = URL.createObjectURL(file);

    setUploads((prev) => [
      ...prev,
      { id, fileName: file.name, localUrl, status: "uploading" },
    ]);

    try {
      const compressed = await compressImage(file);

      if (compressed.size > 10 * 1024 * 1024) {
        updateEntry(id, {
          status: "error",
          errorMsg: `Imagem muito grande (${(compressed.size / 1024 / 1024).toFixed(1)}MB).`,
        });
        return;
      }

      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("inspectionId", inspectionId);
      // "auto" tells the server to assign the next sequential photo_N, so
      // photos added here share the same numbering as the main photo grid.
      formData.append("photoType", "auto");

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = `Falha no upload (HTTP ${res.status}).`;
        try {
          const data = JSON.parse(text);
          if (data?.error) msg = data.error;
        } catch {
          if (res.status === 413) msg = "Imagem muito grande para o servidor.";
        }
        throw new Error(msg);
      }

      const result = await res.json();
      if (result.error) {
        throw new Error(result.error);
      }

      updateEntry(id, {
        status: "success",
        photoId: result.photo?.id,
        storagePath: result.photo?.storage_path,
      });

      // Notify the main photo grid so it adds the slot, scrolls to it, and
      // flashes a highlight. Avoids a router.refresh round-trip.
      window.dispatchEvent(
        new CustomEvent("photo:added", {
          detail: {
            inspectionId,
            photo: result.photo,
            signedUrl: result.signedUrl,
          },
        })
      );
    } catch (err) {
      updateEntry(id, {
        status: "error",
        errorMsg: err instanceof Error ? err.message : "Erro ao enviar foto.",
      });
    }
  }

  async function handleRemoveEntry(entry: UploadEntry) {
    // If still uploading, just drop the local entry (the network request will
    // finish in the background — there's no easy way to abort mid-flight here).
    if (entry.status === "success" && entry.photoId && entry.storagePath) {
      try {
        await fetch("/api/photos/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photoId: entry.photoId,
            storagePath: entry.storagePath,
          }),
        });
        window.dispatchEvent(
          new CustomEvent("photo:removed", {
            detail: { inspectionId, photoId: entry.photoId },
          })
        );
      } catch {
        // Best effort — still remove from UI
      }
    }
    URL.revokeObjectURL(entry.localUrl);
    setUploads((prev) => prev.filter((u) => u.id !== entry.id));
  }

  const uploading = uploads.some((u) => u.status === "uploading");

  return (
    <div className="mt-3 flex flex-col gap-3">
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

      {uploads.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {uploads.map((u) => (
            <div
              key={u.id}
              className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group"
            >
              <img
                src={u.localUrl}
                alt={u.fileName}
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setPreviewUrl(u.localUrl)}
              />

              {u.status === "uploading" && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                  <svg
                    className="animate-spin h-6 w-6 mb-1"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <span className="text-[10px] font-medium">Enviando...</span>
                </div>
              )}

              {u.status === "success" && (
                <div className="absolute top-1 left-1 bg-green-600 text-white rounded-full p-0.5 shadow">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              {u.status === "error" && (
                <div
                  className="absolute inset-0 bg-red-600/80 flex items-center justify-center text-white text-[10px] text-center px-2"
                  title={u.errorMsg ?? "Erro"}
                >
                  {u.errorMsg ?? "Erro"}
                </div>
              )}

              <button
                type="button"
                onClick={() => handleRemoveEntry(u)}
                aria-label="Remover"
                title="Remover"
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPreviewUrl(null)}
        >
          <img
            src={previewUrl}
            alt="Pré-visualização"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
