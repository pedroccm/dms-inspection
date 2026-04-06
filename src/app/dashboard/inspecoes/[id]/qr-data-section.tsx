"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { saveQrData } from "./claim-action";

interface QrDataSectionProps {
  inspectionId: string;
  existingQrData: Record<string, string> | null;
}

export function QrDataSection({ inspectionId, existingQrData }: QrDataSectionProps) {
  const [qrInput, setQrInput] = useState("");
  const [qrData, setQrData] = useState<Record<string, string>>(existingQrData ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualKey, setManualKey] = useState("");
  const [manualValue, setManualValue] = useState("");

  const parseQrData = useCallback((rawData: string): Record<string, string> => {
    const result: Record<string, string> = {};

    // Try JSON parsing first
    try {
      const parsed = JSON.parse(rawData);
      if (typeof parsed === "object" && parsed !== null) {
        for (const [k, v] of Object.entries(parsed)) {
          result[k] = String(v);
        }
        return result;
      }
    } catch {
      // Not JSON, try key=value parsing
    }

    // Try key=value pairs (separated by newlines, semicolons, or commas)
    const lines = rawData.split(/[\n;,]+/).filter(Boolean);
    for (const line of lines) {
      const eqIdx = line.indexOf("=");
      const colonIdx = line.indexOf(":");
      const separatorIdx = eqIdx > -1 ? eqIdx : colonIdx;

      if (separatorIdx > 0) {
        const key = line.slice(0, separatorIdx).trim();
        const value = line.slice(separatorIdx + 1).trim();
        if (key) result[key] = value;
      } else {
        // Single value, store as raw
        result[`campo_${Object.keys(result).length + 1}`] = line.trim();
      }
    }

    return result;
  }, []);

  const handleProcessQr = useCallback(() => {
    if (!qrInput.trim()) return;

    const parsed = parseQrData(qrInput.trim());
    setQrData((prev) => ({ ...prev, ...parsed }));
    setQrInput("");
  }, [qrInput, parseQrData]);

  const handleAddManual = useCallback(() => {
    if (!manualKey.trim() || !manualValue.trim()) return;
    setQrData((prev) => ({ ...prev, [manualKey.trim()]: manualValue.trim() }));
    setManualKey("");
    setManualValue("");
  }, [manualKey, manualValue]);

  const handleRemoveField = useCallback((key: string) => {
    setQrData((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await saveQrData(inspectionId, qrData);

    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error ?? "Erro ao salvar dados.");
    }

    setSaving(false);
  }, [inspectionId, qrData]);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do QR Code</h2>

      {/* QR Input */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cole ou escaneie os dados do QR Code
          </label>
          <textarea
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            placeholder="Cole aqui os dados do QR Code (JSON, key=value, ou key:value)"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors resize-none focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleProcessQr} disabled={!qrInput.trim()}>
            Processar QR
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowManualEntry(!showManualEntry)}
          >
            {showManualEntry ? "Ocultar Entrada Manual" : "Entrada Manual"}
          </Button>
        </div>
      </div>

      {/* Manual Entry */}
      {showManualEntry && (
        <div className="flex items-end gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Campo</label>
            <input
              type="text"
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="Nome do campo"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Valor</label>
            <input
              type="text"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Valor"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAddManual}
            disabled={!manualKey.trim() || !manualValue.trim()}
          >
            Adicionar
          </Button>
        </div>
      )}

      {/* Current QR Data */}
      {Object.keys(qrData).length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Campo</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(qrData).map(([key, value]) => (
                <tr key={key} className="border-b border-gray-100">
                  <td className="px-4 py-2 text-sm font-medium text-gray-700">{key}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{value}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveField(key)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Remover"
                    >
                      &#10005;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={handleSave}
          loading={saving}
          disabled={Object.keys(qrData).length === 0}
        >
          Salvar Dados do QR
        </Button>
        {saved && <span className="text-sm text-green-600">Salvo com sucesso!</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
