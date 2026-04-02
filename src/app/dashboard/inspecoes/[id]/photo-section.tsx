"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Photo, PhotoType } from "@/lib/types";
import { PHOTO_TYPE_LABELS } from "@/lib/types";
import {
  uploadInspectionPhoto,
  deleteInspectionPhoto,
  getPhotoUrl,
} from "@/lib/storage";

// ─── Types ─────────────────────────────────────────────────

interface PhotoSectionProps {
  inspectionId: string;
  existingPhotos: Photo[];
  isEditable: boolean;
}

interface SlotState {
  uploading: boolean;
  progress: number;
  error: string | null;
}

interface GalleryState {
  open: boolean;
  currentIndex: number;
}

const PHOTO_TYPES: PhotoType[] = [
  "mechanism_front",
  "mechanism_back",
  "control_front_closed",
  "control_mirror_closed",
  "relay_front",
  "control_internal",
];

// ─── Component ─────────────────────────────────────────────

export function PhotoSection({
  inspectionId,
  existingPhotos,
  isEditable,
}: PhotoSectionProps) {
  const [photos, setPhotos] = useState<Record<string, Photo>>(() => {
    const map: Record<string, Photo> = {};
    for (const photo of existingPhotos) {
      map[photo.photo_type] = photo;
    }
    return map;
  });

  const [slotStates, setSlotStates] = useState<Record<string, SlotState>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const capturedCount = Object.keys(photos).length;

  // Gallery state (US-403)
  const [gallery, setGallery] = useState<GalleryState>({
    open: false,
    currentIndex: 0,
  });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Build ordered list of photos that exist (for gallery navigation)
  const availablePhotos = PHOTO_TYPES.filter((t) => photos[t] && signedUrls[t]);

  const openGallery = useCallback(
    (photoType: PhotoType) => {
      const index = availablePhotos.indexOf(photoType);
      if (index >= 0) {
        setGallery({ open: true, currentIndex: index });
      }
    },
    [availablePhotos]
  );

  const closeGallery = useCallback(() => {
    setGallery({ open: false, currentIndex: 0 });
  }, []);

  const navigateGallery = useCallback(
    (direction: "prev" | "next") => {
      setGallery((prev) => {
        const total = availablePhotos.length;
        if (total === 0) return prev;
        const newIndex =
          direction === "next"
            ? (prev.currentIndex + 1) % total
            : (prev.currentIndex - 1 + total) % total;
        return { ...prev, currentIndex: newIndex };
      });
    },
    [availablePhotos.length]
  );

  // Gallery keyboard navigation
  useEffect(() => {
    if (!gallery.open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeGallery();
      if (e.key === "ArrowLeft") navigateGallery("prev");
      if (e.key === "ArrowRight") navigateGallery("next");
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [gallery.open, closeGallery, navigateGallery]);

  // Touch swipe handlers for gallery
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const deltaX =
        e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY =
        e.changedTouches[0].clientY - touchStartRef.current.y;
      touchStartRef.current = null;

      // Only trigger if horizontal swipe is dominant and > 50px
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) navigateGallery("next");
        else navigateGallery("prev");
      }
    },
    [navigateGallery]
  );

  // Load signed URLs for existing photos
  useEffect(() => {
    async function loadUrls() {
      const entries = Object.entries(photos);
      const urls: Record<string, string> = {};
      for (const [type, photo] of entries) {
        try {
          urls[type] = await getPhotoUrl(photo.storage_path);
        } catch {
          // Skip failed URLs
        }
      }
      setSignedUrls(urls);
    }
    loadUrls();
  }, [photos]);

  const setSlotState = useCallback(
    (type: string, state: Partial<SlotState>) => {
      setSlotStates((prev) => ({
        ...prev,
        [type]: { ...(prev[type] ?? { uploading: false, progress: 0, error: null }), ...state },
      }));
    },
    []
  );

  const handleFileSelect = useCallback(
    async (photoType: PhotoType, file: File) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setSlotState(photoType, { error: "Selecione um arquivo de imagem." });
        return;
      }

      // Validate file size (max 10 MB)
      if (file.size > 10 * 1024 * 1024) {
        setSlotState(photoType, { error: "Imagem deve ter no maximo 10 MB." });
        return;
      }

      setSlotState(photoType, { uploading: true, progress: 0, error: null });

      try {
        // If replacing, delete old photo first
        const existing = photos[photoType];
        if (existing) {
          await deleteInspectionPhoto(existing.id, existing.storage_path);
        }

        const photo = await uploadInspectionPhoto(
          inspectionId,
          photoType,
          file,
          (percent) => setSlotState(photoType, { progress: percent })
        );

        setPhotos((prev) => ({ ...prev, [photoType]: photo }));
        setSlotState(photoType, { uploading: false, progress: 100, error: null });

        // Load signed URL for new photo
        try {
          const url = await getPhotoUrl(photo.storage_path);
          setSignedUrls((prev) => ({ ...prev, [photoType]: url }));
        } catch {
          // Non-critical
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao enviar foto.";
        setSlotState(photoType, { uploading: false, progress: 0, error: message });
      }
    },
    [inspectionId, photos, setSlotState]
  );

  const handleRemove = useCallback(
    async (photoType: PhotoType) => {
      const photo = photos[photoType];
      if (!photo) return;

      setSlotState(photoType, { uploading: true, progress: 0, error: null });

      try {
        await deleteInspectionPhoto(photo.id, photo.storage_path);
        setPhotos((prev) => {
          const next = { ...prev };
          delete next[photoType];
          return next;
        });
        setSignedUrls((prev) => {
          const next = { ...prev };
          delete next[photoType];
          return next;
        });
        setSlotState(photoType, { uploading: false, progress: 0, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao remover foto.";
        setSlotState(photoType, { uploading: false, progress: 0, error: message });
      }
    },
    [photos, setSlotState]
  );

  const handleInputChange = useCallback(
    (photoType: PhotoType, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(photoType, file);
      }
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleFileSelect]
  );

  const triggerFileInput = useCallback((photoType: PhotoType) => {
    fileInputRefs.current[photoType]?.click();
  }, []);

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Coleta de Imagens do Equipamento
        </h2>
        <span className="text-sm font-medium text-gray-500">
          {capturedCount} de 6 fotos capturadas
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.round((capturedCount / 6) * 100)}%` }}
        />
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PHOTO_TYPES.map((photoType) => {
          const photo = photos[photoType];
          const slotState = slotStates[photoType];
          const signedUrl = signedUrls[photoType];

          return (
            <div key={photoType} className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700">
                {PHOTO_TYPE_LABELS[photoType]}
              </span>

              {photo && signedUrl ? (
                /* ── Photo exists ── */
                <div className="relative rounded-lg overflow-hidden border border-gray-200 cursor-pointer" style={{ height: 200 }} onClick={() => openGallery(photoType)}>
                  <img
                    src={signedUrl}
                    alt={PHOTO_TYPE_LABELS[photoType]}
                    className="w-full h-full object-cover"
                  />
                  {isEditable && (
                    <div className="absolute bottom-0 inset-x-0 flex gap-2 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <button
                        type="button"
                        onClick={() => triggerFileInput(photoType)}
                        disabled={slotState?.uploading}
                        className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        Substituir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(photoType)}
                        disabled={slotState?.uploading}
                        className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Empty slot ── */
                <div
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
                  style={{ height: 200 }}
                >
                  {slotState?.uploading ? (
                    <div className="flex flex-col items-center gap-2 px-4 w-full">
                      <svg
                        className="animate-spin h-6 w-6 text-blue-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${slotState.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">Enviando...</span>
                    </div>
                  ) : (
                    <>
                      {/* Camera icon */}
                      <svg
                        className="h-10 w-10 text-gray-400 mb-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
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
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => triggerFileInput(photoType)}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors min-h-[44px]"
                        >
                          Tirar Foto
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Error message */}
              {slotState?.error && (
                <p className="text-xs text-red-600" role="alert">
                  {slotState.error}
                </p>
              )}

              {/* Hidden file input */}
              <input
                ref={(el) => { fileInputRefs.current[photoType] = el; }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleInputChange(photoType, e)}
                data-testid={`file-input-${photoType}`}
              />
            </div>
          );
        })}
      </div>

      {/* Full-screen photo gallery (US-403) */}
      {gallery.open && availablePhotos.length > 0 && (() => {
        const currentType = availablePhotos[gallery.currentIndex];
        const currentUrl = signedUrls[currentType];
        const currentLabel = PHOTO_TYPE_LABELS[currentType];
        const photoNumber = gallery.currentIndex + 1;
        const totalPhotos = availablePhotos.length;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            data-testid="photo-gallery"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={closeGallery}
              className="absolute top-4 right-4 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors min-h-[44px] min-w-[44px]"
              aria-label="Fechar galeria"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Photo info header */}
            <div className="absolute top-4 left-4 z-10 text-white">
              <p className="text-sm font-medium">{currentLabel}</p>
              <p className="text-xs text-gray-300">{photoNumber} de {totalPhotos}</p>
            </div>

            {/* Previous button */}
            {totalPhotos > 1 && (
              <button
                type="button"
                onClick={() => navigateGallery("prev")}
                className="absolute left-4 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors min-h-[44px] min-w-[44px]"
                aria-label="Foto anterior"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            {/* Image */}
            <img
              src={currentUrl}
              alt={currentLabel}
              className="max-h-[85vh] max-w-[90vw] object-contain select-none"
              draggable={false}
            />

            {/* Next button */}
            {totalPhotos > 1 && (
              <button
                type="button"
                onClick={() => navigateGallery("next")}
                className="absolute right-4 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors min-h-[44px] min-w-[44px]"
                aria-label="Próxima foto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
