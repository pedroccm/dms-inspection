"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminOnly } from "@/components/admin-only";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { approveInspection, rejectReport, rejectEquipment } from "./actions";

interface ApprovalPanelProps {
  inspectionId: string;
}

type ApprovalAction = "aprovar" | "reprovar_relatorio" | "reprovar_equipamento" | null;

function ApprovalPanelInner({ inspectionId }: ApprovalPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<ApprovalAction>(null);
  const [reason, setReason] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);

  function handleActionClick(action: ApprovalAction) {
    setError(null);
    setReasonError(null);
    setReason("");

    if (action === "aprovar") {
      setCurrentAction("aprovar");
      setShowConfirmModal(true);
    } else {
      setCurrentAction(action);
    }
  }

  function handleConfirmRejection() {
    if (currentAction === "reprovar_equipamento" && reason.trim().length < 10) {
      setReasonError("O motivo deve ter pelo menos 10 caracteres.");
      return;
    }
    if ((currentAction === "reprovar_relatorio" || currentAction === "reprovar_equipamento") && !reason.trim()) {
      setReasonError("Informe o motivo da reprovacao.");
      return;
    }
    setReasonError(null);
    setShowConfirmModal(true);
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    setShowConfirmModal(false);

    try {
      let result;
      if (currentAction === "aprovar") {
        result = await approveInspection(inspectionId);
      } else if (currentAction === "reprovar_relatorio") {
        result = await rejectReport(inspectionId, reason);
      } else if (currentAction === "reprovar_equipamento") {
        result = await rejectEquipment(inspectionId, reason);
      }

      if (result && !result.success) {
        setError(result.error ?? "Erro ao processar.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Erro ao processar a ação.");
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  }

  function handleCancel() {
    setCurrentAction(null);
    setReason("");
    setReasonError(null);
    setShowConfirmModal(false);
  }

  const confirmMessages: Record<string, { title: string; body: string }> = {
    aprovar: {
      title: "Aprovar Inspeção",
      body: "Tem certeza que deseja aprovar esta inspeção? O relatório e o equipamento serão marcados como OK.",
    },
    reprovar_relatorio: {
      title: "Reprovar Relatório",
      body: "O relatório será devolvido ao executor para correção. Ele poderá editar e reenviar.",
    },
    reprovar_equipamento: {
      title: "Reprovar Equipamento",
      body: "O equipamento será marcado como reprovado por defeito de fabricação. Esta ação é definitiva.",
    },
  };

  const confirmInfo = currentAction ? confirmMessages[currentAction] : null;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6" data-testid="approval-panel">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Revisão do Master
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Rejection reason form */}
      {(currentAction === "reprovar_relatorio" || currentAction === "reprovar_equipamento") && !showConfirmModal && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {currentAction === "reprovar_relatorio"
              ? "Motivo da reprovação do relatório"
              : "Motivo da reprovação do equipamento (defeito de fabricação)"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError(null);
            }}
            placeholder={
              currentAction === "reprovar_relatorio"
                ? "Descreva o problema encontrado no relatório..."
                : "Descreva o defeito de fabricação encontrado..."
            }
            rows={3}
            className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors resize-none focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none ${
              reasonError ? "border-red-500" : "border-gray-300"
            }`}
          />
          {reasonError && (
            <p className="mt-1 text-xs text-red-600">{reasonError}</p>
          )}
          <div className="flex gap-3 mt-3">
            <Button
              variant="danger"
              size="lg"
              onClick={handleConfirmRejection}
              disabled={loading}
            >
              Confirmar Reprovação
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons - only show when no action is in progress */}
      {!currentAction && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => handleActionClick("aprovar")}
            disabled={loading}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="btn-aprovar"
          >
            Aprovar
          </Button>
          <Button
            variant="danger"
            onClick={() => handleActionClick("reprovar_relatorio")}
            disabled={loading}
            size="lg"
            data-testid="btn-reprovar-relatorio"
          >
            Reprovar Relatório
          </Button>
          <Button
            variant="danger"
            onClick={() => handleActionClick("reprovar_equipamento")}
            disabled={loading}
            size="lg"
            className="bg-orange-600 hover:bg-orange-700 text-white"
            data-testid="btn-reprovar-equipamento"
          >
            Reprovar Equipamento
          </Button>
        </div>
      )}

      {/* Confirmation modal */}
      <Modal
        open={showConfirmModal}
        onClose={handleCancel}
        title={confirmInfo?.title ?? "Confirmar"}
        confirmLabel="Sim, confirmar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirm}
        confirmVariant={currentAction === "aprovar" ? "primary" : "danger"}
        loading={loading}
      >
        <p>{confirmInfo?.body ?? ""}</p>
        {reason && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
            <span className="font-medium">Motivo:</span> {reason}
          </div>
        )}
      </Modal>
    </div>
  );
}

export function ApprovalPanel({ inspectionId }: ApprovalPanelProps) {
  return (
    <AdminOnly>
      <ApprovalPanelInner inspectionId={inspectionId} />
    </AdminOnly>
  );
}
