"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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

interface BatchRow {
  numero_052r: string;
  numero_300: string;
}

const MAX_EQUIPMENT = 50;

function emptyBatchRow(): BatchRow {
  return { numero_052r: "", numero_300: "" };
}

async function parseBatchFile(file: File): Promise<BatchRow[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "txt") {
    const text = await file.text();
    return parseBatchCSV(text);
  }
  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    });
    return parseBatchAOA(aoa);
  }
  throw new Error("Formato de arquivo não suportado. Use .xlsx, .xls, .csv ou .txt.");
}

function parseBatchCSV(text: string): BatchRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
  const aoa = lines.map((l) => l.split(sep));
  return parseBatchAOA(aoa);
}

function parseBatchAOA(aoa: unknown[][]): BatchRow[] {
  const rows: BatchRow[] = [];
  for (const raw of aoa) {
    const cells = (raw ?? []).map((c) => String(c ?? "").trim());
    const first = cells[0] ?? "";
    const second = cells[1] ?? "";
    // Skip empty rows and header rows (no digits in first cell means it's a label/empty).
    if (!first || !/\d/.test(first)) continue;
    rows.push({ numero_052r: first, numero_300: second });
  }
  return rows;
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
  const [batchRows, setBatchRows] = useState<BatchRow[]>([emptyBatchRow()]);
  const [importError, setImportError] = useState("");
  const [importInfo, setImportInfo] = useState("");
  const [locationId, setLocationId] = useState("");
  const [clientName, setClientName] = useState("");
  const [contractName, setContractName] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);

  // Keep batchRows length in sync with the quantity field.
  // Preserves existing values; pads with empty rows on grow, truncates on shrink.
  useEffect(() => {
    setBatchRows((prev) => {
      if (prev.length === equipmentCount) return prev;
      if (equipmentCount === 0) return [];
      if (equipmentCount < prev.length) return prev.slice(0, equipmentCount);
      const next = [...prev];
      while (next.length < equipmentCount) next.push(emptyBatchRow());
      return next;
    });
  }, [equipmentCount]);

  function updateBatchField(
    index: number,
    field: keyof BatchRow,
    value: string
  ) {
    setBatchRows((prev) => {
      const next = [...prev];
      next[index] = { ...(next[index] ?? emptyBatchRow()), [field]: value };
      return next;
    });
  }

  function handleImportClick() {
    setImportError("");
    setImportInfo("");
    importFileRef.current?.click();
  }

  async function handleImportFile(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportInfo("");
    try {
      const parsed = await parseBatchFile(file);
      if (parsed.length === 0) {
        setImportError(
          "Nenhum equipamento encontrado. A planilha deve ter o número 052R na coluna A e o número 300 na coluna B."
        );
        return;
      }
      const capped = parsed.slice(0, MAX_EQUIPMENT);
      setEquipmentCount(capped.length);
      setBatchRows(capped);
      const overflowMsg =
        parsed.length > MAX_EQUIPMENT
          ? ` (limite de ${MAX_EQUIPMENT}; ${parsed.length - MAX_EQUIPMENT} linha(s) descartada(s))`
          : "";
      setImportInfo(
        `${capped.length} equipamento(s) importado(s) de "${file.name}"${overflowMsg}.`
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao ler a planilha.";
      setImportError(msg);
    } finally {
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }

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
                setEquipmentCount(
                  isNaN(val) || val < 1
                    ? raw === ""
                      ? 0
                      : 1
                    : val > MAX_EQUIPMENT
                      ? MAX_EQUIPMENT
                      : val
                );
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
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">
              Números do Lote ({equipmentCount}{" "}
              {equipmentCount === 1 ? "equipamento" : "equipamentos"})
            </h3>
            <button
              type="button"
              onClick={handleImportClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1B2B5E] bg-[#E8EDF8] rounded-lg hover:bg-[#D5DDF0] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
                />
              </svg>
              Importar
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          <p className="text-xs text-gray-500 mb-3">
            Planilha com duas colunas: número 052R na coluna A e número 300 na
            coluna B (cabeçalho opcional).
          </p>

          {importError && (
            <div className="p-3 mb-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-700">
              {importError}
            </div>
          )}
          {importInfo && (
            <div className="p-3 mb-3 rounded-lg text-xs bg-green-50 border border-green-200 text-green-700">
              {importInfo}
            </div>
          )}

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
                    value={batchRows[i]?.numero_052r ?? ""}
                    onChange={(e) =>
                      updateBatchField(i, "numero_052r", e.target.value)
                    }
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name={`numero_300_${i}`}
                    required
                    placeholder="300-XXXXX"
                    value={batchRows[i]?.numero_300 ?? ""}
                    onChange={(e) =>
                      updateBatchField(i, "numero_300", e.target.value)
                    }
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
