"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseEquipmentQR } from "@/lib/qr-parser";

// Both QR Code and Data Matrix formats are supported.
// Data Matrix is common on industrial/electrical equipment labels (relays etc.).
const SUPPORTED_FORMATS = ["qr_code", "data_matrix"];

interface BarcodeDetectorResult {
  rawValue: string;
  format: string;
}

interface BarcodeDetectorInstance {
  detect(source: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats(): Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

interface QRScannerProps {
  onScan: (data: Record<string, string>, raw: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugRaw, setDebugRaw] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zxingControlsRef = useRef<any>(null);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {}
      zxingControlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setIsOpen(false);
    setError(null);
  }, [stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleDetection = useCallback(
    (rawValue: string) => {
      stopCamera();
      setDebugRaw(rawValue);
      const parsed = parseEquipmentQR(rawValue);
      onScan(parsed, rawValue);
      setIsOpen(false);
    },
    [onScan, stopCamera]
  );

  const scanWithNativeDetector = useCallback(
    (detector: BarcodeDetectorInstance) => {
      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (results.length > 0) {
            handleDetection(results[0].rawValue);
            return;
          }
        } catch {}
        animationRef.current = requestAnimationFrame(scan);
      };
      animationRef.current = requestAnimationFrame(scan);
    },
    [handleDetection]
  );

  /**
   * Fallback using @zxing/browser — handles QR Code + Data Matrix + many more,
   * in case the browser does not have a native BarcodeDetector (e.g. iOS Safari).
   */
  const scanWithZXing = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoElement(
        videoRef.current,
        (result) => {
          if (result) {
            handleDetection(result.getText());
          }
        }
      );
      zxingControlsRef.current = controls;
    } catch {
      setError(
        "Scanner não suportado neste navegador. Tente Chrome no Android ou digite os dados manualmente."
      );
    }
  }, [handleDetection]);

  const startScanning = useCallback(async () => {
    setError(null);
    setDebugRaw(null);
    setIsOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({ formats: SUPPORTED_FORMATS });
        scanWithNativeDetector(detector);
      } else {
        // Fallback for browsers without BarcodeDetector (iOS Safari mostly)
        await scanWithZXing();
      }
    } catch {
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  }, [scanWithNativeDetector, scanWithZXing]);

  // Lock body scroll when fullscreen is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={startScanning}
        className="inline-flex items-center gap-2 px-5 py-3 bg-[#1B2B5E] text-white font-semibold rounded-lg hover:bg-[#152349] transition-colors min-h-[48px] text-base"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        Escanear código
      </button>


      {/* Fullscreen overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
          {/* Header */}
          <div className="flex-none flex items-center justify-between px-4 py-3 bg-black/80 z-10">
            <p className="text-white text-sm font-medium">Escanear QR Code ou Data Matrix</p>
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-1 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium min-h-[44px] transition-colors"
            >
              ✕ Fechar
            </button>
          </div>

          {/* Camera fills remaining space */}
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Darkened corners */}
              <div className="absolute inset-0 bg-black/40" />

              {/* Clear center square */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64">
                {/* Cut out the center */}
                <div className="absolute inset-0 bg-transparent" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)" }} />

                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-[#F5A623] rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-[#F5A623] rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-[#F5A623] rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-[#F5A623] rounded-br-lg" />

                {/* Animated scan line */}
                <div className="absolute left-3 right-3 h-0.5 bg-[#F5A623] animate-scan-line" />
              </div>
            </div>

            {/* Bottom instruction */}
            <div className="absolute bottom-6 left-0 right-0 text-center z-10">
              <p className="inline-block text-white text-sm font-medium bg-black/60 px-4 py-2 rounded-full">
                Aponte para o QR Code ou Data Matrix
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="absolute top-16 left-4 right-4 z-10">
                <div className="p-3 bg-red-500/90 text-white text-sm rounded-lg text-center">
                  {error}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan line animation */}
      <style jsx>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; }
          50% { top: 85%; }
        }
        .animate-scan-line {
          animation: scanLine 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
