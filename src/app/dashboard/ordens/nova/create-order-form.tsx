"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createServiceOrder } from "../actions";

interface CreateOrderFormProps {
  inspectors: { id: string; full_name: string }[];
}

export function CreateOrderForm({ inspectors }: CreateOrderFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prevState: { error: string } | null, formData: FormData) => {
      const result = await createServiceOrder(formData);
      return result ?? null;
    },
    null
  );

  const inspectorOptions = inspectors.map((i) => ({
    value: i.id,
    label: i.full_name,
  }));

  return (
    <form action={formAction} className="bg-white rounded-lg shadow p-6 space-y-6">
      {state?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {state.error}
        </div>
      )}

      <Input
        label="Titulo"
        name="title"
        required
        placeholder="Digite o titulo da ordem de servico"
      />

      <Input
        label="Nome do Cliente"
        name="client_name"
        required
        placeholder="Digite o nome do cliente"
      />

      <Input
        label="Localizacao"
        name="location"
        placeholder="Digite a localizacao (opcional)"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="w-full">
          <label
            htmlFor="start_date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Data Inicio
          </label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 transition-colors focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
          />
        </div>

        <div className="w-full">
          <label
            htmlFor="end_date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Data Fim
          </label>
          <input
            type="date"
            id="end_date"
            name="end_date"
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 transition-colors focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
          />
        </div>
      </div>

      <Select
        label="Inspetor Responsavel"
        name="assigned_to"
        required
        placeholder="Selecione o inspetor"
        options={inspectorOptions}
      />

      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" loading={pending}>
          {pending ? "Criando..." : "Criar Ordem"}
        </Button>
        <Link href="/dashboard/ordens">
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
