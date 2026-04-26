"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { QRScanner } from "@/components/qr-scanner";
import { parseEquipmentQR, QR_FIELD_ORDER } from "@/lib/qr-parser";
import { saveQrData } from "./claim-action";

interface QrDataSectionProps {
  inspectionId: string;
  existingQrData: Record<string, string> | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 800;

export function QrDataSection({ inspectionId, existingQrData }: QrDataSectionProps) {
  const buildFields = (data: Record<string, string> | null): Record<string, string> => {
    const fields: Record<string, string> = {};
    for (const field of QR_FIELD_ORDER) {
      fields[field.key] = data?.[field.key] ?? "";
    }
    return fields;
  };

  const [fields, setFields] = useState<Record<string, string>>(() => buildFields(existingQrData));
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);

  const persist = useCallback(
    async (data: Record<string, string>) => {
      const dataToSave: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value.trim()) dataToSave[key] = value.trim();
      }

      setStatus("saving");
      setError(null);

      const prev = inflightRef.current;
      const next = (async () => {
        if (prev) await prev.catch(() => {});
        const result = await saveQrData(inspectionId, dataToSave);
        if (result.success) {
          setStatus("saved");
        } else {
          setStatus("error");
          setError(result.error ?? "Erro ao salvar dados.");
        }
      })();
      inflightRef.current = next;
      await next;
    },
    [inspectionId]
  );

  const scheduleAutosave = useCallback(
    (data: Record<string, string>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void persist(data);
      }, AUTOSAVE_DELAY_MS);
    },
    [persist]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleQrScan = useCallback(
    (_parsed: Record<string, string>, raw: string) => {
      const data = parseEquipmentQR(raw);
      setFields((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(data)) {
          if (value) next[key] = value;
        }
        if (timerRef.current) clearTimeout(timerRef.current);
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      setFields((prev) => {
        const next = { ...prev, [key]: value };
        scheduleAutosave(next);
        return next;
      });
    },
    [scheduleAutosave]
  );

  const handleRetry = useCallback(() => {
    void persist(fields);
  }, [persist, fields]);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Dados do Equipamento</h2>
        <SaveIndicator status={status} error={error} onRetry={handleRetry} />
      </div>

      {/* QR Scanner (fullscreen overlay) */}
      <div className="mb-4">
        <QRScanner onScan={handleQrScan} />
      </div>

      {/* Editable Fields - 16 fields from QR_FIELD_ORDER */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Campos do Equipamento</p>
        </div>
        <div className="divide-y divide-gray-100">
          {QR_FIELD_ORDER.map((field) => (
            <div key={field.key} className="flex items-center gap-4 px-4 py-3">
              <label className="text-sm font-medium text-gray-700 w-40 shrink-0">
                {field.label}
              </label>
              <input
                type="text"
                value={fields[field.key] ?? ""}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.label}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({
  status,
  error,
  onRetry,
}: {
  status: SaveStatus;
  error: string | null;
  onRetry: () => void;
}) {
  if (status === "saving") {
    return <span className="text-sm text-gray-500">Salvando...</span>;
  }
  if (status === "saved") {
    return <span className="text-sm text-green-600">Salvo automaticamente</span>;
  }
  if (status === "error") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600">{error ?? "Erro ao salvar."}</span>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  }
  return null;
}
