import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/ordens",
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
  createServiceOrder: vi.fn(),
  addEquipmentToOrder: vi.fn(),
  removeEquipmentFromOrder: vi.fn(),
}));

describe("OrderStatusFilter", () => {
  it("renders status dropdown with all options", async () => {
    const { OrderStatusFilter } = await import("../status-filter");
    render(<OrderStatusFilter />);

    expect(screen.getByText("Todos os status")).toBeInTheDocument();
    expect(screen.getByText("Aberta")).toBeInTheDocument();
    expect(screen.getByText("Em Andamento")).toBeInTheDocument();
    expect(screen.getByText("Concluida")).toBeInTheDocument();
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });

  it("renders with pre-selected status", async () => {
    const { OrderStatusFilter } = await import("../status-filter");
    const { container } = render(<OrderStatusFilter currentStatus="open" />);

    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select.value).toBe("open");
  });
});

describe("CreateOrderForm", () => {
  const inspectors = [
    { id: "i1", full_name: "Joao Silva" },
    { id: "i2", full_name: "Maria Santos" },
  ];

  it("renders all form fields", async () => {
    const { CreateOrderForm } = await import("../nova/create-order-form");
    render(<CreateOrderForm inspectors={inspectors} />);

    expect(screen.getByLabelText(/Titulo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do Cliente/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Localizacao/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data Inicio/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data Fim/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Inspetor Responsavel/)).toBeInTheDocument();
  });

  it("title and client name are required", async () => {
    const { CreateOrderForm } = await import("../nova/create-order-form");
    render(<CreateOrderForm inspectors={inspectors} />);

    expect(screen.getByLabelText(/Titulo/)).toBeRequired();
    expect(screen.getByLabelText(/Nome do Cliente/)).toBeRequired();
  });

  it("renders Criar Ordem and Cancelar buttons", async () => {
    const { CreateOrderForm } = await import("../nova/create-order-form");
    render(<CreateOrderForm inspectors={inspectors} />);

    expect(screen.getByText("Criar Ordem")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("renders inspector options in the select", async () => {
    const { CreateOrderForm } = await import("../nova/create-order-form");
    render(<CreateOrderForm inspectors={inspectors} />);

    expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
  });
});

describe("AddEquipmentSection", () => {
  it("renders search input and button", async () => {
    const { AddEquipmentSection } = await import("../[id]/add-equipment-section");
    render(<AddEquipmentSection orderId="order-1" />);

    expect(screen.getByText("Adicionar Equipamento")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Digite o codigo para buscar...")
    ).toBeInTheDocument();
    expect(screen.getByText("Buscar")).toBeInTheDocument();
  });
});

describe("RemoveEquipmentButton", () => {
  it("renders remove button", async () => {
    const { RemoveEquipmentButton } = await import("../[id]/remove-equipment-button");
    render(<RemoveEquipmentButton orderId="order-1" equipmentId="eq-1" />);

    expect(screen.getByText("Remover")).toBeInTheDocument();
  });
});

describe("Status Badge rendering", () => {
  it("renders badges with correct variants", async () => {
    const { Badge } = await import("@/components/ui/badge");

    const { container: blueContainer } = render(
      <Badge variant="info">Aberta</Badge>
    );
    expect(blueContainer.querySelector('[class*="bg-"]')).toBeInTheDocument();

    const { container: yellowContainer } = render(
      <Badge variant="warning">Em Andamento</Badge>
    );
    expect(yellowContainer.querySelector(".bg-yellow-100")).toBeInTheDocument();

    const { container: greenContainer } = render(
      <Badge variant="success">Concluida</Badge>
    );
    expect(greenContainer.querySelector(".bg-green-100")).toBeInTheDocument();
  });
});
