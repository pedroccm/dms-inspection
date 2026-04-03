"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QRScanner } from "@/components/qr-scanner";
import { createEquipment } from "../actions";
import type { EquipmentQRData } from "@/lib/qr-parser";

export function CreateEquipmentForm() {
  const [qrData, setQrData] = useState<Partial<EquipmentQRData>>({});
  const [qrRaw, setQrRaw] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prevState: { error: string } | null, formData: FormData) => {
      const result = await createEquipment(formData);
      return result ?? null;
    },
    null
  );

  const handleQrScan = (data: Partial<EquipmentQRData>, raw: string) => {
    setQrData(data);
    setQrRaw(raw);
    // Expand technical section when QR data arrives
    if (Object.keys(data).length > 0) {
      setShowTechnical(true);
    }
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
        defaultValue={qrData.mechanism_serial ?? ""}
        key={`mechanism_serial-${qrData.mechanism_serial ?? ""}`}
        placeholder="Digite o número de série do mecanismo"
      />

      <Input
        label="Número de Série da Caixa de Controle"
        name="control_box_serial"
        required
        defaultValue={qrData.control_box_serial ?? ""}
        key={`control_box_serial-${qrData.control_box_serial ?? ""}`}
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
        defaultValue={qrData.manufacturer ?? ""}
        key={`manufacturer-${qrData.manufacturer ?? ""}`}
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
              <Input
                label="Modelo"
                name="modelo"
                defaultValue={qrData.modelo ?? ""}
                key={`modelo-${qrData.modelo ?? ""}`}
                placeholder="Ex.: smART RC PLUS"
              />
              <Input
                label="Marca"
                name="marca"
                defaultValue={qrData.marca ?? ""}
                key={`marca-${qrData.marca ?? ""}`}
                placeholder="Ex.: Arteche"
              />
              <Input
                label="Tipo"
                name="tipo"
                defaultValue={qrData.tipo ?? ""}
                key={`tipo-${qrData.tipo ?? ""}`}
                placeholder="Ex.: Religador Automatico"
              />
              <Input
                label="Nº Série do Controle"
                name="numero_serie_controle"
                defaultValue={qrData.numero_serie_controle ?? ""}
                key={`numero_serie_controle-${qrData.numero_serie_controle ?? ""}`}
              />
              <Input
                label="Nº Série do Tanque"
                name="numero_serie_tanque"
                defaultValue={qrData.numero_serie_tanque ?? ""}
                key={`numero_serie_tanque-${qrData.numero_serie_tanque ?? ""}`}
              />
              <Input
                label="Tensão Nominal"
                name="tensao_nominal"
                defaultValue={qrData.tensao_nominal ?? ""}
                key={`tensao_nominal-${qrData.tensao_nominal ?? ""}`}
                placeholder="Ex.: 15,5 kV"
              />
              <Input
                label="NBI"
                name="nbi"
                defaultValue={qrData.nbi ?? ""}
                key={`nbi-${qrData.nbi ?? ""}`}
                placeholder="Ex.: 125 kV"
              />
              <Input
                label="Frequência Nominal"
                name="frequencia_nominal"
                defaultValue={qrData.frequencia_nominal ?? ""}
                key={`frequencia_nominal-${qrData.frequencia_nominal ?? ""}`}
                placeholder="Ex.: 60 Hz"
              />
              <Input
                label="Corrente Nominal"
                name="corrente_nominal"
                defaultValue={qrData.corrente_nominal ?? ""}
                key={`corrente_nominal-${qrData.corrente_nominal ?? ""}`}
                placeholder="Ex.: 630 A"
              />
              <Input
                label="Capacidade de Interrupção"
                name="capacidade_interrupcao"
                defaultValue={qrData.capacidade_interrupcao ?? ""}
                key={`capacidade_interrupcao-${qrData.capacidade_interrupcao ?? ""}`}
                placeholder="Ex.: 12,5 kA"
              />
              <Input
                label="Nº de Fases"
                name="numero_fases"
                defaultValue={qrData.numero_fases ?? ""}
                key={`numero_fases-${qrData.numero_fases ?? ""}`}
                placeholder="Ex.: 3"
              />
              <Input
                label="Tipo de Controle"
                name="tipo_controle"
                defaultValue={qrData.tipo_controle ?? ""}
                key={`tipo_controle-${qrData.tipo_controle ?? ""}`}
                placeholder="Ex.: Automatico"
              />
              <Input
                label="Modelo Controle Eletrônico"
                name="modelo_controle"
                defaultValue={qrData.modelo_controle ?? ""}
                key={`modelo_controle-${qrData.modelo_controle ?? ""}`}
                placeholder="Ex.: adaTECH RC"
              />
              <Input
                label="Sensor de Tensão"
                name="sensor_tensao"
                defaultValue={qrData.sensor_tensao ?? ""}
                key={`sensor_tensao-${qrData.sensor_tensao ?? ""}`}
                placeholder="Ex.: 2223:1"
              />
              <Input
                label="TC Interno"
                name="tc_interno"
                defaultValue={qrData.tc_interno ?? ""}
                key={`tc_interno-${qrData.tc_interno ?? ""}`}
                placeholder="Ex.: 600:1"
              />
              <Input
                label="Sequência de Operação"
                name="sequencia_operacao"
                defaultValue={qrData.sequencia_operacao ?? ""}
                key={`sequencia_operacao-${qrData.sequencia_operacao ?? ""}`}
                placeholder="Ex.: O-0,25s-CO-2s-CO-5s-CO"
              />
              <Input
                label="Meio de Interrupção"
                name="meio_interrupcao"
                defaultValue={qrData.meio_interrupcao ?? ""}
                key={`meio_interrupcao-${qrData.meio_interrupcao ?? ""}`}
                placeholder="Ex.: Vacuo"
              />
              <Input
                label="Massa do Interruptor"
                name="massa_interruptor"
                defaultValue={qrData.massa_interruptor ?? ""}
                key={`massa_interruptor-${qrData.massa_interruptor ?? ""}`}
                placeholder="Ex.: 145 kg"
              />
              <Input
                label="Massa da Caixa de Controle"
                name="massa_caixa_controle"
                defaultValue={qrData.massa_caixa_controle ?? ""}
                key={`massa_caixa_controle-${qrData.massa_caixa_controle ?? ""}`}
                placeholder="Ex.: 47 kg"
              />
              <Input
                label="Massa Total"
                name="massa_total"
                defaultValue={qrData.massa_total ?? ""}
                key={`massa_total-${qrData.massa_total ?? ""}`}
                placeholder="Ex.: 192 kg"
              />
              <Input
                label="Norma Aplicável"
                name="norma_aplicavel"
                defaultValue={qrData.norma_aplicavel ?? ""}
                key={`norma_aplicavel-${qrData.norma_aplicavel ?? ""}`}
                placeholder="Ex.: ANSI/IEEE C37.60"
              />
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
