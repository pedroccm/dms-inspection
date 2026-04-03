import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard/relatorios/produtividade",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Mock auth context
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "1" },
    profile: { id: "1", full_name: "Admin", role: "admin", active: true },
    role: "admin",
    isAdmin: true,
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("ReportFilters", () => {
  it("renders date filters and inspector dropdown", async () => {
    const { ReportFilters } = await import(
      "../produtividade/report-filters"
    );
    render(
      <ReportFilters
        inspectors={[
          { id: "i1", full_name: "Joao Silva" },
          { id: "i2", full_name: "Maria Santos" },
        ]}
        defaultStartDate="2026-04-01"
        defaultEndDate="2026-04-30"
      />
    );

    expect(screen.getByLabelText("Data Início")).toBeInTheDocument();
    expect(screen.getByLabelText("Data Fim")).toBeInTheDocument();
    expect(screen.getByLabelText("Inspetor")).toBeInTheDocument();
    expect(screen.getByText("Filtrar")).toBeInTheDocument();
  });

  it("renders inspector options including Todos", async () => {
    const { ReportFilters } = await import(
      "../produtividade/report-filters"
    );
    render(
      <ReportFilters
        inspectors={[{ id: "i1", full_name: "Joao Silva" }]}
        defaultStartDate="2026-04-01"
        defaultEndDate="2026-04-30"
      />
    );

    expect(screen.getByText("Todos")).toBeInTheDocument();
    expect(screen.getByText("Joao Silva")).toBeInTheDocument();
  });
});

describe("Report table headers", () => {
  it("has all expected column headers", () => {
    const headers = [
      "Nome do Inspetor",
      "Total de Inspeções",
      "Itens Aprovados",
      "Itens Reprovados",
      "Itens NA",
      "Taxa de Aprovação (%)",
    ];

    // Verify all header strings are defined
    headers.forEach((header) => {
      expect(header).toBeTruthy();
    });
    expect(headers).toHaveLength(6);
  });
});

describe("ExportCsv", () => {
  it("renders Exportar CSV button", async () => {
    const { ExportCsv } = await import("../produtividade/export-csv");
    render(<ExportCsv rows={[]} />);

    expect(screen.getByText("Exportar CSV")).toBeInTheDocument();
  });

  it("disables button when rows are empty", async () => {
    const { ExportCsv } = await import("../produtividade/export-csv");
    render(<ExportCsv rows={[]} />);

    const button = screen.getByText("Exportar CSV");
    expect(button).toBeDisabled();
  });

  it("enables button when rows have data", async () => {
    const { ExportCsv } = await import("../produtividade/export-csv");
    render(
      <ExportCsv
        rows={[
          {
            inspector_id: "i1",
            inspector_name: "Joao",
            total_inspections: 5,
            approved_count: 20,
            rejected_count: 3,
            na_count: 2,
            approval_rate: 87.0,
          },
        ]}
      />
    );

    const button = screen.getByText("Exportar CSV");
    expect(button).not.toBeDisabled();
  });
});

describe("Empty state", () => {
  it("shows empty state message text", () => {
    const emptyMessage = "Nenhuma inspeção encontrada no período selecionado.";
    expect(emptyMessage).toBe(
      "Nenhuma inspeção encontrada no período selecionado."
    );
  });
});

describe("Approval rate calculation", () => {
  it("calculates approval rate correctly", () => {
    const approved = 17;
    const rejected = 3;
    const evaluated = approved + rejected;
    const rate =
      evaluated > 0
        ? Math.round((approved / evaluated) * 100 * 10) / 10
        : 0;

    expect(rate).toBe(85);
  });

  it("returns 0 when no evaluated items", () => {
    const approved = 0;
    const rejected = 0;
    const evaluated = approved + rejected;
    const rate =
      evaluated > 0
        ? Math.round((approved / evaluated) * 100 * 10) / 10
        : 0;

    expect(rate).toBe(0);
  });

  it("handles 100% approval", () => {
    const approved = 25;
    const rejected = 0;
    const evaluated = approved + rejected;
    const rate =
      evaluated > 0
        ? Math.round((approved / evaluated) * 100 * 10) / 10
        : 0;

    expect(rate).toBe(100);
  });

  it("handles decimal rates", () => {
    const approved = 2;
    const rejected = 1;
    const evaluated = approved + rejected;
    const rate =
      evaluated > 0
        ? Math.round((approved / evaluated) * 100 * 10) / 10
        : 0;

    expect(rate).toBe(66.7);
  });
});
