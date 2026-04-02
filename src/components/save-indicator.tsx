"use client";

import type { AutoSaveStatus } from "@/hooks/use-auto-save";

interface SaveIndicatorProps {
  status: AutoSaveStatus;
  lastSaved: Date | null;
  error?: string | null;
  onRetry?: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SaveIndicator({
  status,
  lastSaved,
  error,
  onRetry,
}: SaveIndicatorProps) {
  if (status === "idle" && !lastSaved) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs" role="status" aria-live="polite">
      {status === "saving" && (
        <>
          <svg
            className="animate-spin h-3.5 w-3.5 text-gray-400"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-gray-400">Salvando...</span>
        </>
      )}

      {status === "saved" && (
        <span className="text-green-600">
          Salvo {lastSaved ? `as ${formatTime(lastSaved)}` : ""} ✓
        </span>
      )}

      {status === "idle" && lastSaved && (
        <span className="text-gray-400">
          Salvo as {formatTime(lastSaved)}
        </span>
      )}

      {status === "error" && (
        <span className="flex items-center gap-1.5 text-red-600">
          <span>{error ?? "Erro ao salvar"}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="underline hover:text-red-800 font-medium"
            >
              Tentar novamente
            </button>
          )}
        </span>
      )}
    </div>
  );
}
