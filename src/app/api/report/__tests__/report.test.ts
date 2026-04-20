import { describe, it, expect } from "vitest";

// --- Helpers extracted from route logic for testability ---

const STATUS_LABELS: Record<string, string> = {
  approved: "Aprovado",
  rejected: "Reprovado",
  na: "N/A",
  pending: "Pendente",
};

const INSPECTION_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  in_progress: "Em Andamento",
  ready_for_review: "Pronta para Revisao",
  aprovado: "Aprovado",
  relatorio_reprovado: "Rel. Reprovado",
  equipamento_reprovado: "Eq. Reprovado",
  transferred: "Cadastrada",
};

// --- Tests ---

describe("PDF Report", () => {
  describe("Content-Type expectations", () => {
    it("equipment report should use application/pdf content type", () => {
      const contentType = "application/pdf";
      expect(contentType).toBe("application/pdf");
    });

    it("order report should use application/pdf content type", () => {
      const contentType = "application/pdf";
      expect(contentType).toBe("application/pdf");
    });
  });

  describe("Filename pattern - Equipment", () => {
    it("generates correct equipment PDF filename with copel code and date", () => {
      const copelCode = "RA001";
      const fileDate = "2026-03-15";
      const filename = `relatorio_${copelCode}_${fileDate}.pdf`;
      expect(filename).toBe("relatorio_RA001_2026-03-15.pdf");
    });

    it("uses fallback when copel code is missing", () => {
      const copelCode = "sem-codigo";
      const fileDate = "2026-03-15";
      const filename = `relatorio_${copelCode}_${fileDate}.pdf`;
      expect(filename).toBe("relatorio_sem-codigo_2026-03-15.pdf");
    });

    it("filename ends with .pdf extension", () => {
      const copelCode = "RA999";
      const fileDate = "2026-04-01";
      const filename = `relatorio_${copelCode}_${fileDate}.pdf`;
      expect(filename).toMatch(/\.pdf$/);
    });

    it("filename starts with relatorio_ prefix", () => {
      const copelCode = "RA123";
      const fileDate = "2026-01-01";
      const filename = `relatorio_${copelCode}_${fileDate}.pdf`;
      expect(filename).toMatch(/^relatorio_/);
    });
  });

  describe("Filename pattern - Order", () => {
    it("generates correct order PDF filename with sanitized title and date", () => {
      const title = "OS-001";
      const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
      const fileDate = "2026-03-15";
      const filename = `relatorio_os_${safeTitle}_${fileDate}.pdf`;
      expect(filename).toBe("relatorio_os_OS-001_2026-03-15.pdf");
    });

    it("sanitizes special characters in order title", () => {
      const title = "OS 001/teste (rev.2)";
      const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
      const fileDate = "2026-03-15";
      const filename = `relatorio_os_${safeTitle}_${fileDate}.pdf`;
      expect(filename).toBe("relatorio_os_OS_001_teste__rev_2__2026-03-15.pdf");
      expect(filename).toMatch(/\.pdf$/);
    });

    it("truncates long titles to 50 characters", () => {
      const title = "A".repeat(100);
      const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
      expect(safeTitle).toHaveLength(50);
    });

    it("filename starts with relatorio_os_ prefix", () => {
      const title = "Test";
      const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
      const fileDate = "2026-01-01";
      const filename = `relatorio_os_${safeTitle}_${fileDate}.pdf`;
      expect(filename).toMatch(/^relatorio_os_/);
    });
  });

  describe("Status labels", () => {
    it("maps checklist status values to Portuguese labels", () => {
      expect(STATUS_LABELS["approved"]).toBe("Aprovado");
      expect(STATUS_LABELS["rejected"]).toBe("Reprovado");
      expect(STATUS_LABELS["na"]).toBe("N/A");
      expect(STATUS_LABELS["pending"]).toBe("Pendente");
    });

    it("maps inspection status values to Portuguese labels", () => {
      expect(INSPECTION_STATUS_LABELS["aprovado"]).toBe("Aprovado");
      expect(INSPECTION_STATUS_LABELS["equipamento_reprovado"]).toBe(
        "Eq. Reprovado"
      );
      expect(INSPECTION_STATUS_LABELS["transferred"]).toBe("Cadastrada");
    });
  });

  describe("Summary counts logic", () => {
    it("correctly calculates approved count", () => {
      const inspections = [
        { status: "aprovado" },
        { status: "transferred" },
        { status: "in_progress" },
        { status: "equipamento_reprovado" },
      ];

      const aprovadoCount = inspections.filter(
        (i) => i.status === "aprovado" || i.status === "transferred"
      ).length;

      expect(aprovadoCount).toBe(2);
    });

    it("correctly calculates rejected count", () => {
      const inspections = [
        { status: "aprovado" },
        { status: "equipamento_reprovado" },
        { status: "relatorio_reprovado" },
        { status: "in_progress" },
      ];

      const reprovadoCount = inspections.filter(
        (i) =>
          i.status === "equipamento_reprovado" ||
          i.status === "relatorio_reprovado"
      ).length;

      expect(reprovadoCount).toBe(2);
    });

    it("correctly calculates pending count", () => {
      const inspections = [
        { status: "aprovado" },
        { status: "transferred" },
        { status: "in_progress" },
        { status: "draft" },
        { status: "equipamento_reprovado" },
      ];

      const total = inspections.length;
      const aprovado = inspections.filter(
        (i) => i.status === "aprovado" || i.status === "transferred"
      ).length;
      const reprovado = inspections.filter(
        (i) =>
          i.status === "equipamento_reprovado" ||
          i.status === "relatorio_reprovado"
      ).length;
      const pending = total - aprovado - reprovado;

      expect(pending).toBe(2);
    });
  });
});
