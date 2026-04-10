"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Photo } from "@/lib/types";
import {
  DEFAULT_PHOTO_TYPES,
  MIN_PHOTOS,
  MAX_PHOTOS,
  getPhotoLabel,
} from "@/lib/types";
import { getPhotoUrl } from "@/lib/storage";
import { PhotoViewer } from "@/components/photo-viewer";
import type { PhotoViewerItem } from "@/components/photo-viewer";

// ─── Types ─────────────────────────────────────────────────

interface PhotoSectionProps {
  inspectionId: string;
  existingPhotos: Photo[];
  isEditable: boolean;
  serverPhotoUrls?: Record<string, string>;
}

interface PhotoSlot {
  key: string; // photo_type value used as unique key
  label: string;
  required: boolean; // first 6 are required
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

/** Build the initial list of slots from defaults + any existing dynamic photos */
function buildInitialSlots(existingPhotos: Photo[]): PhotoSlot[] {
  // Start with the 6 default required slots
  const slots: PhotoSlot[] = DEFAULT_PHOTO_TYPES.map((type) => ({
    key: type,
    label: getPhotoLabel(type),
    required: true,
  }));

  // Add slots for any existing dynamic photos (photo_7, photo_8, etc.)
  for (const photo of existingPhotos) {
    if (!DEFAULT_PHOTO_TYPES.includes(photo.photo_type)) {
      slots.push({
        key: photo.photo_type,
        label: getPhotoLabel(photo.photo_type, photo.label),
        required: false,
      });
    }
  }

  return slots;
}

/** Get the next available dynamic photo key */
function getNextPhotoKey(slots: PhotoSlot[]): string {
  let maxNum = 6;
  for (const slot of slots) {
    const match = slot.key.match(/^photo_(\d+)$/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }
  return `photo_${maxNum + 1}`;
}

// ─── Component ─────────────────────────────────────────────

export function PhotoSection({
  inspectionId,
  existingPhotos,
  isEditable,
  serverPhotoUrls,
}: PhotoSectionProps) {
  const [slots, setSlots] = useState<PhotoSlot[]>(() =>
    buildInitialSlots(existingPhotos)
  );

  const [photos, setPhotos] = useState<Record<string, Photo>>(() => {
    const map: Record<string, Photo> = {};
    for (const photo of existingPhotos) {
      map[photo.photo_type] = photo;
    }
    return map;
  });

  const [slotStates, setSlotStates] = useState<Record<string, SlotState>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>(serverPhotoUrls ?? {});
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const capturedCount = Object.keys(photos).length;

  // Gallery state (US-403)
  const [gallery, setGallery] = useState<GalleryState>({
    open: false,
    currentIndex: 0,
  });

  // Build ordered list of photos that exist (for gallery navigation)
  const availablePhotos = slots
    .map((s) => s.key)
    .filter((key) => photos[key] && signedUrls[key]);

  const viewerPhotos: PhotoViewerItem[] = availablePhotos.map((key) => {
    const slot = slots.find((s) => s.key === key);
    return {
      url: signedUrls[key],
      label: slot?.label ?? key,
    };
  });

  const openGallery = useCallback(
    (photoKey: string) => {
      const index = availablePhotos.indexOf(photoKey);
      if (index >= 0) {
        setGallery({ open: true, currentIndex: index });
      }
    },
    [availablePhotos]
  );

  const closeGallery = useCallback(() => {
    setGallery({ open: false, currentIndex: 0 });
  }, []);

  // Load signed URLs for existing photos
  useEffect(() => {
    async function loadUrls() {
      const entries = Object.entries(photos);
      const newUrls: Record<string, string> = {};
      for (const [type, photo] of entries) {
        // Skip if already have a URL from server or previous load
        if (signedUrls[type]) continue;
        try {
          newUrls[type] = await getPhotoUrl(photo.storage_path);
        } catch {
          // Skip failed URLs
        }
      }
      if (Object.keys(newUrls).length > 0) {
        setSignedUrls((prev) => ({ ...prev, ...newUrls }));
      }
    }
    loadUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  const setSlotState = useCallback(
    (type: string, state: Partial<SlotState>) => {
      setSlotStates((prev) => ({
        ...prev,
        [type]: {
          ...(prev[type] ?? { uploading: false, progress: 0, error: null }),
          ...state,
        },
      }));
    },
    []
  );

  const handleFileSelect = useCallback(
    async (photoKey: string, file: File) => {
      // Validate file type (allow empty type for camera captures on Android)
      const isImage = file.type.startsWith("image/") || file.type === "" || file.name.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i);
      if (!isImage) {
        setSlotState(photoKey, { uploading: false, progress: 0, error: `Tipo não suportado: ${file.type || "desconhecido"}` });
        return;
      }

      // Validate file size (max 10 MB)
      if (file.size > 10 * 1024 * 1024) {
        setSlotState(photoKey, {
          uploading: false, progress: 0, error: `Imagem muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB (máx 10MB)`,
        });
        return;
      }

      setSlotState(photoKey, { uploading: true, progress: 10, error: null });

      try {
        // If replacing, delete old photo first via API
        const existing = photos[photoKey];
        if (existing) {
          await fetch("/api/photos/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoId: existing.id, storagePath: existing.storage_path }),
          });
        }

        // Upload via API route (server-side, no RLS issues)
        const slot = slots.find((s) => s.key === photoKey);
        const customLabel = slot && !slot.required ? slot.label : null;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("inspectionId", inspectionId);
        formData.append("photoType", photoKey);
        if (customLabel) formData.append("label", customLabel);

        setSlotState(photoKey, { progress: 30 });

        const res = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });

        const result = await res.json();

        if (!res.ok || result.error) {
          throw new Error(result.error ?? "Erro ao enviar foto.");
        }

        setPhotos((prev) => ({ ...prev, [photoKey]: result.photo }));
        if (result.signedUrl) {
          setSignedUrls((prev) => ({ ...prev, [photoKey]: result.signedUrl }));
        }
        setSlotState(photoKey, { uploading: false, progress: 100, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao enviar foto.";
        setSlotState(photoKey, { uploading: false, progress: 0, error: message });
      }
    },
    [inspectionId, photos, slots, setSlotState]
  );

  const handleRemove = useCallback(
    async (photoKey: string) => {
      const photo = photos[photoKey];
      if (!photo) return;

      setSlotState(photoKey, { uploading: true, progress: 0, error: null });

      try {
        await fetch("/api/photos/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId: photo.id, storagePath: photo.storage_path }),
        });
        setPhotos((prev) => {
          const next = { ...prev };
          delete next[photoKey];
          return next;
        });
        setSignedUrls((prev) => {
          const next = { ...prev };
          delete next[photoKey];
          return next;
        });
        setSlotState(photoKey, {
          uploading: false,
          progress: 0,
          error: null,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao remover foto.";
        setSlotState(photoKey, {
          uploading: false,
          progress: 0,
          error: message,
        });
      }
    },
    [photos, setSlotState]
  );

  /** Remove a dynamic slot (only for non-required slots without an uploaded photo) */
  const handleRemoveSlot = useCallback(
    async (photoKey: string) => {
      const photo = photos[photoKey];

      // If there's a photo uploaded, delete it first
      if (photo) {
        setSlotState(photoKey, { uploading: true, progress: 0, error: null });
        try {
          await fetch("/api/photos/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId: photo.id, storagePath: photo.storage_path }),
        });
          setPhotos((prev) => {
            const next = { ...prev };
            delete next[photoKey];
            return next;
          });
          setSignedUrls((prev) => {
            const next = { ...prev };
            delete next[photoKey];
            return next;
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Erro ao remover foto.";
          setSlotState(photoKey, {
            uploading: false,
            progress: 0,
            error: message,
          });
          return;
        }
      }

      // Remove the slot
      setSlots((prev) => prev.filter((s) => s.key !== photoKey));
      setSlotStates((prev) => {
        const next = { ...prev };
        delete next[photoKey];
        return next;
      });
    },
    [photos, setSlotState]
  );

  const handleInputChange = useCallback(
    (photoKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(photoKey, file);
      }
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleFileSelect]
  );

  const triggerFileInput = useCallback((photoKey: string) => {
    fileInputRefs.current[photoKey]?.click();
  }, []);

  const handleAddSlot = useCallback(() => {
    if (slots.length >= MAX_PHOTOS) return;
    const key = getNextPhotoKey(slots);
    const num = key.replace("photo_", "");
    setSlots((prev) => [
      ...prev,
      { key, label: `Foto ${num}`, required: false },
    ]);
  }, [slots]);

  const handleLabelChange = useCallback(
    (photoKey: string, newLabel: string) => {
      setSlots((prev) =>
        prev.map((s) => (s.key === photoKey ? { ...s, label: newLabel } : s))
      );
    },
    []
  );

  const handleLabelBlur = useCallback(
    (photoKey: string) => {
      setEditingLabel(null);
      // If the label is empty, reset to default
      const slot = slots.find((s) => s.key === photoKey);
      if (slot && !slot.label.trim()) {
        const num = photoKey.replace("photo_", "");
        handleLabelChange(photoKey, `Foto ${num}`);
      }
    },
    [slots, handleLabelChange]
  );

  // ─── Progress ────────────────────────────────────────────

  const progressPercent =
    capturedCount >= MIN_PHOTOS
      ? 100
      : Math.round((capturedCount / MIN_PHOTOS) * 100);

  const progressLabel =
    capturedCount < MIN_PHOTOS
      ? `${capturedCount} de ${MIN_PHOTOS} fotos obrigatórias`
      : `${capturedCount} foto${capturedCount !== 1 ? "s" : ""} capturada${capturedCount !== 1 ? "s" : ""}`;

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Coleta de Imagens do Equipamento
        </h2>
        <span className="text-sm font-medium text-gray-500">
          {progressLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-[#F5A623] h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slot) => {
          const photo = photos[slot.key];
          const slotState = slotStates[slot.key];
          const signedUrl = signedUrls[slot.key];
          const isEditingThisLabel = editingLabel === slot.key;

          return (
            <div key={slot.key} className="flex flex-col gap-2">
              {/* Label - editable for dynamic slots */}
              <div className="flex items-center gap-2">
                {!slot.required && isEditable && isEditingThisLabel ? (
                  <input
                    type="text"
                    value={slot.label}
                    onChange={(e) =>
                      handleLabelChange(slot.key, e.target.value)
                    }
                    onBlur={() => handleLabelBlur(slot.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLabelBlur(slot.key);
                    }}
                    className="text-sm font-medium text-gray-700 border border-gray-300 rounded px-2 py-0.5 focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623] focus:outline-none flex-1"
                    autoFocus
                    data-testid={`label-input-${slot.key}`}
                  />
                ) : (
                  <span
                    className={`text-sm font-medium text-gray-700 ${
                      !slot.required && isEditable
                        ? "cursor-pointer hover:text-[#F5A623]"
                        : ""
                    }`}
                    onClick={() => {
                      if (!slot.required && isEditable) {
                        setEditingLabel(slot.key);
                      }
                    }}
                    title={
                      !slot.required && isEditable
                        ? "Clique para editar o nome"
                        : undefined
                    }
                  >
                    {slot.label}
                  </span>
                )}
                {slot.required && (
                  <span className="text-xs text-red-500" title="Obrigatória">
                    *
                  </span>
                )}
              </div>

              {photo && signedUrl ? (
                /* ── Photo exists ── */
                <div
                  className="relative rounded-lg overflow-hidden border border-gray-200 cursor-pointer"
                  style={{ height: 200 }}
                  onClick={() => openGallery(slot.key)}
                >
                  <img
                    src={signedUrl}
                    alt={slot.label}
                    className="w-full h-full object-cover"
                  />
                  {isEditable && (
                    <div className="absolute bottom-0 inset-x-0 flex gap-2 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerFileInput(slot.key);
                        }}
                        disabled={slotState?.uploading}
                        className="flex-1 px-3 py-2 text-xs font-medium text-white bg-[#F5A623] rounded-md hover:bg-[#E8941E] disabled:opacity-50 transition-colors"
                      >
                        Substituir
                      </button>
                      {slot.required ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(slot.key);
                          }}
                          disabled={slotState?.uploading}
                          className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Remover
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSlot(slot.key);
                          }}
                          disabled={slotState?.uploading}
                          className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Remover
                        </button>
                      )}
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
                        className="animate-spin h-6 w-6 text-[#F5A623]"
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
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#F5A623] h-2 rounded-full transition-all duration-300"
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
                      <div className="flex gap-2">
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => triggerFileInput(slot.key)}
                            className="px-4 py-2 text-sm font-medium text-[#F5A623] bg-white border border-[#F5A623] rounded-lg hover:bg-[#FFF4E0] transition-colors min-h-[44px]"
                          >
                            Tirar Foto
                          </button>
                        )}
                        {!slot.required && isEditable && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(slot.key)}
                            className="px-3 py-2 text-sm font-medium text-red-500 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors min-h-[44px]"
                            title="Remover slot"
                            data-testid={`remove-slot-${slot.key}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
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
                ref={(el) => {
                  fileInputRefs.current[slot.key] = el;
                }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleInputChange(slot.key, e)}
                data-testid={`file-input-${slot.key}`}
              />
            </div>
          );
        })}
      </div>

      {/* Add photo button */}
      {isEditable && slots.length < MAX_PHOTOS && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleAddSlot}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            data-testid="add-photo-btn"
          >
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Adicionar Foto ({slots.length}/{MAX_PHOTOS})
          </button>
        </div>
      )}

      {/* Full-screen photo viewer (US-403) */}
      {gallery.open && viewerPhotos.length > 0 && (
        <PhotoViewer
          photos={viewerPhotos}
          currentIndex={gallery.currentIndex}
          onClose={closeGallery}
          onNavigate={(index) =>
            setGallery({ open: true, currentIndex: index })
          }
        />
      )}
    </div>
  );
}
