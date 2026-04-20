"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { QRScanner } from "@/components/qr-scanner";
import { parseRelayQR, RELAY_FIELD_ORDER, emptyRelayData, type RelayQRData } from "@/lib/relay-qr-parser";
import { saveRelayData } from "./claim-action";

interface RelayDataSectionProps {
  inspectionId: string;
  existingRelayData: Record<string, string> | null;
  isEditable: boolean;
}

function buildFields(data: Record<string, string> | null): RelayQRData {
  const base = emptyRelayData();
  if (!data) return base;
  for (const { key } of RELAY_FIELD_ORDER) {
    if (typeof data[key] === "string") base[key] = data[key];
  }
  return base;
}

export function RelayDataSection({
  inspectionId,
  existingRelayData,
  isEditable,
}: RelayDataSectionProps) {
  const [fields, setFields] = useState<RelayQRData>(() => buildFields(existingRelayData));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleQrScan = useCallback((_parsed: Record<string, string>, raw: string) => {
    const data = parseRelayQR(raw);
    setFields((prev) => {
      const next = { ...prev };
      for (const { key } of RELAY_FIELD_ORDER) {
        if (data[key]) next[key] = data[key];
      }
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    setFields(emptyRelayData());
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const dataToSave: Record<string, string> = {};
    for (const { key } of RELAY_FIELD_ORDER) {
      const value = fields[key].trim();
      if (value) dataToSave[key] = value;
    }

    const result = await saveRelayData(inspectionId, dataToSave);

    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error ?? "Erro ao salvar dados do relé.");
    }

    setSaving(false);
  }, [inspectionId, fields]);

  const hasAnyData = RELAY_FIELD_ORDER.some(({ key }) => fields[key].trim() !== "");

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-900">
          Dados do Relé de Proteção
        </h2>
        <span className="text-xs font-medium text-gray-500 uppercase">Opcional</span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Leia o QR Code do relé para preencher automaticamente. Todos os campos são editáveis.
      </p>

      {isEditable && (
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <QRScanner onScan={handleQrScan} />
          {hasAnyData && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Limpar campos
            </button>
          )}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Campos do Relé</p>
        </div>
        <div className="divide-y divide-gray-100">
          {RELAY_FIELD_ORDER.map((field) => (
            <div key={field.key} className="flex items-center gap-4 px-4 py-3">
              <label className="text-sm font-medium text-gray-700 w-44 shrink-0">
                {field.label}
              </label>
              <input
                type="text"
                value={fields[field.key]}
                onChange={(e) =>
                  setFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                disabled={!isEditable}
                placeholder={field.label}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          ))}
        </div>
      </div>

      {isEditable && (
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSave} loading={saving}>
            Salvar dados do relé
          </Button>
          {saved && <span className="text-sm text-green-600">Salvo com sucesso!</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      )}
    </div>
  );
}
