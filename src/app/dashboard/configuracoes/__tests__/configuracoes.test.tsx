import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard/configuracoes",
  redirect: vi.fn(),
}));

// Mock auth context as admin
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
  getRetentionSetting: vi.fn().mockResolvedValue(30),
  updateRetentionPeriod: vi.fn().mockResolvedValue({ success: true }),
  executeCleanup: vi
    .fn()
    .mockResolvedValue({ success: true, summary: { inspections: 0, photos: 0 } }),
}));

describe("ConfiguracoesPage", () => {
  it("renders the page title and retention section", async () => {
    const { default: ConfiguracoesPage } = await import("../page");
    render(<ConfiguracoesPage />);

    // Wait for async loading to finish
    const heading = await screen.findByText("Configuracoes");
    expect(heading).toBeInTheDocument();

    expect(
      screen.getByText("Politica de Retencao de Dados")
    ).toBeInTheDocument();
  });

  it("renders retention select with correct options", async () => {
    const { default: ConfiguracoesPage } = await import("../page");
    render(<ConfiguracoesPage />);

    const select = await screen.findByLabelText("Periodo de retencao");
    expect(select).toBeInTheDocument();

    expect(screen.getByText("7 dias")).toBeInTheDocument();
    expect(screen.getByText("15 dias")).toBeInTheDocument();
    expect(screen.getByText("30 dias")).toBeInTheDocument();
    expect(screen.getByText("60 dias")).toBeInTheDocument();
    expect(screen.getByText("90 dias")).toBeInTheDocument();
  });

  it("renders save button", async () => {
    const { default: ConfiguracoesPage } = await import("../page");
    render(<ConfiguracoesPage />);

    const saveBtn = await screen.findByText("Salvar");
    expect(saveBtn).toBeInTheDocument();
  });

  it("renders cleanup button", async () => {
    const { default: ConfiguracoesPage } = await import("../page");
    render(<ConfiguracoesPage />);

    const cleanupBtn = await screen.findByText("Executar Limpeza");
    expect(cleanupBtn).toBeInTheDocument();
  });

  it("renders manual cleanup section", async () => {
    const { default: ConfiguracoesPage } = await import("../page");
    render(<ConfiguracoesPage />);

    const heading = await screen.findByText("Limpeza Manual");
    expect(heading).toBeInTheDocument();
  });
});

describe("AdminOnly wrapper", () => {
  it("does not show access denied for admin users and renders content", async () => {
    const { default: ConfiguracoesPage } = await import("../page");
    render(<ConfiguracoesPage />);

    // Wait for content to load
    await screen.findByText("Configuracoes");

    // Verify the page does NOT show fallback when admin
    expect(
      screen.queryByText("Acesso restrito a administradores.")
    ).not.toBeInTheDocument();

    // Verify the settings content is rendered
    expect(screen.getByLabelText("Periodo de retencao")).toBeInTheDocument();
  });
});
