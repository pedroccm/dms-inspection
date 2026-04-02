"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createInspection } from "../actions";

interface NewInspectionFormProps {
  equipmentOptions: { value: string; label: string }[];
  serviceOrderOptions: {
    value: string;
    label: string;
    equipmentId: string | null;
  }[];
  preselectedEquipmentId?: string;
}

export function NewInspectionForm({
  equipmentOptions,
  serviceOrderOptions,
  preselectedEquipmentId,
}: NewInspectionFormProps) {
  const [state, formAction, pending] = useActionState(
    async (
      _prevState: {
        error: string;
        existingInspectionId?: string;
      } | null,
      formData: FormData
    ) => {
      const result = await createInspection(formData);
      return result ?? null;
    },
    null
  );

  return (
    <form
      action={formAction}
      className="bg-white rounded-lg shadow p-6 space-y-6"
    >
      {state?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {state.error}
          {state.existingInspectionId && (
            <Link
              href={`/dashboard/inspecoes/${state.existingInspectionId}`}
              className="ml-2 font-medium text-blue-600 hover:text-blue-700 underline"
            >
              Retomar inspecao existente
            </Link>
          )}
        </div>
      )}

      <Select
        label="Equipamento"
        name="equipment_id"
        required
        placeholder="Selecione um equipamento"
        defaultValue={preselectedEquipmentId ?? ""}
        options={equipmentOptions}
      />

      <Select
        label="Ordem de Servico"
        name="service_order_id"
        required
        placeholder="Selecione uma ordem de servico"
        options={serviceOrderOptions}
      />

      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" loading={pending}>
          {pending ? "Criando..." : "Iniciar Inspecao"}
        </Button>
        <Link href="/dashboard/inspecoes">
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
