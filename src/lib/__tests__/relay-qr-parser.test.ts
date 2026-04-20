import { describe, it, expect } from "vitest";
import { parseRelayQR, emptyRelayData, RELAY_FIELD_ORDER } from "../relay-qr-parser";

const SAMPLE_QR =
  "Ingeteam<br>DA3626/A<br>Vaux. 24-48Vdc;I ph 0.02-20A;I n 0.001-10A;V ph 0.03-8.6V;Vs/Vn 0.03-8.6V;Freq 50-60Hz<br>A23063000031<br>2025/03<br>6C:30:2A:FC:89:5E";

describe("parseRelayQR", () => {
  it("parses the Ingeteam DA3626/A sample correctly", () => {
    expect(parseRelayQR(SAMPLE_QR)).toEqual({
      fabricante: "Ingeteam",
      modelo: "DA3626/A",
      tensao_auxiliar: "Vaux. 24-48Vdc",
      range_i_fase: "I ph 0.02-20A",
      range_in: "I n 0.001-10A",
      range_v_fase: "V ph 0.03-8.6V",
      range_vs_vn: "Vs/Vn 0.03-8.6V",
      frequencia: "Freq 50-60Hz",
      numero_serie: "A23063000031",
      ano_mes_fabricacao: "2025/03",
      mac: "6C:30:2A:FC:89:5E",
    });
  });

  it("returns empty data for empty or invalid input", () => {
    expect(parseRelayQR("")).toEqual(emptyRelayData());
    expect(parseRelayQR(null as unknown as string)).toEqual(emptyRelayData());
    expect(parseRelayQR(undefined as unknown as string)).toEqual(emptyRelayData());
  });

  it("handles partial data gracefully (missing trailing blocks)", () => {
    const partial = "Ingeteam<br>DA3626/A";
    const result = parseRelayQR(partial);
    expect(result.fabricante).toBe("Ingeteam");
    expect(result.modelo).toBe("DA3626/A");
    expect(result.numero_serie).toBe("");
    expect(result.mac).toBe("");
  });

  it("handles partial parameter subblock (fewer than 6 params)", () => {
    const partial =
      "Ingeteam<br>DA3626/A<br>Vaux. 24-48Vdc;I ph 0.02-20A<br>A23063000031";
    const result = parseRelayQR(partial);
    expect(result.tensao_auxiliar).toBe("Vaux. 24-48Vdc");
    expect(result.range_i_fase).toBe("I ph 0.02-20A");
    expect(result.range_in).toBe("");
    expect(result.numero_serie).toBe("A23063000031");
  });

  it("accepts <br/> and <BR> variants as delimiter", () => {
    const variant = "Ingeteam<BR>DA3626/A<br/>Vaux. 24-48Vdc";
    const result = parseRelayQR(variant);
    expect(result.fabricante).toBe("Ingeteam");
    expect(result.modelo).toBe("DA3626/A");
    expect(result.tensao_auxiliar).toBe("Vaux. 24-48Vdc");
  });

  it("trims whitespace around blocks and params", () => {
    const spaced =
      "  Ingeteam  <br>  DA3626/A  <br>  Vaux. 24-48Vdc ; I ph 0.02-20A ";
    const result = parseRelayQR(spaced);
    expect(result.fabricante).toBe("Ingeteam");
    expect(result.modelo).toBe("DA3626/A");
    expect(result.tensao_auxiliar).toBe("Vaux. 24-48Vdc");
    expect(result.range_i_fase).toBe("I ph 0.02-20A");
  });
});

describe("RELAY_FIELD_ORDER", () => {
  it("has 11 fields in the correct order", () => {
    expect(RELAY_FIELD_ORDER).toHaveLength(11);
    expect(RELAY_FIELD_ORDER[0].key).toBe("fabricante");
    expect(RELAY_FIELD_ORDER[10].key).toBe("mac");
  });
});
