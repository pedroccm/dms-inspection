"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { parseEquipmentQR, QR_FIELD_ORDER } from "@/lib/qr-parser";
import { saveQrData } from "./claim-action";

interface QrDataSectionProps {
  inspectionId: string;
  existingQrData: Record<string, string> | null;
}

export function QrDataSection({ inspectionId, existingQrData }: QrDataSectionProps) {
  // Initialize fields from existing data or empty
  const buildFields = (data: Record<string, string> | null): Record<string, string> => {
    const fields: Record<string, string> = {};
    for (const field of QR_FIELD_ORDER) {
      fields[field.key] = data?.[field.key] ?? "";
    }
    return fields;
  };

  const [fields, setFields] = useState<Record<string, string>>(() => buildFields(existingQrData));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [debugRaw, setDebugRaw] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyQrData = useCallback((raw: string) => {
    setDebugRaw(raw);
    const parsed = parseEquipmentQR(raw);
    setFields((prev) => {
      const next = { ...prev };
      for (const field of QR_FIELD_ORDER) {
        if (parsed[field.key]) {
          next[field.key] = parsed[field.key];
        }
      }
      return next;
    });
  }, []);

  // Camera QR scanning
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BD = (window as any).BarcodeDetector;
      if (BD) {
        const detector = new BD({ formats: ["qr_code"] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              applyQrData(barcodes[0].rawValue);
              stopScanning();
            }
          } catch { /* ignore detection errors */ }
        }, 500);
      } else {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !ctx) return;
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          try {
            const jsQR = (await import("jsqr")).default;
            const code = jsQR(imageData.data, canvas.width, canvas.height);
            if (code) {
              applyQrData(code.data);
              stopScanning();
            }
          } catch { /* jsQR not available */ }
        }, 500);
      }
    } catch {
      setError("Não foi possível acessar a câmera.");
    }
  }, [applyQrData, stopScanning]);

  useEffect(() => {
    return () => stopScanning();
  }, [stopScanning]);

  // Paste raw QR data
  const [qrInput, setQrInput] = useState("");
  const handleProcessQr = useCallback(() => {
    if (!qrInput.trim()) return;
    applyQrData(qrInput.trim());
    setQrInput("");
  }, [qrInput, applyQrData]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    // Only save non-empty fields
    const dataToSave: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value.trim()) {
        dataToSave[key] = value.trim();
      }
    }

    const result = await saveQrData(inspectionId, dataToSave);

    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error ?? "Erro ao salvar dados.");
    }

    setSaving(false);
  }, [inspectionId, fields]);

  const hasAnyData = Object.values(fields).some((v) => v.trim() !== "");

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do QR Code</h2>

      {/* Camera Scanner */}
      {scanning ? (
        <div className="relative mb-4 rounded-lg overflow-hidden bg-black" style={{ maxHeight: 320 }}>
          <video ref={videoRef} className="w-full" autoPlay playsInline muted style={{ maxHeight: 320, objectFit: "cover" }} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-[#F5A623] rounded-lg opacity-70" />
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <Button size="sm" variant="danger" onClick={stopScanning}>Fechar Câmera</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-4">
          <Button onClick={startScanning}>
            Escanear QR Code
          </Button>
          <span className="text-sm text-gray-500">ou cole os dados abaixo</span>
        </div>
      )}

      {/* QR Input (paste) */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dados do QR Code (colar texto)
          </label>
          <textarea
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            placeholder="Cole aqui os dados brutos do QR Code (16 linhas posicionais)"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors resize-none focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
          />
        </div>
        <Button size="sm" onClick={handleProcessQr} disabled={!qrInput.trim()}>
          Processar
        </Button>
      </div>

      {/* Debug: raw QR data */}
      {debugRaw && (
        <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 mb-1">Dados brutos do QR Code:</p>
          <pre className="text-xs text-gray-800 whitespace-pre-wrap break-all font-mono bg-white p-2 rounded border max-h-48 overflow-auto">{debugRaw}</pre>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(debugRaw)}
              className="px-3 py-1.5 text-xs font-medium bg-[#1B2B5E] text-white rounded hover:bg-[#152349] transition-colors"
            >
              Copiar
            </button>
            <button
              type="button"
              onClick={() => setDebugRaw(null)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Editable Fields - 16 fields from QR_FIELD_ORDER */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Campos do Equipamento</p>
        </div>
        <div className="p-4 space-y-3">
          {QR_FIELD_ORDER.map((field) => (
            <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <label
                htmlFor={`qr-${field.key}`}
                className="text-sm font-medium text-gray-700 sm:w-48 sm:flex-shrink-0"
              >
                {field.label}
              </label>
              <input
                id={`qr-${field.key}`}
                type="text"
                value={fields[field.key] ?? ""}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
                placeholder={field.label}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={handleSave}
          loading={saving}
          disabled={!hasAnyData}
        >
          Salvar
        </Button>
        {saved && <span className="text-sm text-green-600">Salvo com sucesso!</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
