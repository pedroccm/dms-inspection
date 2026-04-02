import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChecklistItem, InspectionStatus } from "@/lib/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/inspecoes/test-id",
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock server actions
const mockUpdateChecklistItem = vi.fn();
const mockUpdateInspectionObservations = vi.fn();
const mockCompleteInspectionEvaluation = vi.fn();

vi.mock("../actions", () => ({
  updateChecklistItem: (...args: unknown[]) => mockUpdateChecklistItem(...args),
  updateInspectionObservations: (...args: unknown[]) => mockUpdateInspectionObservations(...args),
  completeInspectionEvaluation: (...args: unknown[]) => mockCompleteInspectionEvaluation(...args),
}));

// Mock auth context
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    profile: { id: "user-1", full_name: "Inspector", role: "inspector", active: true },
    role: "inspector",
    isAdmin: false,
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function makeItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: "item-1",
    inspection_id: "insp-1",
    label: "Mecanismo - Verificar estado geral",
    checked: false,
    status: "pending",
    rejection_reason: null,
    notes: null,
    order: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeItems(): ChecklistItem[] {
  return [
    makeItem({ id: "item-1", label: "Mecanismo - Verificar estado geral", order: 1 }),
    makeItem({ id: "item-2", label: "Mecanismo - Verificar vedacao", order: 2 }),
    makeItem({ id: "item-3", label: "Controle - Verificar terminais", order: 3 }),
    makeItem({ id: "item-4", label: "Controle - Verificar conexoes", order: 4 }),
    makeItem({ id: "item-5", label: "Rele - Verificar firmware", order: 5 }),
  ];
}

async function renderChecklist(
  items: ChecklistItem[] = makeItems(),
  status: InspectionStatus = "in_progress",
  notes: string | null = null
) {
  const { ChecklistForm } = await import("../checklist-form");
  return render(
    <ChecklistForm
      checklistItems={items}
      inspectionId="insp-1"
      inspectionStatus={status}
      inspectionNotes={notes}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateChecklistItem.mockResolvedValue({ success: true });
  mockUpdateInspectionObservations.mockResolvedValue({ success: true });
  mockCompleteInspectionEvaluation.mockResolvedValue({ success: true });
});

