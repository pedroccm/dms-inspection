import { describe, it, expect } from "vitest";
import { parseCSV, parseXLSXData } from "../parse-equipment";

describe("parseCSV", () => {
  it("parses comma-separated CSV with standard headers", () => {
    const csv = [
      "copel_ra_code,copel_control_code,manufacturer",
      "RA-001,CC-001,ABB",
      "RA-002,CC-002,Siemens",
    ].join("\n");

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].copel_ra_code).toBe("RA-001");
    expect(rows[0].copel_control_code).toBe("CC-001");
    expect(rows[0].manufacturer).toBe("ABB");
    expect(rows[1].copel_ra_code).toBe("RA-002");
    expect(rows[1].manufacturer).toBe("Siemens");
  });

  it("parses tab-separated TXT file", () => {
    const tsv = [
      "copel_ra_code\tmanufacturer\tmechanism_serial",
      "RA-100\tWEG\tSER-100",
      "RA-200\tABB\tSER-200",
    ].join("\n");

    const rows = parseCSV(tsv);
    expect(rows).toHaveLength(2);
    expect(rows[0].copel_ra_code).toBe("RA-100");
    expect(rows[0].manufacturer).toBe("WEG");
    expect(rows[0].mechanism_serial).toBe("SER-100");
  });

  it("handles Portuguese header names", () => {
    const csv = [
      "codigo_copel_ra,fabricante",
      "RA-300,Schneider",
    ].join("\n");

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].copel_ra_code).toBe("RA-300");
    expect(rows[0].manufacturer).toBe("Schneider");
  });

  it("skips rows with empty copel_ra_code", () => {
    const csv = [
      "copel_ra_code,manufacturer",
      "RA-001,ABB",
      ",Siemens",
      "RA-003,WEG",
    ].join("\n");

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].copel_ra_code).toBe("RA-001");
    expect(rows[1].copel_ra_code).toBe("RA-003");
  });

  it("returns empty array if copel_ra_code column is missing", () => {
    const csv = [
      "manufacturer,mechanism_serial",
      "ABB,SER-001",
    ].join("\n");

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(parseCSV("")).toHaveLength(0);
  });

  it("returns empty array for header-only file", () => {
    const csv = "copel_ra_code,manufacturer";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(0);
  });

  it("fills missing optional columns with empty string", () => {
    const csv = [
      "copel_ra_code",
      "RA-ONLY",
    ].join("\n");

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].copel_ra_code).toBe("RA-ONLY");
    expect(rows[0].manufacturer).toBe("");
    expect(rows[0].copel_control_code).toBe("");
    expect(rows[0].mechanism_serial).toBe("");
    expect(rows[0].control_box_serial).toBe("");
    expect(rows[0].protection_relay_serial).toBe("");
  });

  it("trims whitespace from values", () => {
    const csv = [
      "copel_ra_code , manufacturer",
      " RA-TRIM , ABB ",
    ].join("\n");

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].copel_ra_code).toBe("RA-TRIM");
    expect(rows[0].manufacturer).toBe("ABB");
  });

  it("handles Windows-style line endings (CRLF)", () => {
    const csv = "copel_ra_code,manufacturer\r\nRA-WIN,ABB\r\n";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].copel_ra_code).toBe("RA-WIN");
  });

  it("handles all optional columns", () => {
    const csv = [
      "copel_ra_code,copel_control_code,mechanism_serial,control_box_serial,protection_relay_serial,manufacturer",
      "RA-FULL,CC-FULL,MECH-001,CB-001,PR-001,ABB",
    ].join("\n");

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      copel_ra_code: "RA-FULL",
      copel_control_code: "CC-FULL",
      mechanism_serial: "MECH-001",
      control_box_serial: "CB-001",
      protection_relay_serial: "PR-001",
      manufacturer: "ABB",
    });
  });
});

describe("parseXLSXData", () => {
  it("parses JSON data from xlsx sheet_to_json output", () => {
    const jsonData = [
      { copel_ra_code: "RA-X01", manufacturer: "ABB", mechanism_serial: "M-01" },
      { copel_ra_code: "RA-X02", manufacturer: "WEG", mechanism_serial: "M-02" },
    ];

    const rows = parseXLSXData(jsonData);
    expect(rows).toHaveLength(2);
    expect(rows[0].copel_ra_code).toBe("RA-X01");
    expect(rows[0].manufacturer).toBe("ABB");
    expect(rows[1].copel_ra_code).toBe("RA-X02");
  });

  it("returns empty array when copel_ra_code column is missing", () => {
    const jsonData = [
      { manufacturer: "ABB", mechanism_serial: "M-01" },
    ];

    const rows = parseXLSXData(jsonData);
    expect(rows).toHaveLength(0);
  });

  it("returns empty array for empty data", () => {
    const rows = parseXLSXData([]);
    expect(rows).toHaveLength(0);
  });

  it("handles Portuguese column names", () => {
    const jsonData = [
      { codigo_copel_ra: "RA-PT1", fabricante: "Schneider" },
    ];

    const rows = parseXLSXData(jsonData);
    expect(rows).toHaveLength(1);
    expect(rows[0].copel_ra_code).toBe("RA-PT1");
    expect(rows[0].manufacturer).toBe("Schneider");
  });

  it("skips rows with empty copel_ra_code", () => {
    const jsonData = [
      { copel_ra_code: "RA-OK", manufacturer: "ABB" },
      { copel_ra_code: "", manufacturer: "WEG" },
      { copel_ra_code: "RA-OK2", manufacturer: "Siemens" },
    ];

    const rows = parseXLSXData(jsonData);
    expect(rows).toHaveLength(2);
  });
});

describe("duplicate copel_ra_code handling", () => {
  it("parseCSV allows duplicate codes (server action handles dedup)", () => {
    const csv = [
      "copel_ra_code,manufacturer",
      "RA-DUP,ABB",
      "RA-DUP,Siemens",
    ].join("\n");

    const rows = parseCSV(csv);
    // Parser does not deduplicate - that's the server action's job
    expect(rows).toHaveLength(2);
    expect(rows[0].copel_ra_code).toBe("RA-DUP");
    expect(rows[1].copel_ra_code).toBe("RA-DUP");
  });
});

describe("missing required columns", () => {
  it("returns empty when no recognizable headers exist", () => {
    const csv = [
      "unknown_column,another_column",
      "val1,val2",
    ].join("\n");

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(0);
  });

  it("returns empty when only optional columns are present", () => {
    const csv = [
      "manufacturer,mechanism_serial,control_box_serial",
      "ABB,SER-001,CB-001",
    ].join("\n");

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(0);
  });
});
