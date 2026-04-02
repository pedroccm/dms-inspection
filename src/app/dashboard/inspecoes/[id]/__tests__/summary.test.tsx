import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChecklistSummary } from "../checklist-summary";
import type { ChecklistItem } from "@/lib/types";

function makeItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: `item-${Math.random().toString(36).slice(2)}`,
    inspection_id: "insp-1",
    item_name: "Verificar estado geral",
    category: "Mecanismo",
    status: "pending",
    rejection_reason: null,
    sort_order: 1,
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("ChecklistSummary", () => {
  it("renders nothing when items is empty", () => {
    const { container } = render(<ChecklistSummary items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows correct counts for each status", () => {
    const items = [
      makeItem({ id: "1", status: "approved" }),
      makeItem({ id: "2", status: "approved" }),
      makeItem({ id: "3", status: "rejected", rejection_reason: "Defeito visivel" }),
      makeItem({ id: "4", status: "na" }),
      makeItem({ id: "5", status: "pending" }),
      makeItem({ id: "6", status: "pending" }),
    ];

    render(<ChecklistSummary items={items} />);

    // Check labels are displayed
    expect(screen.getByText("Aprovados")).toBeDefined();
    expect(screen.getByText("Reprovados")).toBeDefined();
    expect(screen.getByText("NA")).toBeDefined();
    expect(screen.getByText("Pendentes")).toBeDefined();

    // Check summary line shows total evaluated
    expect(screen.getByText("4 de 6 itens avaliados")).toBeDefined();
    expect(screen.getByText("67%")).toBeDefined();
  });

  it("shows correct completion percentage", () => {
    const items = [
      makeItem({ id: "1", status: "approved" }),
      makeItem({ id: "2", status: "rejected", rejection_reason: "Teste motivo" }),
      makeItem({ id: "3", status: "pending" }),
      makeItem({ id: "4", status: "pending" }),
    ];

    render(<ChecklistSummary items={items} />);

    // 2 out of 4 = 50%
    expect(screen.getByText("50%")).toBeDefined();
    expect(screen.getByText("2 de 4 itens avaliados")).toBeDefined();
  });

  it("shows 100% when all items are evaluated", () => {
    const items = [
      makeItem({ id: "1", status: "approved" }),
      makeItem({ id: "2", status: "approved" }),
      makeItem({ id: "3", status: "na" }),
    ];

    render(<ChecklistSummary items={items} />);

    expect(screen.getByText("100%")).toBeDefined();
    expect(screen.getByText("3 de 3 itens avaliados")).toBeDefined();
  });

  it("lists rejected items with reasons", () => {
    const items = [
      makeItem({
        id: "1",
        item_name: "Verificar estado geral",
        category: "Mecanismo",
        status: "rejected",
        rejection_reason: "Oxidacao presente",
      }),
      makeItem({
        id: "2",
        item_name: "Verificar display",
        category: "Controle",
        status: "rejected",
        rejection_reason: "Display quebrado",
      }),
      makeItem({ id: "3", status: "approved" }),
    ];

    render(<ChecklistSummary items={items} />);

    expect(screen.getByText("Itens reprovados:")).toBeDefined();
    expect(screen.getByText("Verificar estado geral")).toBeDefined();
    expect(screen.getByText(/Oxidacao presente/)).toBeDefined();
    expect(screen.getByText("Verificar display")).toBeInTheDocument();
    expect(screen.getByText(/Display quebrado/)).toBeDefined();
  });

  it("does not show rejected items section when none rejected", () => {
    const items = [
      makeItem({ id: "1", status: "approved" }),
      makeItem({ id: "2", status: "na" }),
    ];

    render(<ChecklistSummary items={items} />);

    expect(screen.queryByText("Itens reprovados:")).toBeNull();
  });
});