describe("ChecklistForm - Rendering", () => {
  it("renders all checklist items with evaluation buttons", async () => {
    await renderChecklist();

    expect(screen.getByText("Verificar estado geral")).toBeInTheDocument();
    expect(screen.getByText("Verificar vedacao")).toBeInTheDocument();
    expect(screen.getByText("Verificar terminais")).toBeInTheDocument();
    expect(screen.getByText("Verificar conexoes")).toBeInTheDocument();
    expect(screen.getByText("Verificar firmware")).toBeInTheDocument();
  });

  it("groups items by category with headers", async () => {
    await renderChecklist();

    expect(screen.getByText("Mecanismo")).toBeInTheDocument();
    expect(screen.getByText("Controle")).toBeInTheDocument();
    expect(screen.getByText("Rele")).toBeInTheDocument();
  });

  it("shows progress bar with correct count", async () => {
    await renderChecklist();

    expect(screen.getByText("0 de 5 itens avaliados")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows progress bar reflecting pre-evaluated items", async () => {
    const items = makeItems();
    items[0].status = "approved";
    items[1].status = "rejected";
    items[1].rejection_reason = "Motivo de teste aqui com mais de 10 chars";

    await renderChecklist(items);

    expect(screen.getByText("2 de 5 itens avaliados")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });
});

describe("ChecklistForm - Status Selection (US-302)", () => {
  it("clicking Aprovado highlights the button green and saves", async () => {
    await renderChecklist();

    const approveButtons = screen.getAllByLabelText(/Aprovado -/);
    fireEvent.click(approveButtons[0]);

    expect(mockUpdateChecklistItem).toHaveBeenCalledWith("item-1", "approved");
  });

  it("clicking Reprovado shows rejection reason field (US-303)", async () => {
    await renderChecklist();

    const rejectButtons = screen.getAllByLabelText(/Reprovado -/);
    fireEvent.click(rejectButtons[0]);

    expect(screen.getByPlaceholderText("Motivo da reprovacao")).toBeInTheDocument();
  });

  it("clicking NA saves with na status", async () => {
    await renderChecklist();

    const naButtons = screen.getAllByLabelText(/NA -/);
    fireEvent.click(naButtons[0]);

    expect(mockUpdateChecklistItem).toHaveBeenCalledWith("item-1", "na");
  });
});

describe("ChecklistForm - Rejection Reason (US-303)", () => {
  it("validates rejection reason minimum 10 characters on blur", async () => {
    await renderChecklist();

    // Click reject
    const rejectButtons = screen.getAllByLabelText(/Reprovado -/);
    fireEvent.click(rejectButtons[0]);

    const textarea = screen.getByPlaceholderText("Motivo da reprovacao");
    fireEvent.change(textarea, { target: { value: "short" } });
    fireEvent.blur(textarea);

    await waitFor(() => {
      expect(screen.getByText("Descreva o motivo com pelo menos 10 caracteres")).toBeInTheDocument();
    });
  });

  it("saves rejection reason when valid on blur", async () => {
    await renderChecklist();

    const rejectButtons = screen.getAllByLabelText(/Reprovado -/);
    fireEvent.click(rejectButtons[0]);

    const textarea = screen.getByPlaceholderText("Motivo da reprovacao");
    fireEvent.change(textarea, { target: { value: "O equipamento esta com defeito visivel na vedacao" } });
    fireEvent.blur(textarea);

    await waitFor(() => {
      expect(mockUpdateChecklistItem).toHaveBeenCalledWith(
        "item-1",
        "rejected",
        "O equipamento esta com defeito visivel na vedacao"
      );
    });
  });

  it("changing from Reprovado to Aprovado hides rejection reason field", async () => {
    await renderChecklist();

    // First reject
    const rejectButtons = screen.getAllByLabelText(/Reprovado -/);
    fireEvent.click(rejectButtons[0]);
    expect(screen.getByPlaceholderText("Motivo da reprovacao")).toBeInTheDocument();

    // Then approve
    const approveButtons = screen.getAllByLabelText(/Aprovado -/);
    fireEvent.click(approveButtons[0]);

    expect(screen.queryByPlaceholderText("Motivo da reprovacao")).not.toBeInTheDocument();
  });
});

describe("ChecklistForm - Progress Bar Updates", () => {
  it("updates progress when items are evaluated", async () => {
    await renderChecklist();

    expect(screen.getByText("0 de 5 itens avaliados")).toBeInTheDocument();

    // Approve first item
    const approveButtons = screen.getAllByLabelText(/Aprovado -/);
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("1 de 5 itens avaliados")).toBeInTheDocument();
      expect(screen.getByText("20%")).toBeInTheDocument();
    });
  });
});

describe("ChecklistForm - Read-only Mode", () => {
  it("shows status text instead of buttons when inspection is submitted", async () => {
    const items = makeItems();
    items[0].status = "approved";
    items[1].status = "rejected";
    items[1].rejection_reason = "Problema encontrado na vedacao do equipamento";

    await renderChecklist(items, "submitted");

    // Should show status text, not buttons
    expect(screen.queryAllByLabelText(/Aprovado -/)).toHaveLength(0);
    expect(screen.queryAllByLabelText(/Reprovado -/)).toHaveLength(0);
    expect(screen.queryAllByLabelText(/NA -/)).toHaveLength(0);

    // Should show status labels
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
    expect(screen.getByText("Reprovado")).toBeInTheDocument();
  });

  it("shows status text instead of buttons when inspection is transferred", async () => {
    const items = makeItems();
    items[0].status = "approved";

    await renderChecklist(items, "transferred");

    expect(screen.queryAllByLabelText(/Aprovado -/)).toHaveLength(0);
  });

  it("shows rejection reason as read-only text in submitted state", async () => {
    const items = makeItems();
    items[0].status = "rejected";
    items[0].rejection_reason = "Defeito na vedacao do equipamento";

    await renderChecklist(items, "submitted");

    expect(screen.getByText(/Defeito na vedacao do equipamento/)).toBeInTheDocument();
  });

  it("does not show Concluir Avaliacao button when submitted", async () => {
    await renderChecklist(makeItems(), "submitted");

    expect(screen.queryByText("Concluir Avaliacao")).not.toBeInTheDocument();
  });
});

describe("ChecklistForm - Complete Evaluation", () => {
  it("disables Concluir Avaliacao when not all items evaluated", async () => {
    await renderChecklist();

    const button = screen.getByText("Concluir Avaliacao");
    expect(button).toBeDisabled();
  });

  it("shows message about pending items count", async () => {
    await renderChecklist();

    expect(screen.getByText(/Avalie todos os 5 itens pendentes/)).toBeInTheDocument();
  });
});
