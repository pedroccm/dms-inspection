/**
 * QR Code parser for equipment nameplate data.
 * Parses key-value TXT content from QR codes into equipment fields.
 */

export interface EquipmentQRData {
  modelo: string;
  numero_serie_controle: string;
  numero_serie_tanque: string;
  marca: string;
  tipo: string;
  tensao_nominal: string;
  nbi: string;
  frequencia_nominal: string;
  corrente_nominal: string;
  capacidade_interrupcao: string;
  numero_fases: string;
  tipo_controle: string;
  modelo_controle: string;
  sensor_tensao: string;
  tc_interno: string;
  sequencia_operacao: string;
  meio_interrupcao: string;
  massa_interruptor: string;
  massa_caixa_controle: string;
  massa_total: string;
  norma_aplicavel: string;
  // Also map to existing Equipment fields when possible
  manufacturer: string;
  mechanism_serial: string;
  control_box_serial: string;
}

/**
 * Mapping from QR code label variations to our field names.
 * Each entry: [normalized label patterns, target field name]
 */
const FIELD_MAPPINGS: [RegExp, keyof EquipmentQRData][] = [
  [/^modelo$/i, "modelo"],
  [/^n[°º]\s*de\s*s[eé]rie\s*\(?\s*controle\s*\)?$/i, "numero_serie_controle"],
  [/^n[°º]\s*s[eé]rie\s*controle$/i, "numero_serie_controle"],
  [/^n[°º]\s*de\s*s[eé]rie\s*\(?\s*tanque\s*\)?$/i, "numero_serie_tanque"],
  [/^n[°º]\s*s[eé]rie\s*tanque$/i, "numero_serie_tanque"],
  [/^marca$/i, "marca"],
  [/^tipo$/i, "tipo"],
  [/^tens[aã]o\s*nominal$/i, "tensao_nominal"],
  [/^nbi$/i, "nbi"],
  [/^frequ[eê]ncia\s*nominal$/i, "frequencia_nominal"],
  [/^corrente\s*nominal$/i, "corrente_nominal"],
  [/^cap\.?\s*interrup[cç][aã]o$/i, "capacidade_interrupcao"],
  [/^capacidade\s*(de\s*)?interrup[cç][aã]o$/i, "capacidade_interrupcao"],
  [/^n[°º]\s*de\s*fases$/i, "numero_fases"],
  [/^n[°º]\s*fases$/i, "numero_fases"],
  [/^tipo\s*de\s*controle$/i, "tipo_controle"],
  [/^modelo\s*controle\s*eletr[oô]nico$/i, "modelo_controle"],
  [/^modelo\s*controle$/i, "modelo_controle"],
  [/^sensor\s*de\s*tens[aã]o$/i, "sensor_tensao"],
  [/^tc\s*interno$/i, "tc_interno"],
  [/^seq\.?\s*(de\s*)?opera[cç][aã]o$/i, "sequencia_operacao"],
  [/^sequ[eê]ncia\s*(de\s*)?opera[cç][aã]o$/i, "sequencia_operacao"],
  [/^meio\s*(de\s*)?interrup[cç][aã]o$/i, "meio_interrupcao"],
  [/^massa\s*do\s*interruptor$/i, "massa_interruptor"],
  [/^massa\s*(da\s*)?caixa\s*(de\s*)?controle$/i, "massa_caixa_controle"],
  [/^massa\s*total$/i, "massa_total"],
  [/^norma\s*aplic[aá]vel$/i, "norma_aplicavel"],
  // Also map to existing fields
  [/^fabricante$/i, "manufacturer"],
];

function matchField(label: string): keyof EquipmentQRData | null {
  const trimmed = label.trim();
  for (const [pattern, field] of FIELD_MAPPINGS) {
    if (pattern.test(trimmed)) {
      return field;
    }
  }
  return null;
}

/**
 * Parse QR code TXT content into equipment fields.
 * Supports key:value and key\tvalue formats, one pair per line.
 */
export function parseEquipmentQR(text: string): Partial<EquipmentQRData> {
  if (!text || typeof text !== "string") return {};

  const result: Partial<EquipmentQRData> = {};
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Try splitting by ":" first, then by tab
    let separatorIndex = trimmedLine.indexOf(":");
    if (separatorIndex === -1) {
      separatorIndex = trimmedLine.indexOf("\t");
    }

    if (separatorIndex === -1) continue;

    const label = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (!label || !value) continue;

    const field = matchField(label);
    if (field) {
      result[field] = value;
    }
  }

  // Cross-map: if "Marca" was found, also set manufacturer
  if (result.marca && !result.manufacturer) {
    result.manufacturer = result.marca;
  }

  // Cross-map serial numbers to existing fields if applicable
  if (result.numero_serie_controle && !result.control_box_serial) {
    result.control_box_serial = result.numero_serie_controle;
  }
  if (result.numero_serie_tanque && !result.mechanism_serial) {
    result.mechanism_serial = result.numero_serie_tanque;
  }

  return result;
}
