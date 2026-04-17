"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/contexts/server-profile-context";
import { updateServiceOrder } from "../actions";
import type { InspectionLocation, Client, Contract } from "@/lib/types";

interface EditOrderButtonProps {
  orderId: string;
  orderStatus: string;
  current: {
    order_number: string | null;
    client_name: string;
    contract_name: string | null;
    location_id: string | null;
    assigned_to: string;
    start_date: string | null;
    client_request_date: string | null;
  };
  clients: Client[];
  contracts: Contract[];
  locations: InspectionLocation[];
  inspectors: { id: string; full_name: string }[];
  menuItem?: boolean;
}

export function EditOrderButton({
  orderId,
  orderStatus,
  current,
  clients,
  contracts,
  locations,
  inspectors,
  menuItem = false,
}: EditOrderButtonProps) {
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateServiceOrder(orderId, formData);
      if (result?.success) {
        setOpen(false);
        router.refresh();
      }
      return result ?? null;
    },
    null
  );

  // Only master may edit, and only when the order is open
  if (!isAdmin) return null;
  if (orderStatus !== "open") return null;

  const clientOptions = clients.map((c) => ({ value: c.name, label: c.name }));
  const contractOptions = [
    { value: "", label: "— sem contrato —" },
    ...contracts.map((c) => ({ value: c.name, label: c.name })),
  ];
  const locationOptions = [
    { value: "", label: "— sem local —" },
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];
  const inspectorOptions = inspectors.map((i) => ({
    value: i.id,
    label: i.full_name,
  }));

  if (!open) {
    if (menuItem) {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Editar
        </button>
      );
    }
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Editar
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6 my-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Ordem de Serviço</h3>

        {state?.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <Input
            label="O.S."
            name="order_number"
            required
            defaultValue={current.order_number ?? ""}
          />

          <Select
            label="Cliente"
            name="client_name"
            required
            options={clientOptions}
            defaultValue={current.client_name}
          />

          <Select
            label="Contrato"
            name="contract_name"
            options={contractOptions}
            defaultValue={current.contract_name ?? ""}
          />

          <Select
            label="Local da Inspeção"
            name="location_id"
            options={locationOptions}
            defaultValue={current.location_id ?? ""}
          />

          <Select
            label="Inspetor Responsável"
            name="assigned_to"
            required
            options={inspectorOptions}
            defaultValue={current.assigned_to}
          />

          <div>
            <label
              htmlFor="start_date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Data Início
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              defaultValue={current.start_date ?? ""}
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="client_request_date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Data de Solicitação do Cliente
            </label>
            <input
              type="date"
              id="client_request_date"
              name="client_request_date"
              defaultValue={current.client_request_date ?? ""}
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
