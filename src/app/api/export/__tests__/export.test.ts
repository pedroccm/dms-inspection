import { describe, it, expect } from "vitest";

// --- Helpers extracted from route logic for testability ---

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

const STATUS_LABELS: Record<string, string> = {
  approved: "Aprovado",
  rejected: "Reprovado",
  na: "N/A",
  pending: "Pendente",
};

function buildInspectionCSV(inspection: {
  equipment: {
    copel_ra_code: string;
    copel_control_code: string;
    mechanism_serial: string;
    control_box_serial: string;
    protection_relay_serial: string;
    manufacturer: string;
  };
  checklist_items: {
    label: string;
    status: string;
    rejection_reason: string | null;
  }[];
  notes: string | null;
  inspector_name: string;
  date: string;
}): string {
  const lines: string[] = [];

  lines.push(
    "Codigo Copel RA,Codigo Copel Controle,No Serie Mecanismo,No Serie Caixa Controle,No Serie Rele Protecao,Fabricante"
  );
  lines.push(
    [
      escapeCSV(inspection.equipment.copel_ra_code),
      escapeCSV(inspection.equipment.copel_control_code),
      escapeCSV(inspection.equipment.mechanism_serial),
      escapeCSV(inspection.equipment.control_box_serial),
      escapeCSV(inspection.equipment.protection_relay_serial),
      escapeCSV(inspection.equipment.manufacturer),
    ].join(",")
  );

  lines.push("");
  lines.push("Item de Inspecao,Resultado,Motivo da Reprovacao");

  for (const item of inspection.checklist_items) {
    lines.push(
      [
        escapeCSV(item.label),
        escapeCSV(STATUS_LABELS[item.status] ?? item.status),
        escapeCSV(item.rejection_reason),
      ].join(",")
    );
  }

  lines.push("");
  lines.push("Observacoes");
  lines.push(escapeCSV(inspection.notes));

  lines.push("");
  lines.push(`Inspetor,${escapeCSV(inspection.inspector_name)}`);
  lines.push(`Data,${escapeCSV(inspection.date)}`);

  return lines.join("\n");
}

function buildOrderCSV(
  inspections: {
    copel_ra_code: string;
    manufacturer: string;
    inspector_name: string;
    date: string;
    checklist_items: {
      label: string;
      status: string;
      rejection_reason: string | null;
    }[];
  }[]
): string {
  const lines: string[] = [];
  lines.push(
    "Codigo Copel RA,Fabricante,Item,Resultado,Motivo Reprovacao,Inspetor,Data"
  );

  for (const insp of inspections) {
    for (const item of insp.checklist_items) {
      lines.push(
        [
          escapeCSV(insp.copel_ra_code),
          escapeCSV(insp.manufacturer),
          escapeCSV(item.label),
          escapeCSV(STATUS_LABELS[item.status] ?? item.status),
          escapeCSV(item.rejection_reason),
          escapeCSV(insp.inspector_name),
          escapeCSV(insp.date),
        ].join(",")
      );
    }
  }

  return lines.join("\n");
}

// --- Tests ---

