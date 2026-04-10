"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { QRScanner } from "@/components/qr-scanner";
import { parseEquipmentQR, QR_FIELD_ORDER } from "@/lib/qr-parser";
import { saveQrData } from "./claim-action";

interface QrDataSectionProps {
  inspectionId: string;
  existingQrData: Record<string, string> | null;
}

export function QrDataSection({ inspectionId, existingQrData }: QrDataSectionProps) {
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

  const handleQrScan = useCallback((_parsed: Record<string, string>, raw: string) => {
    // Parse with our positional parser
    const data = parseEquipmentQR(raw);
    setFields((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(data)) {
        if (value) next[key] = value;
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    // Only save non-empty fields
    const dataToSave: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value.trim()) dataToSave[key] = value.trim();
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

      {/* QR Scanner (fullscreen overlay) */}
      <div className="mb-4">
        <QRScanner onScan={handleQrScan} />
      </div>

      {/* Editable Fields - 16 fields from QR_FIELD_ORDER */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
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
                onChange={(e) =>
                  setFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.label}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
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
