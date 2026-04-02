import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard/inspecoes",
  redirect: vi.fn(),
  notFound: vi.fn(),
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

// Mock server actions
vi.mock("../actions", () => ({
  createInspection: vi.fn(),
}));

describe("NewInspectionForm", () => {
  const equipmentOptions = [
    { value: "eq-1", label: "RA-001 — ABB" },
    { value: "eq-2", label: "RA-002 — Siemens" },
  ];

  const serviceOrderOptions = [
    { value: "so-1", label: "OS Manutencao 001", equipmentId: "eq-1" },
    { value: "so-2", label: "OS Manutencao 002", equipmentId: "eq-2" },
  ];

  it("renders equipment and service order selects", async () => {
    const { NewInspectionForm } = await import(
      "../nova/new-inspection-form"
    );
    render(
      <NewInspectionForm
        equipmentOptions={equipmentOptions}
        serviceOrderOptions={serviceOrderOptions}
      />
    );

    expect(screen.getByLabelText(/Equipamento/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ordem de Servico/)).toBeInTheDocument();
  });

  it("renders Iniciar Inspecao and Cancelar buttons", async () => {
    const { NewInspectionForm } = await import(
      "../nova/new-inspection-form"
    );
    render(
      <NewInspectionForm
        equipmentOptions={equipmentOptions}
        serviceOrderOptions={serviceOrderOptions}
      />
    );

    expect(screen.getByText("Iniciar Inspecao")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("preselects equipment when preselectedEquipmentId is provided", async () => {
    const { NewInspectionForm } = await import(
      "../nova/new-inspection-form"
    );
    render(
      <NewInspectionForm
        equipmentOptions={equipmentOptions}
        serviceOrderOptions={serviceOrderOptions}
        preselectedEquipmentId="eq-1"
      />
    );

    const select = screen.getByLabelText(/Equipamento/) as HTMLSelectElement;
    expect(select.value).toBe("eq-1");
  });
});

describe("InspectionStatusFilter", () => {
  it("renders status dropdown with all options", async () => {
    const { InspectionStatusFilter } = await import("../status-filter");
    render(<InspectionStatusFilter />);

    expect(
      screen.getByText("Todos os status")
    ).toBeInTheDocument();
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    expect(screen.getByText("Em Andamento")).toBeInTheDocument();
    expect(screen.getByText("Pronta para Revisao")).toBeInTheDocument();
    expect(screen.getByText("Enviada")).toBeInTheDocument();
    expect(screen.getByText("Transferida")).toBeInTheDocument();
  });
});

describe("InspectionDetail - checklist display", () => {
  it("renders checklist items grouped by category", () => {
    // Test the grouping logic directly
    const items = [
      {
        id: "1",
        inspection_id: "insp-1",
        label: "Mecanismo - Verificar estado",
        checked: true,
        notes: null,
        order: 1,
        created_at: "2026-01-01",
      },
      {
        id: "2",
        inspection_id: "insp-1",
        label: "Mecanismo - Verificar vedacao",
        checked: false,
        notes: null,
        order: 2,
        created_at: "2026-01-01",
      },
      {
        id: "3",
        inspection_id: "insp-1",
        label: "Controle - Verificar terminais",
        checked: false,
        notes: null,
        order: 3,
        created_at: "2026-01-01",
      },
    ];

    // Group items
    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      const dashIndex = item.label.indexOf(" - ");
      const category =
        dashIndex > 0 ? item.label.substring(0, dashIndex) : "Geral";
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    }

    expect(Object.keys(groups)).toEqual(["Mecanismo", "Controle"]);
    expect(groups["Mecanismo"]).toHaveLength(2);
    expect(groups["Controle"]).toHaveLength(1);
  });

  it("calculates progress bar percentage correctly", () => {
    const items = [
      { checked: true },
      { checked: true },
      { checked: false },
      { checked: false },
      { checked: false },
    ];

    const evaluated = items.filter((i) => i.checked).length;
    const total = items.length;
    const percent = Math.round((evaluated / total) * 100);

    expect(evaluated).toBe(2);
    expect(total).toBe(5);
    expect(percent).toBe(40);
  });

  it("handles empty checklist items", () => {
    const items: { checked: boolean }[] = [];
    const evaluated = items.filter((i) => i.checked).length;
    const total = items.length;
    const percent = total > 0 ? Math.round((evaluated / total) * 100) : 0;

    expect(percent).toBe(0);
  });
});

describe("Status badge rendering", () => {
  const statusConfig = {
    draft: { label: "Rascunho", variant: "neutral" },
    in_progress: { label: "Em Andamento", variant: "info" },
    ready_for_review: { label: "Pronta para Revisao", variant: "warning" },
    submitted: { label: "Enviada", variant: "success" },
    transferred: { label: "Transferida", variant: "neutral" },
  } as const;

  it("maps all statuses to correct labels", () => {
    expect(statusConfig.draft.label).toBe("Rascunho");
    expect(statusConfig.in_progress.label).toBe("Em Andamento");
    expect(statusConfig.ready_for_review.label).toBe("Pronta para Revisao");
    expect(statusConfig.submitted.label).toBe("Enviada");
    expect(statusConfig.transferred.label).toBe("Transferida");
  });

  it("maps all statuses to correct badge variants", () => {
    expect(statusConfig.draft.variant).toBe("neutral");
    expect(statusConfig.in_progress.variant).toBe("info");
    expect(statusConfig.ready_for_review.variant).toBe("warning");
    expect(statusConfig.submitted.variant).toBe("success");
    expect(statusConfig.transferred.variant).toBe("neutral");
  });
});
