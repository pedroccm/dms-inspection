import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "../page";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock Supabase client
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
    from: mockFrom,
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form with email and password fields", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  });

  it('renders "Entrar" button', () => {
    render(<LoginPage />);

    const button = screen.getByRole("button", { name: "Entrar" });
    expect(button).toBeInTheDocument();
  });

  it("button is disabled when fields are empty", () => {
    render(<LoginPage />);

    const button = screen.getByRole("button", { name: "Entrar" });
    expect(button).toBeDisabled();
  });

  it("button is enabled when both fields have values", () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "teste@dms.eng.br" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "password123" },
    });

    const button = screen.getByRole("button", { name: "Entrar" });
    expect(button).toBeEnabled();
  });

  it('shows loading state "Entrando..." when submitting', async () => {
    // Make signIn hang so we can observe loading state
    mockSignInWithPassword.mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "teste@dms.eng.br" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Entrando..." })
      ).toBeInTheDocument();
    });
  });

  it("displays error message on failed login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "teste@dms.eng.br" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "wrongpassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "E-mail ou senha inválidos"
      );
    });
  });
});
