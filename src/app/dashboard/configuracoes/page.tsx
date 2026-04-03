"use client";

import { useState, useEffect, useTransition } from "react";
import { AdminOnly } from "@/components/admin-only";
import {
  getRetentionSetting,
  updateRetentionPeriod,
  executeCleanup,
} from "./actions";

const RETENTION_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 15, label: "15 dias" },
  { value: 30, label: "30 dias" },
  { value: 60, label: "60 dias" },
  { value: 90, label: "90 dias" },
];

function SettingsContent() {
  const [retentionDays, setRetentionDays] = useState(30);
  const [saving, startSaving] = useTransition();
  const [cleaning, startCleaning] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [cleanupResult, setCleanupResult] = useState<{
    inspections: number;
    photos: number;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRetentionSetting().then((days) => {
      setRetentionDays(days);
      setLoading(false);
    });
  }, []);

  function handleSave() {
    setMessage(null);
    startSaving(async () => {
      const result = await updateRetentionPeriod(retentionDays);
      if (result.success) {
        setMessage({ type: "success", text: "Configuração salva com sucesso." });
      } else {
        setMessage({
          type: "error",
          text: result.error ?? "Erro ao salvar configuração.",
        });
      }
    });
  }

  function handleCleanup() {
    setMessage(null);
    setCleanupResult(null);
    setShowConfirm(false);
    startCleaning(async () => {
      const result = await executeCleanup();
      if (result.success && result.summary) {
        setCleanupResult(result.summary);
        setMessage({
          type: "success",
          text: `Limpeza concluída: ${result.summary.inspections} inspeção(ões) e ${result.summary.photos} foto(s) removidas.`,
        });
      } else {
        setMessage({
          type: "error",
          text: result.error ?? "Erro ao executar limpeza.",
        });
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-[#F5A623] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2B5E] mb-8">Configurações</h1>

      {/* Retention Policy */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Política de Retenção de Dados
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Inspeções com status &quot;Transferida&quot; serão elegíveis para
          limpeza automática após o período configurado. Apenas inspeções
          transferidas são afetadas.
        </p>

        <div className="flex items-end gap-4">
          <div>
            <label
              htmlFor="retention-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Período de retenção
            </label>
            <select
              id="retention-select"
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="block w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623]"
            >
              {RETENTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-[#F5A623] rounded-lg hover:bg-[#E8941E] disabled:opacity-50 transition-colors min-h-[44px]"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Manual Cleanup */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Limpeza Manual
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Remove inspeções transferidas que ultrapassaram o período de retenção
          configurado ({retentionDays} dias). Esta ação é irreversível.
        </p>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors min-h-[44px]"
          >
            Executar Limpeza
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-red-600 font-medium">
              Tem certeza? Esta ação não pode ser desfeita.
            </p>
            <button
              onClick={handleCleanup}
              disabled={cleaning}
              className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors min-h-[44px]"
            >
              {cleaning ? "Executando..." : "Confirmar Limpeza"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
          </div>
        )}

        {cleanupResult && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <strong>Resultado:</strong> {cleanupResult.inspections}{" "}
            inspeção(ões) e {cleanupResult.photos} foto(s) removidas.
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <AdminOnly
      fallback={
        <div className="text-center py-12 text-gray-500">
          Acesso restrito a administradores.
        </div>
      }
    >
      <SettingsContent />
    </AdminOnly>
  );
}
