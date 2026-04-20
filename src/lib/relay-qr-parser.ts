/**
 * QR Code parser for relay (relé de proteção) nameplate data.
 *
 * Format: 6 blocks separated by "<br>", block 3 subdivided by ";".
 * Example:
 *   Ingeteam<br>DA3626/A<br>Vaux. 24-48Vdc;I ph 0.02-20A;I n 0.001-10A;V ph 0.03-8.6V;Vs/Vn 0.03-8.6V;Freq 50-60Hz<br>A23063000031<br>2025/03<br>6C:30:2A:FC:89:5E
 */

export interface RelayQRData {
  fabricante: string;
  modelo: string;
  tensao_auxiliar: string;
  range_i_fase: string;
  range_in: string;
  range_v_fase: string;
  range_vs_vn: string;
  frequencia: string;
  numero_serie: string;
  ano_mes_fabricacao: string;
  mac: string;
}

export const RELAY_FIELD_ORDER: { key: keyof RelayQRData; label: string }[] = [
  { key: "fabricante", label: "Fabricante do relé" },
  { key: "modelo", label: "Modelo do relé" },
  { key: "tensao_auxiliar", label: "Tensão auxiliar" },
  { key: "range_i_fase", label: "Range I fase" },
  { key: "range_in", label: "Range IN" },
  { key: "range_v_fase", label: "Range V fase" },
  { key: "range_vs_vn", label: "Range Vs/Vn" },
  { key: "frequencia", label: "Freq. Operação" },
  { key: "numero_serie", label: "Número de Série" },
  { key: "ano_mes_fabricacao", label: "Ano/Mês fabricação" },
  { key: "mac", label: "MAC" },
];

export function emptyRelayData(): RelayQRData {
  return {
    fabricante: "",
    modelo: "",
    tensao_auxiliar: "",
    range_i_fase: "",
    range_in: "",
    range_v_fase: "",
    range_vs_vn: "",
    frequencia: "",
    numero_serie: "",
    ano_mes_fabricacao: "",
    mac: "",
  };
}

/**
 * Parse relay QR code raw string into structured fields.
 * Returns empty fields for missing blocks — parser is tolerant to partial data.
 */
export function parseRelayQR(raw: string): RelayQRData {
  const data = emptyRelayData();
  if (!raw || typeof raw !== "string") return data;

  const blocks = raw.split(/<br\s*\/?>/i).map((b) => b.trim());

  if (blocks[0]) data.fabricante = blocks[0];
  if (blocks[1]) data.modelo = blocks[1];

  if (blocks[2]) {
    const params = blocks[2].split(";").map((p) => p.trim());
    if (params[0]) data.tensao_auxiliar = params[0];
    if (params[1]) data.range_i_fase = params[1];
    if (params[2]) data.range_in = params[2];
    if (params[3]) data.range_v_fase = params[3];
    if (params[4]) data.range_vs_vn = params[4];
    if (params[5]) data.frequencia = params[5];
  }

  if (blocks[3]) data.numero_serie = blocks[3];
  if (blocks[4]) data.ano_mes_fabricacao = blocks[4];
  if (blocks[5]) data.mac = blocks[5];

  return data;
}
