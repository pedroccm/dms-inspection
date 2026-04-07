/**
 * QR Code parser for equipment nameplate data.
 * Positional parser: QR codes contain 16 lines in fixed order, no keys.
 */

export const QR_FIELD_ORDER = [
  { key: "tipo", label: "Tipo" },
  { key: "tensao_nominal", label: "Tensão Nominal" },
  { key: "corrente_nominal", label: "Corrente Nominal" },
  { key: "numero_fases", label: "Nº de Fases" },
  { key: "tipo_controle", label: "Tipo de Controle" },
  { key: "capacidade_interrupcao", label: "Cap. de Interrupção" },
  { key: "nbi", label: "NBI" },
  { key: "tc_interno", label: "TC Interno" },
  { key: "sensor_tensao", label: "Sensor de Tensão" },
  { key: "sequencia_operacao", label: "Seq. de Operação" },
  { key: "marca", label: "Marca" },
  { key: "modelo", label: "Modelo" },
  { key: "numero_serie_controle", label: "Nº Série (Controle)" },
  { key: "numero_serie_tanque", label: "Nº Série (Tanque)" },
  { key: "massa_interruptor", label: "Massa Interruptor" },
  { key: "massa_caixa_controle", label: "Massa Cx. Controle" },
] as const;

export type QRFieldKey = (typeof QR_FIELD_ORDER)[number]["key"];

/**
 * Parse QR code positional content into equipment fields.
 * Each line maps to a fixed field by position (1-16).
 * Line 16 may have a "TEXT" suffix that is discarded.
 */
export function parseEquipmentQR(raw: string): Record<string, string> {
  if (!raw || typeof raw !== "string") return {};

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result: Record<string, string> = {};

  for (let i = 0; i < Math.min(lines.length, QR_FIELD_ORDER.length); i++) {
    let value = lines[i];
    // Line 16 (index 15): discard "TEXT" suffix
    if (i === 15 && value.endsWith("TEXT")) {
      value = value.replace(/TEXT$/, "").trim();
    }
    result[QR_FIELD_ORDER[i].key] = value;
  }

  return result;
}
