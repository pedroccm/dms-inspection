"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ChecklistItem, ChecklistItemStatus, InspectionStatus } from "@/lib/types";
import { updateChecklistItem, updateInspectionObservations, updateInspectionStatus, completeInspectionEvaluation } from "./actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SaveIndicator } from "@/components/save-indicator";

// ─── Types ─────────────────────────────────────────────────

interface ChecklistFormProps {
  checklistItems: ChecklistItem[];
  inspectionId: string;
  inspectionStatus: InspectionStatus;
  inspectionNotes: string | null;
}

interface ItemSaveState {
  saving: boolean;
  saved: boolean;
  error: string | null;
}

type StatusOption = {
  value: ChecklistItemStatus;
  label: string;
  icon: string;
  selectedClass: string;
  unselectedClass: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "approved",
    label: "Aprovado",
    icon: "✅",
    selectedClass: "bg-green-600 text-white border-green-600 shadow-sm",
    unselectedClass: "bg-white text-green-700 border-green-300 hover:bg-green-50",
  },
  {
    value: "rejected",
    label: "Reprovado",
    icon: "❌",
    selectedClass: "bg-red-600 text-white border-red-600 shadow-sm",
    unselectedClass: "bg-white text-red-700 border-red-300 hover:bg-red-50",
  },
  {
    value: "na",
    label: "NA",
    icon: "⬜",
    selectedClass: "bg-gray-600 text-white border-gray-600 shadow-sm",
    unselectedClass: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
  },
];

// ─── Helpers ───────────────────────────────────────────────

function groupItemsByCategory(items: ChecklistItem[]) {
  const groups: Record<string, ChecklistItem[]> = {};
  for (const item of items) {
    const dashIndex = item.label.indexOf(" - ");
    const category = dashIndex > 0 ? item.label.substring(0, dashIndex) : "Geral";
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
  }
  return groups;
}

function getItemLabel(item: ChecklistItem) {
  const dashIndex = item.label.indexOf(" - ");
  return dashIndex > 0 ? item.label.substring(dashIndex + 3) : item.label;
}

function isEditable(status: InspectionStatus) {
  return status !== "submitted" && status !== "transferred";
}

function getStatusDisplay(status: ChecklistItemStatus) {
  switch (status) {
    case "approved":
      return { icon: "✅", label: "Aprovado", className: "text-green-700" };
    case "rejected":
      return { icon: "❌", label: "Reprovado", className: "text-red-700" };
    case "na":
      return { icon: "⬜", label: "NA", className: "text-gray-500" };
    default:
      return { icon: "⏳", label: "Pendente", className: "text-gray-400" };
  }
}

// ─── Component ─────────────────────────────────────────────

