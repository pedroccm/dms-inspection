import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard/usuarios",
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
  createUser: vi.fn(),
  updateUser: vi.fn(),
  toggleUserActive: vi.fn(),
}));

describe("ToggleActiveButton", () => {
  it("renders Desativar for active users", async () => {
    const { ToggleActiveButton } = await import("../toggle-active-button");
    render(<ToggleActiveButton userId="1" active={true} />);
    expect(screen.getByText("Desativar")).toBeInTheDocument();
  });

  it("renders Ativar for inactive users", async () => {
    const { ToggleActiveButton } = await import("../toggle-active-button");
    render(<ToggleActiveButton userId="1" active={false} />);
    expect(screen.getByText("Ativar")).toBeInTheDocument();
  });
});

describe("CreateUserForm", () => {
  it("renders all form fields", async () => {
    const { CreateUserForm } = await import("../novo/create-user-form");
    render(<CreateUserForm />);

    expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Função")).toBeInTheDocument();
    expect(screen.getByText("Criar Usuário")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("has required attributes on inputs", async () => {
    const { CreateUserForm } = await import("../novo/create-user-form");
    render(<CreateUserForm />);

    expect(screen.getByLabelText("Nome completo")).toBeRequired();
    expect(screen.getByLabelText("E-mail")).toBeRequired();
    expect(screen.getByLabelText("Senha")).toBeRequired();
    expect(screen.getByLabelText("Função")).toBeRequired();
  });

  it("has minimum length on password field", async () => {
    const { CreateUserForm } = await import("../novo/create-user-form");
    render(<CreateUserForm />);

    const passwordInput = screen.getByLabelText("Senha");
    expect(passwordInput).toHaveAttribute("minLength", "6");
  });
});

describe("EditUserForm", () => {
  it("renders with pre-filled data", async () => {
    const { EditUserForm } = await import("../[id]/editar/edit-user-form");
    const profile = {
      id: "abc-123",
      full_name: "João Silva",
      role: "inspector" as const,
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    render(<EditUserForm profile={profile} email="joao@example.com" />);

    expect(screen.getByLabelText("Nome completo")).toHaveValue("João Silva");
    expect(screen.getByLabelText("E-mail")).toHaveValue("joao@example.com");
    expect(screen.getByLabelText("E-mail")).toBeDisabled();
    expect(screen.getByLabelText("Função")).toHaveValue("inspector");
    expect(screen.getByText("Salvar")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });
});
