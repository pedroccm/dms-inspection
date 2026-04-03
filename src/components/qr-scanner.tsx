"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseEquipmentQR, type EquipmentQRData } from "@/lib/qr-parser";

// Type declarations for the native BarcodeDetector API
interface BarcodeDetectorResult {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
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
  onScan: (data: Partial<EquipmentQRData>, raw: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setIsOpen(false);
    setError(null);
  }, [stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startScanning = useCallback(async () => {
    setError(null);
    setIsOpen(true);
    setScanning(true);

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

      // Check for native BarcodeDetector (Chrome/Android)
      const hasNativeDetector =
        typeof window !== "undefined" && "BarcodeDetector" in window;

      if (hasNativeDetector && window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({
          formats: ["qr_code"],
        });
        scanWithNativeDetector(detector);
      } else {
        // Try jsQR fallback
        try {
          const jsQR = (await import("jsqr")).default;
          scanWithJsQR(jsQR);
        } catch {
          setError(
            "QR Code scanning is not supported in this browser. Please use Chrome on Android or install the jsQR package."
          );
          setScanning(false);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(`Camera error: ${message}`);
      setScanning(false);
    }
  }, []);

  const handleDetection = useCallback(
    (rawValue: string) => {
      const parsed = parseEquipmentQR(rawValue);
      onScan(parsed, rawValue);
      handleClose();
    },
    [onScan, handleClose]
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
        } catch {
          // Detection failed on this frame, continue scanning
        }

        animationRef.current = requestAnimationFrame(scan);
      };

      animationRef.current = requestAnimationFrame(scan);
    },
    [handleDetection]
  );

  const scanWithJsQR = useCallback(
    (
      jsQR: (
        data: Uint8ClampedArray,
        width: number,
        height: number
      ) => { data: string } | null
    ) => {
      const scan = () => {
        if (
          !videoRef.current ||
          !canvasRef.current ||
          !streamRef.current
        )
          return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          animationRef.current = requestAnimationFrame(scan);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          handleDetection(code.data);
          return;
        }

        animationRef.current = requestAnimationFrame(scan);
      };

      animationRef.current = requestAnimationFrame(scan);
    },
    [handleDetection]
  );

  if (!isOpen) {
    return (
      <Button type="button" variant="secondary" onClick={startScanning}>
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
          />
        </svg>
        Escanear QR Code
      </Button>
    );
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      {/* Camera preview */}
      <div className="relative aspect-video max-h-[400px]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        {/* Hidden canvas for jsQR processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning overlay */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Semi-transparent overlay with clear center */}
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative w-64 h-64 border-2 border-white rounded-lg">
              {/* Corner markers */}
              <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-[#F5A623] rounded-tl-lg" />
              <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-[#F5A623] rounded-tr-lg" />
              <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-[#F5A623] rounded-bl-lg" />
              <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-[#F5A623] rounded-br-lg" />
              {/* Scan line animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-[#F5A623] animate-pulse top-1/2" />
            </div>
            <p className="absolute bottom-4 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">
              Aponte a câmera para o QR Code do equipamento
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {/* Controls */}
      <div className="p-4 bg-gray-900 flex justify-center">
        <Button type="button" variant="secondary" onClick={handleClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
