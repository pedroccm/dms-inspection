"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { importEquipmentToOrder } from "./import-action";
import { parseCSV, parseXLSXData, type EquipmentRow } from "./parse-equipment";

async function parseXLSXFile(buffer: ArrayBuffer): Promise<EquipmentRow[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: "",
  });
  return parseXLSXData(jsonData);
}

interface ImportEquipmentProps {
  orderId: string;
}

export function ImportEquipment({ orderId }: ImportEquipmentProps) {
  const [preview, setPreview] = useState<EquipmentRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setResult(null);
    setProgress(null);
    setFileName(file.name);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "csv" || ext === "txt") {
        const text = await file.text();
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setError(
            "Nenhum equipamento encontrado no arquivo. Verifique se a coluna 'copel_ra_code' existe."
          );
          setPreview(null);
          return;
        }
        setPreview(rows);
      } else if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        const rows = await parseXLSXFile(buffer);
        if (rows.length === 0) {
          setError(
            "Nenhum equipamento encontrado no arquivo. Verifique se a coluna 'copel_ra_code' existe."
          );
          setPreview(null);
          return;
        }
        setPreview(rows);
      } else {
        setError("Formato de arquivo não suportado. Use .xlsx, .xls, .csv ou .txt.");
        setPreview(null);
      }
    } catch {
      setError("Erro ao ler o arquivo. Verifique se o formato está correto.");
      setPreview(null);
    }
  }

  function handleImport() {
    if (!preview || preview.length === 0) return;

    setError("");
    setResult(null);

    startTransition(async () => {
      setProgress(`Importando 0 de ${preview.length} equipamentos...`);

      const importResult = await importEquipmentToOrder(orderId, preview);

      setProgress(null);
      setResult(importResult);

      if (importResult.imported > 0) {
        router.refresh();
      }
    });
  }

  function handleReset() {
    setPreview(null);
    setFileName("");
    setError("");
    setProgress(null);
    setResult(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Importar Equipamentos
      </h2>

      <p className="text-sm text-gray-500 mb-4">
        Importe uma lista de equipamentos a partir de um arquivo XLS, XLSX, CSV
        ou TXT. O arquivo deve conter a coluna <strong>copel_ra_code</strong>{" "}
        (obrigatória). Colunas opcionais: copel_control_code,
        mechanism_serial, control_box_serial, protection_relay_serial,
        manufacturer.
      </p>

      {/* Error message */}
      {error && (
        <div className="p-3 mb-4 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      {/* Result message */}
      {result && (
        <div
          className={`p-3 mb-4 rounded-lg text-sm ${
            result.errors.length > 0
              ? "bg-yellow-50 border border-yellow-200 text-yellow-700"
              : "bg-green-50 border border-green-200 text-green-700"
          }`}
        >
          <p className="font-medium mb-1">Resultado da importação:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>{result.imported} equipamento(s) importado(s)</li>
            <li>{result.skipped} equipamento(s) ignorado(s) (duplicados)</li>
            {result.errors.length > 0 && (
              <li>{result.errors.length} erro(s)</li>
            )}
          </ul>
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium">
                Ver erros
              </summary>
              <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Progress */}
      {progress && (
        <div className="p-3 mb-4 rounded-lg text-sm bg-blue-50 border border-blue-200 text-blue-700">
          {progress}
        </div>
      )}

      {/* File input */}
      {!preview && !result && (
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label
              htmlFor="import-file"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Arquivo de equipamentos
            </label>
            <input
              ref={fileRef}
              id="import-file"
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:text-sm file:font-semibold file:bg-[#F5A623] file:text-white
                hover:file:bg-[#E8941E] file:cursor-pointer file:min-h-[36px]"
            />
          </div>
        </div>
      )}

      {/* Preview table */}
      {preview && preview.length > 0 && !result && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-700">
              <strong>{preview.length}</strong> equipamento(s) encontrado(s) em{" "}
              <strong>{fileName}</strong>
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0">
                  <tr className="border-b border-gray-200 bg-[#1B2B5E]">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-white">
                      #
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-white">
                      Codigo Copel RA
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-white">
                      Cod. Controle
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-white">
                      Serial Mecanismo
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-white">
                      Serial Cx. Controle
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-white">
                      Serial Rele
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-white">
                      Fabricante
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 text-sm text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {row.copel_ra_code}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {row.copel_control_code || "\u2014"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {row.mechanism_serial || "\u2014"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {row.control_box_serial || "\u2014"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {row.protection_relay_serial || "\u2014"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {row.manufacturer || "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleImport}
              loading={isPending}
              disabled={isPending}
            >
              Confirmar Importacao
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* After import, allow new import */}
      {result && (
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={handleReset}>
            Importar Outro Arquivo
          </Button>
        </div>
      )}
    </div>
  );
}
