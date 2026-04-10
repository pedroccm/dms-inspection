"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ChecklistItem, ChecklistItemStatus, InspectionStatus } from "@/lib/types";
import { updateChecklistItem, updateInspectionObservations, updateInspectionStatus, completeInspectionEvaluation } from "./actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SaveIndicator } from "@/components/save-indicator";

// ─── Types ─────────────────────────────────────────────────

interface ChecklistFormProps {
  checklistItems: ChecklistItem[];
  inspectionId: string;
  inspectionStatus: InspectionStatus;
  inspectionNotes: string | null;
  photoCount?: number;
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
    const category = item.category || "Geral";
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
  }
  return groups;
}

function isEditable(status: InspectionStatus) {
  return (
    status !== "aprovado" &&
    status !== "equipamento_reprovado" &&
    status !== "transferred" &&
    status !== "ready_for_review"
  );
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
  photoCount = 0,
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

  // Validation modal state (US-306)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPendingWarning, setShowPendingWarning] = useState(false);
  const [pendingItemLabels, setPendingItemLabels] = useState<string[]>([]);

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

  // Summary counts for confirmation modal (US-306)
  const approvedCount = items.filter((i) => i.status === "approved").length;
  const rejectedCount = items.filter((i) => i.status === "rejected").length;
  const naCount = items.filter((i) => i.status === "na").length;
  const pendingCount = items.filter((i) => i.status === "pending").length;

  const [rejectedMissingReasons, setRejectedMissingReasons] = useState<string[]>([]);

  const handleCompleteClick = useCallback(() => {
    setCompleteError(null);
    setValidationError(null);
    setRejectedMissingReasons([]);

    // Check if any rejected items have empty or short rejection_reason (US-306)
    const rejectedWithoutReason = items.filter(
      (i) =>
        i.status === "rejected" &&
        (!rejectionReasons[i.id]?.trim() || rejectionReasons[i.id].trim().length < 10)
    );
    if (rejectedWithoutReason.length > 0) {
      const labels = rejectedWithoutReason.map((i) => i.item_name);
      setRejectedMissingReasons(labels);
      setValidationError(
        "Preencha o motivo da reprovação (mínimo 10 caracteres) para os seguintes itens:"
      );
      return;
    }

    // Check if any items are still pending
    const pending = items.filter((i) => i.status === "pending");
    if (pending.length > 0) {
      setPendingItemLabels(pending.map((i) => i.item_name));
      setShowPendingWarning(true);
      return;
    }

    // All validations passed - show confirmation modal
    setShowConfirmModal(true);
  }, [items, rejectionReasons]);

  const handleConfirmComplete = useCallback(async () => {
    setCompleting(true);
    setCompleteError(null);
    setShowConfirmModal(false);
    setShowPendingWarning(false);

    const result = await completeInspectionEvaluation(inspectionId);

    if (result.success) {
      router.refresh();
    } else {
      setCompleteError(result.error ?? "Erro ao concluir avaliação.");
    }

    setCompleting(false);
  }, [inspectionId, router]);

  const handlePendingConfirm = useCallback(() => {
    setShowPendingWarning(false);
    setShowConfirmModal(true);
  }, []);

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
            className="bg-[#F5A623] h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500 mb-6">
          Nenhum item de checklist encontrado.
        </div>
      ) : (
        <div className="space-y-6 mb-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {items.map((item) => {
                  const itemState = saveStates[item.id];
                  const currentItem = items.find((i) => i.id === item.id) ?? item;
                  const reasonError = reasonErrors[item.id];

                  return (
                    <li key={item.id} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-900 flex-1 min-w-0">
                          {item.item_name}
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
                                aria-label={`${option.label} - ${item.item_name}`}
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
                                placeholder="Motivo da reprovação"
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
        </div>
      )}

      {/* Observations */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Observações</h2>
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
            placeholder="Adicione observações sobre a inspeção..."
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors resize-none focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
          />
        ) : (
          <div className="rounded-lg border border-gray-300 p-4 min-h-[100px] text-sm text-gray-700 bg-gray-50">
            {inspectionNotes || "Nenhuma observação registrada."}
          </div>
        )}
      </div>

      {/* Complete Evaluation Button */}
      {editable && (
        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={handleCompleteClick}
            loading={completing}
            disabled={!allEvaluated || completing}
            size="lg"
            fullWidth
          >
            Concluir Avaliação
          </Button>
          {!allEvaluated && (
            <p className="text-sm text-gray-500">
              Avalie todos os {totalCount - evaluatedCount} itens pendentes para concluir.
            </p>
          )}
          {validationError && (
            <div className="text-sm text-red-600" role="alert" data-testid="validation-error">
              <p>{validationError}</p>
              {rejectedMissingReasons.length > 0 && (
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  {rejectedMissingReasons.map((label, i) => (
                    <li key={i}>{label}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {completeError && (
            <p className="text-sm text-red-600" role="alert">
              {completeError}
            </p>
          )}
        </div>
      )}

      {/* Pending items warning modal */}
      <Modal
        open={showPendingWarning}
        onClose={() => setShowPendingWarning(false)}
        title="Itens não avaliados"
        confirmLabel="Continuar mesmo assim"
        cancelLabel="Voltar e avaliar"
        onConfirm={handlePendingConfirm}
      >
        <p className="mb-2">
          Os seguintes itens ainda não foram avaliados:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          {pendingItemLabels.map((label, i) => (
            <li key={i} className="text-gray-600">{label}</li>
          ))}
        </ul>
        <p className="mt-3 text-gray-500">
          Deseja concluir a avaliação mesmo assim?
        </p>
      </Modal>

      {/* Confirmation modal (US-306) */}
      <Modal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Concluir avaliação"
        confirmLabel="Sim, concluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmComplete}
        loading={completing}
      >
        <div className="space-y-3">
          <p>
            Tem certeza que deseja concluir esta avaliação? Após a conclusão,
            os itens não poderão mais ser editados.
          </p>

          {/* Summary counts */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1" data-testid="summary-counts">
            <p className="font-medium text-gray-900 text-sm">Resumo da avaliação:</p>
            <ul className="text-sm space-y-0.5">
              <li className="flex items-center gap-2">
                <span>✅</span> <span>Aprovados: {approvedCount}</span>
              </li>
              <li className="flex items-center gap-2">
                <span>❌</span> <span>Reprovados: {rejectedCount}</span>
              </li>
              <li className="flex items-center gap-2">
                <span>⬜</span> <span>N/A: {naCount}</span>
              </li>
              {pendingCount > 0 && (
                <li className="flex items-center gap-2 text-amber-600">
                  <span>⏳</span> <span>Pendentes: {pendingCount}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Photo warning (US-306) */}
          {photoCount < 6 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm" data-testid="photo-warning">
              <span className="font-medium">Atenção:</span> apenas {photoCount} de 6 fotos obrigatórias foram enviadas
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
