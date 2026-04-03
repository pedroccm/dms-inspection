import { describe, it, expect } from "vitest";
import { parseEquipmentQR } from "@/lib/qr-parser";

const SAMPLE_QR_TEXT = `Modelo: smART RC PLUS
N° de Série (Controle): 23021833051
N° de Série (Tanque): 23012833051
Marca: Arteche
Tipo: Religador Automático
Tensão Nominal: 15,5 kV
NBI: 125 kV
Frequência Nominal: 60 Hz
Corrente Nominal: 630 A
Cap. Interrupção: 12,5 kA
N° de Fases: 3
Tipo de Controle: Automático
Modelo Controle Eletrônico: adaTECH RC
Sensor de Tensão: 2223:1
TC Interno: 600:1
Seq. de Operação: O-0,25s-CO-2s-CO-5s-CO
Meio de Interrupção: Vácuo
Massa do Interruptor: 145 kg
Massa da Caixa de Controle: 47 kg
Massa Total: 192 kg
Norma Aplicável: ANSI/IEEE C37.60`;

describe("parseEquipmentQR", () => {
  it("parses a complete QR code TXT content", () => {
    const result = parseEquipmentQR(SAMPLE_QR_TEXT);

    expect(result.modelo).toBe("smART RC PLUS");
    expect(result.numero_serie_controle).toBe("23021833051");
    expect(result.numero_serie_tanque).toBe("23012833051");
    expect(result.marca).toBe("Arteche");
    expect(result.tipo).toBe("Religador Automático");
    expect(result.tensao_nominal).toBe("15,5 kV");
    expect(result.nbi).toBe("125 kV");
    expect(result.frequencia_nominal).toBe("60 Hz");
    expect(result.corrente_nominal).toBe("630 A");
    expect(result.capacidade_interrupcao).toBe("12,5 kA");
    expect(result.numero_fases).toBe("3");
    expect(result.tipo_controle).toBe("Automático");
    expect(result.modelo_controle).toBe("adaTECH RC");
    expect(result.meio_interrupcao).toBe("Vácuo");
    expect(result.massa_interruptor).toBe("145 kg");
    expect(result.massa_caixa_controle).toBe("47 kg");
    expect(result.massa_total).toBe("192 kg");
    expect(result.norma_aplicavel).toBe("ANSI/IEEE C37.60");
  });

  it("handles Sensor de Tensão with colon in value", () => {
    const text = "Sensor de Tensão: 2223:1";
    const result = parseEquipmentQR(text);
    // The first colon is the separator; the value includes the rest
    expect(result.sensor_tensao).toBe("2223:1");
  });

  it("handles TC Interno with colon in value", () => {
    const text = "TC Interno: 600:1";
    const result = parseEquipmentQR(text);
    expect(result.tc_interno).toBe("600:1");
  });

  it("handles Seq. de Operação with complex value", () => {
    const text = "Seq. de Operação: O-0,25s-CO-2s-CO-5s-CO";
    const result = parseEquipmentQR(text);
    expect(result.sequencia_operacao).toBe("O-0,25s-CO-2s-CO-5s-CO");
  });

  it("cross-maps Marca to manufacturer", () => {
    const text = "Marca: Arteche";
    const result = parseEquipmentQR(text);
    expect(result.marca).toBe("Arteche");
    expect(result.manufacturer).toBe("Arteche");
  });

  it("cross-maps serial numbers to existing fields", () => {
    const text = `N° de Série (Controle): 123
N° de Série (Tanque): 456`;
    const result = parseEquipmentQR(text);
    expect(result.control_box_serial).toBe("123");
    expect(result.mechanism_serial).toBe("456");
  });

  it("handles alternative field label formats", () => {
    const text = `Nº Série Controle: ABC123
Nº Série Tanque: DEF456
Capacidade de Interrupção: 10 kA
Sequência de Operação: O-CO-CO`;
    const result = parseEquipmentQR(text);
    expect(result.numero_serie_controle).toBe("ABC123");
    expect(result.numero_serie_tanque).toBe("DEF456");
    expect(result.capacidade_interrupcao).toBe("10 kA");
    expect(result.sequencia_operacao).toBe("O-CO-CO");
  });

  it("handles tab-separated format", () => {
    const text = "Modelo\tsmART RC PLUS\nMarca\tArteche";
    const result = parseEquipmentQR(text);
    expect(result.modelo).toBe("smART RC PLUS");
    expect(result.marca).toBe("Arteche");
  });

  it("returns empty object for empty string", () => {
    expect(parseEquipmentQR("")).toEqual({});
  });

  it("returns empty object for null/undefined input", () => {
    expect(parseEquipmentQR(null as unknown as string)).toEqual({});
    expect(parseEquipmentQR(undefined as unknown as string)).toEqual({});
  });

  it("returns empty object for malformed data (no separators)", () => {
    const text = "This is just random text\nWith no key value pairs";
    expect(parseEquipmentQR(text)).toEqual({});
  });

  it("skips lines with empty values", () => {
    const text = "Modelo:\nMarca: Arteche";
    const result = parseEquipmentQR(text);
    expect(result.modelo).toBeUndefined();
    expect(result.marca).toBe("Arteche");
  });

  it("skips unrecognized fields", () => {
    const text = "Campo Desconhecido: algum valor\nModelo: ABC";
    const result = parseEquipmentQR(text);
    expect(result.modelo).toBe("ABC");
    expect(Object.keys(result)).not.toContain("campo_desconhecido");
  });

  it("handles Windows-style line endings (CRLF)", () => {
    const text = "Modelo: ABC\r\nMarca: XYZ";
    const result = parseEquipmentQR(text);
    expect(result.modelo).toBe("ABC");
    expect(result.marca).toBe("XYZ");
  });

  it("handles extra whitespace around keys and values", () => {
    const text = "  Modelo  :  smART RC PLUS  ";
    const result = parseEquipmentQR(text);
    expect(result.modelo).toBe("smART RC PLUS");
  });
});
