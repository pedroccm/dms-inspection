import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard/equipamentos",
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
  createEquipment: vi.fn(),
}));

describe("CreateEquipmentForm", () => {
  it("renders all 6 form fields", async () => {
    const { CreateEquipmentForm } = await import(
      "../novo/create-equipment-form"
    );
    render(<CreateEquipmentForm />);

    expect(
      screen.getByLabelText(/Código Copel do RA \(Mecanismo\)/)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Código Copel do Controle/)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Número de Série do Mecanismo/)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Número de Série da Caixa de Controle/)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Número de Série do Relé de Proteção/)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Fabricante do Religador/)
    ).toBeInTheDocument();
  });

  it("all fields are required", async () => {
    const { CreateEquipmentForm } = await import(
      "../novo/create-equipment-form"
    );
    render(<CreateEquipmentForm />);

    expect(
      screen.getByLabelText(/Código Copel do RA \(Mecanismo\)/)
    ).toBeRequired();
    expect(
      screen.getByLabelText(/Código Copel do Controle/)
    ).toBeRequired();
    expect(
      screen.getByLabelText(/Número de Série do Mecanismo/)
    ).toBeRequired();
    expect(
      screen.getByLabelText(/Número de Série da Caixa de Controle/)
    ).toBeRequired();
    expect(
      screen.getByLabelText(/Número de Série do Relé de Proteção/)
    ).toBeRequired();
    expect(
      screen.getByLabelText(/Fabricante do Religador/)
    ).toBeRequired();
  });

  it("renders Cadastrar and Cancelar buttons", async () => {
    const { CreateEquipmentForm } = await import(
      "../novo/create-equipment-form"
    );
    render(<CreateEquipmentForm />);

    expect(screen.getByText("Cadastrar")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });
});

describe("EquipmentSearch", () => {
  it("renders search input and button", async () => {
    const { EquipmentSearch } = await import("../equipment-search");
    render(<EquipmentSearch />);

    expect(
      screen.getByPlaceholderText("Buscar por Código Copel RA...")
    ).toBeInTheDocument();
    expect(screen.getByText("Buscar")).toBeInTheDocument();
  });

  it("renders Limpar button when defaultValue is set", async () => {
    const { EquipmentSearch } = await import("../equipment-search");
    render(<EquipmentSearch defaultValue="ABC-123" />);

    expect(screen.getByText("Limpar")).toBeInTheDocument();
  });

  it("does not render Limpar button when no defaultValue", async () => {
    const { EquipmentSearch } = await import("../equipment-search");
    render(<EquipmentSearch />);

    expect(screen.queryByText("Limpar")).not.toBeInTheDocument();
  });
});
