"use client";

import { useEffect, useRef, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────

export interface PhotoViewerItem {
  url: string;
  label: string;
  /** Custom filename used when the user clicks the download button */
  downloadName?: string;
}

interface PhotoViewerProps {
  photos: PhotoViewerItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// ─── Component ─────────────────────────────────────────────

export function PhotoViewer({
  photos,
  currentIndex,
  onClose,
  onNavigate,
}: PhotoViewerProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const total = photos.length;
  const current = photos[currentIndex];
  const photoNumber = currentIndex + 1;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  const goPrev = useCallback(() => {
    if (!isFirst) onNavigate(currentIndex - 1);
  }, [currentIndex, isFirst, onNavigate]);

  const goNext = useCallback(() => {
    if (!isLast) onNavigate(currentIndex + 1);
  }, [currentIndex, isLast, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, goPrev, goNext]);

  // Touch swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      touchStartRef.current = null;

      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) goNext();
        else goPrev();
      }
    },
    [goNext, goPrev]
  );

  const handleDownload = useCallback(async () => {
    if (!current) return;
    const fallback = (current.url.split("/").pop() ?? "foto").split("?")[0];
    const filename = current.downloadName ?? fallback;
    try {
      const res = await fetch(current.url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback: open in a new tab so the user can save manually
      window.open(current.url, "_blank", "noopener,noreferrer");
    }
  }, [current]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      data-testid="photo-viewer"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        style={{ minHeight: 48, minWidth: 48 }}
        aria-label="Fechar galeria"
        data-testid="photo-viewer-close"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Download button */}
      <button
        type="button"
        onClick={handleDownload}
        className="absolute top-4 right-20 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        style={{ minHeight: 48, minWidth: 48 }}
        aria-label="Baixar foto"
        title="Baixar foto"
        data-testid="photo-viewer-download"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
      </button>

      {/* Photo info header */}
      <div className="absolute top-4 left-4 z-10 text-white">
        <p className="text-sm font-medium" data-testid="photo-viewer-label">
          {current.label}
        </p>
        <p
          className="text-xs text-gray-300"
          data-testid="photo-viewer-counter"
        >
          {photoNumber} de {total}
        </p>
      </div>

      {/* Previous button */}
      {!isFirst && (
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-4 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          style={{ minHeight: 48, minWidth: 48 }}
          aria-label="Foto anterior"
          data-testid="photo-viewer-prev"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
      )}

      {/* Image */}
      <img
        src={current.url}
        alt={current.label}
        className="max-h-[85vh] max-w-[90vw] object-contain select-none"
        draggable={false}
      />

      {/* Next button */}
      {!isLast && (
        <button
          type="button"
          onClick={goNext}
          className="absolute right-4 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          style={{ minHeight: 48, minWidth: 48 }}
          aria-label="Proxima foto"
          data-testid="photo-viewer-next"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