describe("CSV Export", () => {
  describe("escapeCSV", () => {
    it("returns empty string for null/undefined", () => {
      expect(escapeCSV(null)).toBe("");
      expect(escapeCSV(undefined)).toBe("");
    });

    it("returns plain string when no special characters", () => {
      expect(escapeCSV("hello")).toBe("hello");
    });

    it("wraps in quotes when string contains comma", () => {
      expect(escapeCSV("hello, world")).toBe('"hello, world"');
    });

    it("wraps in quotes and escapes inner quotes", () => {
      expect(escapeCSV('he said "hi"')).toBe('"he said ""hi"""');
    });

    it("wraps in quotes when string contains newline", () => {
      expect(escapeCSV("line1\nline2")).toBe('"line1\nline2"');
    });
  });

  describe("formatDate", () => {
    it("returns empty string for null", () => {
      expect(formatDate(null)).toBe("");
    });

    it("formats ISO date to pt-BR locale", () => {
      const result = formatDate("2026-03-15T10:00:00Z");
      // pt-BR format: DD/MM/YYYY
      expect(result).toMatch(/15\/0?3\/2026/);
    });
  });

  describe("CSV header generation", () => {
    it("generates correct equipment header row", () => {
      const csv = buildInspectionCSV({
        equipment: {
          copel_ra_code: "RA001",
          copel_control_code: "CC001",
          mechanism_serial: "MS001",
          control_box_serial: "CB001",
          protection_relay_serial: "PR001",
          manufacturer: "ABB",
        },
        checklist_items: [],
        notes: null,
        inspector_name: "Joao",
        date: "15/03/2026",
      });

      const lines = csv.split("\n");
      expect(lines[0]).toBe(
        "Codigo Copel RA,Codigo Copel Controle,No Serie Mecanismo,No Serie Caixa Controle,No Serie Rele Protecao,Fabricante"
      );
    });

    it("generates correct checklist header row", () => {
      const csv = buildInspectionCSV({
        equipment: {
          copel_ra_code: "RA001",
          copel_control_code: "CC001",
          mechanism_serial: "MS001",
          control_box_serial: "CB001",
          protection_relay_serial: "PR001",
          manufacturer: "ABB",
        },
        checklist_items: [],
        notes: null,
        inspector_name: "Joao",
        date: "15/03/2026",
      });

      const lines = csv.split("\n");
      expect(lines[3]).toBe("Item de Inspecao,Resultado,Motivo da Reprovacao");
    });
  });

  describe("CSV row formatting", () => {
    it("formats approved item correctly", () => {
      const csv = buildInspectionCSV({
        equipment: {
          copel_ra_code: "RA001",
          copel_control_code: "CC001",
          mechanism_serial: "MS001",
          control_box_serial: "CB001",
          protection_relay_serial: "PR001",
          manufacturer: "ABB",
        },
        checklist_items: [
          {
            label: "Alimentacao VCA e Tomada",
            status: "approved",
            rejection_reason: null,
          },
        ],
        notes: null,
        inspector_name: "Joao",
        date: "15/03/2026",
      });

      const lines = csv.split("\n");
      // Row after checklist header (index 4)
      expect(lines[4]).toBe("Alimentacao VCA e Tomada,Aprovado,");
    });

    it("formats rejected item with reason correctly", () => {
      const csv = buildInspectionCSV({
        equipment: {
          copel_ra_code: "RA001",
          copel_control_code: "CC001",
          mechanism_serial: "MS001",
          control_box_serial: "CB001",
          protection_relay_serial: "PR001",
          manufacturer: "ABB",
        },
        checklist_items: [
          {
            label: "Operacao Bateria",
            status: "rejected",
            rejection_reason: "Bateria com carga insuficiente",
          },
        ],
        notes: null,
        inspector_name: "Joao",
        date: "15/03/2026",
      });

      const lines = csv.split("\n");
      expect(lines[4]).toBe(
        "Operacao Bateria,Reprovado,Bateria com carga insuficiente"
      );
    });

    it("escapes rejection reason containing comma", () => {
      const csv = buildInspectionCSV({
        equipment: {
          copel_ra_code: "RA001",
          copel_control_code: "CC001",
          mechanism_serial: "MS001",
          control_box_serial: "CB001",
          protection_relay_serial: "PR001",
          manufacturer: "ABB",
        },
        checklist_items: [
          {
            label: "Item teste",
            status: "rejected",
            rejection_reason: "Problema A, Problema B",
          },
        ],
        notes: null,
        inspector_name: "Joao",
        date: "15/03/2026",
      });

      const lines = csv.split("\n");
      expect(lines[4]).toContain('"Problema A, Problema B"');
    });
  });

  describe("Filename pattern", () => {
    it("generates correct single inspection filename", () => {
      const copelCode = "RA001";
      const fileDate = "2026-03-15";
      const filename = `inspecao_${copelCode}_${fileDate}.csv`;
      expect(filename).toBe("inspecao_RA001_2026-03-15.csv");
    });

    it("generates correct order filename", () => {
      const orderId = "abc-123";
      const fileDate = "2026-03-15";
      const filename = `ordem_${orderId}_${fileDate}.csv`;
      expect(filename).toBe("ordem_abc-123_2026-03-15.csv");
    });
  });

  describe("Data transformation", () => {
    it("maps status values to Portuguese labels", () => {
      expect(STATUS_LABELS["approved"]).toBe("Aprovado");
      expect(STATUS_LABELS["rejected"]).toBe("Reprovado");
      expect(STATUS_LABELS["na"]).toBe("N/A");
      expect(STATUS_LABELS["pending"]).toBe("Pendente");
    });

    it("includes inspector and date in inspection CSV", () => {
      const csv = buildInspectionCSV({
        equipment: {
          copel_ra_code: "RA001",
          copel_control_code: "CC001",
          mechanism_serial: "MS001",
          control_box_serial: "CB001",
          protection_relay_serial: "PR001",
          manufacturer: "ABB",
        },
        checklist_items: [],
        notes: "Observacao de teste",
        inspector_name: "Maria Silva",
        date: "15/03/2026",
      });

      expect(csv).toContain("Inspetor,Maria Silva");
      expect(csv).toContain("Data,15/03/2026");
      expect(csv).toContain("Observacao de teste");
    });

    it("builds order CSV with multiple inspections", () => {
      const csv = buildOrderCSV([
        {
          copel_ra_code: "RA001",
          manufacturer: "ABB",
          inspector_name: "Joao",
          date: "15/03/2026",
          checklist_items: [
            { label: "Item A", status: "approved", rejection_reason: null },
          ],
        },
        {
          copel_ra_code: "RA002",
          manufacturer: "Siemens",
          inspector_name: "Maria",
          date: "16/03/2026",
          checklist_items: [
            {
              label: "Item B",
              status: "rejected",
              rejection_reason: "Defeito",
            },
          ],
        },
      ]);

      const lines = csv.split("\n");
      expect(lines).toHaveLength(3); // header + 2 rows
      expect(lines[0]).toBe(
        "Codigo Copel RA,Fabricante,Item,Resultado,Motivo Reprovacao,Inspetor,Data"
      );
      expect(lines[1]).toBe("RA001,ABB,Item A,Aprovado,,Joao,15/03/2026");
      expect(lines[2]).toBe(
        "RA002,Siemens,Item B,Reprovado,Defeito,Maria,16/03/2026"
      );
    });
  });
});
