import { describe, it, expect } from "vitest";
import { parseEquipmentQR, QR_FIELD_ORDER } from "@/lib/qr-parser";

const SAMPLE_16_LINES = `RA
15,5kV
630A
3F
AUT
12,5kA
125kV
600:1
2223:1
O-0,25s-CO-2s-CO-5s-CO
Arteche
smART RC PLUS
23021833051
23021833051
145kg
47kg`;

describe("parseEquipmentQR", () => {
  it("parses a complete 16-line QR code by position", () => {
    const result = parseEquipmentQR(SAMPLE_16_LINES);

    expect(result.tipo).toBe("RA");
    expect(result.tensao_nominal).toBe("15,5kV");
    expect(result.corrente_nominal).toBe("630A");
    expect(result.numero_fases).toBe("3F");
    expect(result.tipo_controle).toBe("AUT");
    expect(result.capacidade_interrupcao).toBe("12,5kA");
    expect(result.nbi).toBe("125kV");
    expect(result.tc_interno).toBe("600:1");
    expect(result.sensor_tensao).toBe("2223:1");
    expect(result.sequencia_operacao).toBe("O-0,25s-CO-2s-CO-5s-CO");
    expect(result.marca).toBe("Arteche");
    expect(result.modelo).toBe("smART RC PLUS");
    expect(result.numero_serie_controle).toBe("23021833051");
    expect(result.numero_serie_tanque).toBe("23021833051");
    expect(result.massa_interruptor).toBe("145kg");
    expect(result.massa_caixa_controle).toBe("47kg");
  });

  it("removes TEXT suffix from line 16 (massa_caixa_controle)", () => {
    const lines = SAMPLE_16_LINES.replace("47kg", "47kgTEXT");
    const result = parseEquipmentQR(lines);
    expect(result.massa_caixa_controle).toBe("47kg");
  });

  it("removes TEXT suffix with space before TEXT on line 16", () => {
    const lines = SAMPLE_16_LINES.replace("47kg", "47kg TEXT");
    const result = parseEquipmentQR(lines);
    expect(result.massa_caixa_controle).toBe("47kg");
  });

  it("handles fewer than 16 lines (partial data)", () => {
    const partial = `RA
15,5kV
630A`;
    const result = parseEquipmentQR(partial);

    expect(Object.keys(result)).toHaveLength(3);
    expect(result.tipo).toBe("RA");
    expect(result.tensao_nominal).toBe("15,5kV");
    expect(result.corrente_nominal).toBe("630A");
    expect(result.numero_fases).toBeUndefined();
  });

  it("returns empty object for empty string", () => {
    expect(parseEquipmentQR("")).toEqual({});
  });

  it("returns empty object for null/undefined input", () => {
    expect(parseEquipmentQR(null as unknown as string)).toEqual({});
    expect(parseEquipmentQR(undefined as unknown as string)).toEqual({});
  });

  it("handles extra whitespace and blank lines", () => {
    const withBlanks = `  RA

  15,5kV
  630A  `;
    const result = parseEquipmentQR(withBlanks);

    expect(result.tipo).toBe("RA");
    expect(result.tensao_nominal).toBe("15,5kV");
    expect(result.corrente_nominal).toBe("630A");
    // blank lines are filtered out, so only 3 non-empty lines
    expect(Object.keys(result)).toHaveLength(3);
  });

  it("handles Windows-style CRLF line endings", () => {
    const crlf = "RA\r\n15,5kV\r\n630A";
    const result = parseEquipmentQR(crlf);
    expect(result.tipo).toBe("RA");
    expect(result.tensao_nominal).toBe("15,5kV");
    expect(result.corrente_nominal).toBe("630A");
  });

  it("does not parse more than 16 fields even with extra lines", () => {
    const extra = SAMPLE_16_LINES + "\nExtra Line\nAnother Extra";
    const result = parseEquipmentQR(extra);
    expect(Object.keys(result)).toHaveLength(16);
    expect(result).not.toHaveProperty("Extra Line");
  });

  it("exports QR_FIELD_ORDER with 16 entries", () => {
    expect(QR_FIELD_ORDER).toHaveLength(16);
    expect(QR_FIELD_ORDER[0].key).toBe("tipo");
    expect(QR_FIELD_ORDER[0].label).toBe("Tipo");
    expect(QR_FIELD_ORDER[15].key).toBe("massa_caixa_controle");
    expect(QR_FIELD_ORDER[15].label).toBe("Massa Cx. Controle");
  });
});
