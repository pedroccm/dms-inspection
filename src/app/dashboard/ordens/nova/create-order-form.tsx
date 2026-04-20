"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createServiceOrder } from "../actions";
import type { InspectionLocation, Client, Contract } from "@/lib/types";

interface CreateOrderFormProps {
  inspectors: { id: string; full_name: string }[];
  locations: InspectionLocation[];
  clients: Client[];
  contracts: Contract[];
  nextOrderNumber: string;
}

export function CreateOrderForm({
  inspectors,
  locations,
  clients,
  contracts,
  nextOrderNumber,
}: CreateOrderFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prevState: { error: string } | null, formData: FormData) => {
      const result = await createServiceOrder(formData);
      return result ?? null;
    },
    null
  );

  const [equipmentCount, setEquipmentCount] = useState(1);
  const [locationId, setLocationId] = useState("");
  const [clientName, setClientName] = useState("");
  const [contractName, setContractName] = useState("");

  const inspectorOptions = inspectors.map((i) => ({
    value: i.id,
    label: i.full_name,
  }));

  const locationOptions = [
    ...locations.map((l) => ({ value: l.id, label: l.name })),
    { value: "__new__", label: "+ Novo Local" },
  ];

  const clientOptions = [
    ...clients.map((c) => ({ value: c.name, label: c.name })),
    { value: "__new__", label: "+ Novo Cliente" },
  ];

  const contractOptions = [
    ...contracts.map((c) => ({ value: c.name, label: c.name })),
    { value: "__new__", label: "+ Novo Contrato" },
  ];

  return (
    <form action={formAction} className="bg-white rounded-lg shadow p-6 space-y-6">
      {state?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Editable order number (defaults to auto-generated suggestion) */}
      <Input
        label="O.S."
        name="order_number"
        required
        defaultValue={nextOrderNumber}
        placeholder="Número da Ordem de Serviço"
      />

      <Select
        label="Cliente"
        name="client_name"
        required
        placeholder="Selecione o cliente"
        options={clientOptions}
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
      />

      {clientName === "__new__" && (
        <Input
          label="Nome do Novo Cliente"
          name="new_client_name"
          required
          placeholder="Digite o nome do novo cliente"
        />
      )}

      <Select
        label="Contrato"
        name="contract_name"
        placeholder="Selecione o contrato"
        options={contractOptions}
        value={contractName}
        onChange={(e) => setContractName(e.target.value)}
      />

      {contractName === "__new__" && (
        <Input
          label="Nome do Novo Contrato"
          name="new_contract_name"
          required
          placeholder="Digite o nome do novo contrato"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="w-full">
          <div className="w-full">
            <label htmlFor="equipment_count" className="block text-sm font-medium text-gray-700 mb-1">
              Quantidade de Equipamentos<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="equipment_count"
              name="equipment_count"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              value={equipmentCount}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                const val = parseInt(raw, 10);
                setEquipmentCount(isNaN(val) || val < 1 ? (raw === "" ? 0 : 1) : val > 50 ? 50 : val);
              }}
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 transition-colors focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
            />
          </div>
        </div>

        <div className="w-full">
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
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 transition-colors focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="w-full">
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
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 transition-colors focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
          />
        </div>

        <div className="w-full">
          <Select
            label="Local da Inspeção"
            name="location_id"
            placeholder="Selecione o local da inspeção"
            options={locationOptions}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          />
        </div>
      </div>

      {locationId === "__new__" && (
        <Input
          label="Nome do Novo Local"
          name="new_location_name"
          required
          placeholder="Digite o nome do novo local"
        />
      )}

      <Select
        label="Inspetor Responsável"
        name="assigned_to"
        required
        placeholder="Selecione o inspetor"
        options={inspectorOptions}
      />

      {/* Batch Numbers Section */}
      {equipmentCount > 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Números do Lote ({equipmentCount} {equipmentCount === 1 ? "equipamento" : "equipamentos"})
          </h3>
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center">
              <div className="w-8 text-center text-xs font-medium text-gray-500">#</div>
              <div className="text-xs font-medium text-gray-500">Mecanismo</div>
              <div className="text-xs font-medium text-gray-500">Controle</div>
            </div>
            {/* Rows */}
            {Array.from({ length: equipmentCount }, (_, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center">
                <div className="w-8 text-center text-sm font-medium text-gray-400">
                  {i + 1}
                </div>
                <div>
                  <input
                    type="text"
                    name={`numero_052r_${i}`}
                    required
                    placeholder="052R-XXXXX"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name={`numero_300_${i}`}
                    required
                    placeholder="300-XXXXX"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
