import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EsqueciSenhaPage from "../esqueci-senha/page";
import RedefinirSenhaPage from "../redefinir-senha/page";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

// Mock Supabase client
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
    },
  }),
}));

describe("EsqueciSenhaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders forgot password form with email field", () => {
    render(<EsqueciSenhaPage />);

    expect(
      screen.getByText("Esqueci minha senha")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enviar link de recuperação" })
    ).toBeInTheDocument();
  });

  it("shows success message after submit", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    render(<EsqueciSenhaPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "test@example.com" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Enviar link de recuperação" })
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Se este e-mail estiver cadastrado, você receberá um link de recuperação"
      );
    });
  });

  it("renders 'Voltar para login' link", () => {
    render(<EsqueciSenhaPage />);

    expect(screen.getByText("Voltar para login")).toBeInTheDocument();
  });
});

describe("RedefinirSenhaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders reset password form with password fields", () => {
    render(<RedefinirSenhaPage />);

    expect(screen.getByRole("heading", { name: "Redefinir senha" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nova senha")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Confirmar nova senha")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Redefinir senha" })
    ).toBeInTheDocument();
  });

  it("shows validation error when password is too short", () => {
    render(<RedefinirSenhaPage />);

    fireEvent.change(screen.getByLabelText("Nova senha"), {
      target: { value: "abc" },
    });

    expect(
      screen.getByText("A senha deve ter no mínimo 6 caracteres.")
    ).toBeInTheDocument();
  });

  it("shows validation error when passwords do not match", () => {
    render(<RedefinirSenhaPage />);

    fireEvent.change(screen.getByLabelText("Nova senha"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "password456" },
    });

    expect(
      screen.getByText("As senhas não coincidem.")
    ).toBeInTheDocument();
  });

  it("button is disabled when form is invalid", () => {
    render(<RedefinirSenhaPage />);

    const button = screen.getByRole("button", { name: "Redefinir senha" });
    expect(button).toBeDisabled();
  });

  it("button is enabled when passwords match and are valid", () => {
    render(<RedefinirSenhaPage />);

    fireEvent.change(screen.getByLabelText("Nova senha"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "password123" },
    });

    const button = screen.getByRole("button", { name: "Redefinir senha" });
    expect(button).toBeEnabled();
  });
});
