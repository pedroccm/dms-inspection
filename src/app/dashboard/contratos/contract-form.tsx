"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createContractAction } from "./actions";

export function ContractForm() {
  const [state, formAction, pending] = useActionState(
    async (_prevState: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createContractAction(formData);
      return result ?? null;
    },
    null
  );

  return (
    <form action={formAction} className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Novo Contrato</h2>

      {state?.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Contrato criado com sucesso.
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Input
            label="Nome do Contrato"
            name="name"
            required
            placeholder="Digite o nome do contrato"
          />
        </div>
        <Button type="submit" loading={pending}>
          {pending ? "Salvando..." : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}