export function ChecklistForm({
  checklistItems,
  inspectionId,
  inspectionStatus,
  inspectionNotes,
}: ChecklistFormProps) {
  const router = useRouter();
  const editable = isEditable(inspectionStatus);

  // Local state for items
  const [items, setItems] = useState<ChecklistItem[]>(checklistItems);
  const [saveStates, setSaveStates] = useState<Record<string, ItemSaveState>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const item of checklistItems) {
      if (item.rejection_reason) {
        initial[item.id] = item.rejection_reason;
      }
    }
    return initial;
  });
  const [reasonErrors, setReasonErrors] = useState<Record<string, string>>({});

  // Observations state with auto-save hook
  const [observations, setObservations] = useState(inspectionNotes ?? "");
  const autoSave = useAutoSave({
    value: observations,
    onSave: async (value) => updateInspectionObservations(inspectionId, value),
    delay: 3000,
    enabled: editable,
  });

  // Track current inspection status locally for draft → in_progress transition
  const [currentStatus, setCurrentStatus] = useState<InspectionStatus>(inspectionStatus);
  const statusTransitioned = useRef(false);

  // Complete evaluation state
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Progress calculation
  const evaluatedCount = items.filter((i) => i.status !== "pending").length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((evaluatedCount / totalCount) * 100) : 0;
  const allEvaluated = evaluatedCount === totalCount && totalCount > 0;

  const groupedItems = groupItemsByCategory(items);

  // ─── Handlers ──────────────────────────────────────────

  const setSaveState = useCallback((itemId: string, state: Partial<ItemSaveState>) => {
    setSaveStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...state } as ItemSaveState,
    }));
  }, []);

  const handleStatusChange = useCallback(
    async (itemId: string, newStatus: ChecklistItemStatus) => {
      if (!editable) return;

      const currentItem = items.find((i) => i.id === itemId);
      if (!currentItem) return;

      // If clicking the same status, reset to pending
      const finalStatus = currentItem.status === newStatus ? "pending" : newStatus;

      // If changing to rejected, don't save yet -- wait for reason
      if (finalStatus === "rejected") {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, status: finalStatus } : i
          )
        );
        // Clear any previous reason error
        setReasonErrors((prev) => ({ ...prev, [itemId]: "" }));
        return;
      }

      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, status: finalStatus, rejection_reason: null }
            : i
        )
      );

      // Clear rejection reason when moving away from rejected
      if (currentItem.status === "rejected") {
        setRejectionReasons((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
        setReasonErrors((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      }

      setSaveState(itemId, { saving: true, saved: false, error: null });

      const result = await updateChecklistItem(itemId, finalStatus);

      if (result.success) {
        setSaveState(itemId, { saving: false, saved: true, error: null });
        setTimeout(() => setSaveState(itemId, { saving: false, saved: false, error: null }), 2000);
      } else {
        // Revert
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, status: currentItem.status, rejection_reason: currentItem.rejection_reason } : i
          )
        );
        setSaveState(itemId, { saving: false, saved: false, error: result.error ?? "Erro ao salvar" });
      }
    },
    [editable, items, setSaveState]
  );

  const handleRejectionReasonBlur = useCallback(
    async (itemId: string) => {
      const reason = rejectionReasons[itemId] ?? "";

      if (reason.trim().length < 10) {
        setReasonErrors((prev) => ({
          ...prev,
          [itemId]: "Descreva o motivo com pelo menos 10 caracteres",
        }));
        return;
      }

      setReasonErrors((prev) => ({ ...prev, [itemId]: "" }));
      setSaveState(itemId, { saving: true, saved: false, error: null });

      const result = await updateChecklistItem(itemId, "rejected", reason.trim());

      if (result.success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, status: "rejected", rejection_reason: reason.trim() }
              : i
          )
        );
        setSaveState(itemId, { saving: false, saved: true, error: null });
        setTimeout(() => setSaveState(itemId, { saving: false, saved: false, error: null }), 2000);
      } else {
        setSaveState(itemId, { saving: false, saved: false, error: result.error ?? "Erro ao salvar" });
      }
    },
    [rejectionReasons, setSaveState]
  );

  // Auto-transition draft → in_progress when first item is evaluated
  useEffect(() => {
    if (statusTransitioned.current) return;
    if (currentStatus !== "draft") return;

    const hasEvaluated = items.some((i) => i.status !== "pending");
    if (hasEvaluated) {
      statusTransitioned.current = true;
      updateInspectionStatus(inspectionId, "in_progress").then((result) => {
        if (result.success) {
          setCurrentStatus("in_progress");
        }
      });
    }
  }, [items, currentStatus, inspectionId]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const hasUnsaved =
      autoSave.hasUnsavedChanges ||
      Object.values(saveStates).some((s) => s.saving);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [autoSave.hasUnsavedChanges, saveStates]);

  const handleComplete = useCallback(async () => {
    setCompleting(true);
    setCompleteError(null);

    const result = await completeInspectionEvaluation(inspectionId);

    if (result.success) {
      router.refresh();
    } else {
      setCompleteError(result.error ?? "Erro ao concluir avaliacao.");
    }

    setCompleting(false);
  }, [inspectionId, router]);

  // ─── Render ────────────────────────────────────────────

  return (
    <>
      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {evaluatedCount} de {totalCount} itens avaliados
          </span>
          <span className="text-sm font-medium text-gray-500">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      {Object.keys(groupedItems).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500 mb-6">
          Nenhum item de checklist encontrado.
        </div>
      ) : (
        <div className="space-y-6 mb-6">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {category}
                </h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {categoryItems.map((item) => {
                  const itemState = saveStates[item.id];
                  const currentItem = items.find((i) => i.id === item.id) ?? item;
                  const reasonError = reasonErrors[item.id];

                  return (
                    <li key={item.id} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-900 flex-1 min-w-0">
                          {getItemLabel(item)}
                        </span>

                        {editable ? (
                          <div className="flex items-center gap-2 shrink-0">
                            {STATUS_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleStatusChange(item.id, option.value)}
                                disabled={itemState?.saving}
                                className={`
                                  inline-flex items-center justify-center gap-1.5
                                  min-w-[48px] min-h-[48px] px-3 py-2
                                  text-sm font-medium rounded-lg border-2
                                  transition-all duration-150
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  ${currentItem.status === option.value ? option.selectedClass : option.unselectedClass}
                                `}
                                title={option.label}
                                aria-label={`${option.label} - ${getItemLabel(item)}`}
                                aria-pressed={currentItem.status === option.value}
                              >
                                <span aria-hidden="true">{option.icon}</span>
                                <span className="hidden sm:inline">{option.label}</span>
                              </button>
                            ))}

                            {/* Save indicator */}
                            {itemState?.saving && (
                              <span className="text-xs text-gray-400 ml-1">Salvando...</span>
                            )}
                            {itemState?.saved && (
                              <span className="text-xs text-green-600 ml-1">Salvo ✓</span>
                            )}
                            {itemState?.error && (
                              <span className="text-xs text-red-600 ml-1">{itemState.error}</span>
                            )}
                          </div>
                        ) : (
                          <div className="shrink-0">
                            {(() => {
                              const display = getStatusDisplay(currentItem.status);
                              return (
                                <span className={`text-sm flex items-center gap-1.5 ${display.className}`}>
                                  <span>{display.icon}</span>
                                  <span>{display.label}</span>
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Rejection reason field (US-303) */}
                      {currentItem.status === "rejected" && (
                        <div
                          className="mt-3 ml-0 overflow-hidden transition-all duration-300"
                          style={{ maxHeight: "200px", opacity: 1 }}
                        >
                          {editable ? (
                            <div>
                              <textarea
                                placeholder="Motivo da reprovacao"
                                value={rejectionReasons[item.id] ?? ""}
                                onChange={(e) =>
                                  setRejectionReasons((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                onBlur={() => handleRejectionReasonBlur(item.id)}
                                rows={2}
                                className={`
                                  w-full rounded-lg border px-4 py-3 text-sm text-gray-900
                                  placeholder-gray-400 transition-colors resize-none
                                  focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none
                                  ${reasonError ? "border-red-500" : "border-gray-300"}
                                `}
                              />
                              {reasonError && (
                                <p className="mt-1 text-xs text-red-600" role="alert">
                                  {reasonError}
                                </p>
                              )}
                            </div>
                          ) : (
                            currentItem.rejection_reason && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                                <span className="font-medium">Motivo:</span> {currentItem.rejection_reason}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Observations */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Observacoes</h2>
          {editable && (
            <SaveIndicator
              status={autoSave.status}
              lastSaved={autoSave.lastSaved}
              error={autoSave.error}
              onRetry={autoSave.retry}
            />
          )}
        </div>
        {editable ? (
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Adicione observacoes sobre a inspecao..."
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        ) : (
          <div className="rounded-lg border border-gray-300 p-4 min-h-[100px] text-sm text-gray-700 bg-gray-50">
            {inspectionNotes || "Nenhuma observacao registrada."}
          </div>
        )}
      </div>

      {/* Complete Evaluation Button */}
      {editable && (
        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={handleComplete}
            loading={completing}
            disabled={!allEvaluated || completing}
            size="lg"
            fullWidth
            className={!allEvaluated ? "opacity-50 cursor-not-allowed" : ""}
          >
            Concluir Avaliacao
          </Button>
          {!allEvaluated && (
            <p className="text-sm text-gray-500">
              Avalie todos os {totalCount - evaluatedCount} itens pendentes para concluir.
            </p>
          )}
          {completeError && (
            <p className="text-sm text-red-600" role="alert">
              {completeError}
            </p>
          )}
        </div>
      )}
    </>
  );
}
