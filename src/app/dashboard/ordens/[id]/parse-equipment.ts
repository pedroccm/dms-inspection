/**
 * Equipment file parsing utilities.
 * CSV/TXT parsing is done here (no external deps).
 * XLSX parsing is in import-equipment.tsx (requires xlsx package).
 */

export interface EquipmentRow {
  copel_ra_code: string;
  copel_control_code: string;
  mechanism_serial: string;
  control_box_serial: string;
  protection_relay_serial: string;
  manufacturer: string;
}

// Column name mapping: allow variations in headers
const COLUMN_MAP: Record<string, keyof EquipmentRow> = {
  copel_ra_code: "copel_ra_code",
  codigo_copel_ra: "copel_ra_code",
  "código copel ra": "copel_ra_code",
  copel_control_code: "copel_control_code",
  codigo_controle_copel: "copel_control_code",
  "código controle copel": "copel_control_code",
  mechanism_serial: "mechanism_serial",
  serial_mecanismo: "mechanism_serial",
  "serial mecanismo": "mechanism_serial",
  control_box_serial: "control_box_serial",
  serial_caixa_controle: "control_box_serial",
  "serial caixa controle": "control_box_serial",
  protection_relay_serial: "protection_relay_serial",
  serial_rele_protecao: "protection_relay_serial",
  "serial relé proteção": "protection_relay_serial",
  manufacturer: "manufacturer",
  fabricante: "manufacturer",
};

export function normalizeHeader(header: string): keyof EquipmentRow | null {
  const key = header.trim().toLowerCase().replace(/[_\s]+/g, "_");
  // Try exact match
  if (COLUMN_MAP[key]) return COLUMN_MAP[key];
  // Try with spaces instead of underscores
  const spaced = key.replace(/_/g, " ");
  if (COLUMN_MAP[spaced]) return COLUMN_MAP[spaced];
  return null;
}

function emptyRow(): EquipmentRow {
  return {
    copel_ra_code: "",
    copel_control_code: "",
    mechanism_serial: "",
    control_box_serial: "",
    protection_relay_serial: "",
    manufacturer: "",
  };
}

export function parseCSV(text: string): EquipmentRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect separator: tab or comma
  const separator = lines[0].includes("\t") ? "\t" : ",";
  const rawHeaders = lines[0].split(separator);
  const headerMap: (keyof EquipmentRow | null)[] = rawHeaders.map(normalizeHeader);

  // Validate that copel_ra_code is present
  if (!headerMap.includes("copel_ra_code")) return [];

  const rows: EquipmentRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(separator);
    const row = emptyRow();
    headerMap.forEach((field, idx) => {
      if (field && cols[idx] !== undefined) {
        row[field] = cols[idx].trim();
      }
    });
    if (row.copel_ra_code) {
      rows.push(row);
    }
  }
  return rows;
}

export function parseXLSXData(
  jsonData: Record<string, unknown>[]
): EquipmentRow[] {
  if (jsonData.length === 0) return [];

  // Map headers
  const rawHeaders = Object.keys(jsonData[0]);
  const headerMap: Record<string, keyof EquipmentRow | null> = {};
  rawHeaders.forEach((h) => {
    headerMap[h] = normalizeHeader(h);
  });

  // Validate copel_ra_code column exists
  const hasRequired = Object.values(headerMap).includes("copel_ra_code");
  if (!hasRequired) return [];

  const rows: EquipmentRow[] = [];
  for (const item of jsonData) {
    const row = emptyRow();
    for (const [rawKey, field] of Object.entries(headerMap)) {
      if (field && item[rawKey] !== undefined) {
        row[field] = String(item[rawKey]).trim();
      }
    }
    if (row.copel_ra_code) {
      rows.push(row);
    }
  }
  return rows;
}
