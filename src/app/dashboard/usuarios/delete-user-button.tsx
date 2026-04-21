"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserImpact } from "@/lib/types";
import { deleteUser, getUserImpact } from "./actions";

interface EligibleTarget {
  id: string;
  full_name: string;
}

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
  userEmail: string;
  eligibleTargets: EligibleTarget[];
  isSelf: boolean;
}

export function DeleteUserButton({
  userId,
  userName,
  userEmail,
  eligibleTargets,
  isSelf,
}: DeleteUserButtonProps) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [impact, setImpact] = useState<UserImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleOpen() {
    setOpen(true);
    setError(null);
    setTargetId("");
    setImpact(null);
    setLoadingImpact(true);
    try {
      const data = await getUserImpact(userId);
      setImpact(data);
    } catch {
      setError("Não foi possível carregar o impacto da exclusão.");
    } finally {
      setLoadingImpact(false);
    }
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
  }

  function handleConfirm() {
    if (!targetId) {
      setError("Selecione um usuário para transferir o trabalho.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(userId, targetId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={isSelf}
        title={isSelf ? "Você não pode excluir a si mesmo" : undefined}
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Excluir
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[#1B2B5E]">
              Excluir usuário
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Você vai excluir <strong>{userName}</strong> ({userEmail}). Todo o
              trabalho (OSs, inspeções, equipamentos) será transferido para
              outro usuário do mesmo papel.
            </p>

            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              {loadingImpact ? (
                <div>Calculando impacto...</div>
              ) : impact ? (
                <>
                  <div>
                    OSs afetadas: <strong>{impact.serviceOrders}</strong>
                  </div>
                  <div>
                    Inspeções afetadas: <strong>{impact.inspections}</strong>
                  </div>
                  <div>
                    Equipamentos afetados: <strong>{impact.equipment}</strong>
                  </div>
                  <div>
                    Equipes:{" "}
                    <strong>{impact.teamMemberships}</strong> participação(ões)
                    — serão removidas (não transferidas)
                  </div>
                </>
              ) : null}
            </div>

            <label className="mt-4 block">
              <span className="block text-sm font-medium text-gray-700">
                Transferir para:
              </span>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                disabled={isPending || eligibleTargets.length === 0}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
              >
                <option value="">Selecione um usuário...</option>
                {eligibleTargets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </label>

            {eligibleTargets.length === 0 && (
              <p className="mt-2 text-sm text-red-600">
                Nenhum usuário ativo com o mesmo papel disponível. Crie ou
                ative um antes de excluir este.
              </p>
            )}

            {error && (
              <div
                role="alert"
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || eligibleTargets.length === 0 || !targetId}
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 min-h-[44px]"
              >
                {isPending ? "Excluindo..." : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
