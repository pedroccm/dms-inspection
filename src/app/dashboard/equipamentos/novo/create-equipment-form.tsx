"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QRScanner } from "@/components/qr-scanner";
import { createEquipment } from "../actions";
import { QR_FIELD_ORDER } from "@/lib/qr-parser";

export function CreateEquipmentForm() {
  const [qrFields, setQrFields] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of QR_FIELD_ORDER) {
      initial[f.key] = "";
    }
    return initial;
  });
  const [qrRaw, setQrRaw] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prevState: { error: string } | null, formData: FormData) => {
      const result = await createEquipment(formData);
      return result ?? null;
    },
    null
  );

  const handleQrScan = (data: Record<string, string>, raw: string) => {
    setQrFields((prev) => {
      const next = { ...prev };
      for (const field of QR_FIELD_ORDER) {
        if (data[field.key]) {
          next[field.key] = data[field.key];
        }
      }
      return next;
    });
    setQrRaw(raw);
    if (Object.keys(data).length > 0) {
      setShowTechnical(true);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setQrFields((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form action={formAction} className="bg-white rounded-lg shadow p-6 space-y-6">
      {state?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* QR Code Scanner */}
      <div className="pb-2">
        <QRScanner onScan={handleQrScan} />
        {qrRaw && (
          <p className="mt-2 text-sm text-green-600 font-medium">
            QR Code lido com sucesso. Campos preenchidos automaticamente.
          </p>
        )}
      </div>

      {/* Required fields */}
      <Input
        label="Código Copel do RA (Mecanismo)"
        name="copel_ra_code"
        required
        placeholder="Digite o código Copel do RA"
      />

      <Input
        label="Código Copel do Controle"
        name="copel_control_code"
        required
        placeholder="Digite o código Copel do Controle"
      />

      <Input
        label="Número de Série do Mecanismo"
        name="mechanism_serial"
        required
        defaultValue={qrFields.numero_serie_tanque}
        key={`mechanism_serial-${qrFields.numero_serie_tanque}`}
        placeholder="Digite o número de série do mecanismo"
      />

      <Input
        label="Número de Série da Caixa de Controle"
        name="control_box_serial"
        required
        defaultValue={qrFields.numero_serie_controle}
        key={`control_box_serial-${qrFields.numero_serie_controle}`}
        placeholder="Digite o número de série da caixa de controle"
      />

      <Input
        label="Número de Série do Relé de Proteção"
        name="protection_relay_serial"
        required
        placeholder="Digite o número de série do relé de proteção"
      />

      <Input
        label="Fabricante do Religador"
        name="manufacturer"
        required
        defaultValue={qrFields.marca}
        key={`manufacturer-${qrFields.marca}`}
        placeholder="Digite o fabricante do religador"
      />

      {/* Collapsible Technical Data Section */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTechnical(!showTechnical)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <span className="text-sm font-semibold text-gray-700">
            Dados Técnicos
          </span>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showTechnical ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showTechnical && (
          <div className="p-4 space-y-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">
              Estes campos são opcionais e podem ser preenchidos automaticamente via QR Code.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {QR_FIELD_ORDER.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={`eq-${field.key}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {field.label}
                  </label>
                  <input
                    id={`eq-${field.key}`}
                    type="text"
                    name={field.key}
                    value={qrFields[field.key] ?? ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
                    placeholder={field.label}
                  />
                </div>
              ))}
            </div>

            {/* Hidden field for raw QR code data */}
            <input type="hidden" name="qr_code_raw" value={qrRaw} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" loading={pending}>
          {pending ? "Cadastrando..." : "Cadastrar"}
        </Button>
        <Link href="/dashboard/equipamentos">
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
