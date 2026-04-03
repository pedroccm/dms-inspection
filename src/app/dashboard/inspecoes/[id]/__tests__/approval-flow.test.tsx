import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/inspecoes/test-id",
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock server actions
const mockApproveInspection = vi.fn();
const mockRejectReport = vi.fn();
const mockRejectEquipment = vi.fn();
const mockResumeInspection = vi.fn();

vi.mock("../actions", () => ({
  approveInspection: (...args: unknown[]) => mockApproveInspection(...args),
  rejectReport: (...args: unknown[]) => mockRejectReport(...args),
  rejectEquipment: (...args: unknown[]) => mockRejectEquipment(...args),
  resumeInspection: (...args: unknown[]) => mockResumeInspection(...args),
}));

// Mock auth context for admin
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "admin-1" },
    profile: { id: "admin-1", full_name: "Master User", role: "admin", active: true },
    role: "admin",
    isAdmin: true,
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockApproveInspection.mockResolvedValue({ success: true });
  mockRejectReport.mockResolvedValue({ success: true });
  mockRejectEquipment.mockResolvedValue({ success: true });
  mockResumeInspection.mockResolvedValue({ success: true });
});

describe("ApprovalPanel", () => {
  it("renders 3 action buttons", async () => {
    const { ApprovalPanel } = await import("../approval-panel");
    render(<ApprovalPanel inspectionId="insp-1" />);

    expect(screen.getByTestId("btn-aprovar")).toBeInTheDocument();
    expect(screen.getByTestId("btn-reprovar-relatorio")).toBeInTheDocument();
    expect(screen.getByTestId("btn-reprovar-equipamento")).toBeInTheDocument();
  });

  it("shows confirmation modal when clicking Aprovar", async () => {
    const { ApprovalPanel } = await import("../approval-panel");
    render(<ApprovalPanel inspectionId="insp-1" />);

    fireEvent.click(screen.getByTestId("btn-aprovar"));

    await waitFor(() => {
      expect(screen.getByText(/Aprovar Inspe/)).toBeInTheDocument();
    });
  });

  it("shows reason textarea when clicking Reprovar Relatorio", async () => {
    const { ApprovalPanel } = await import("../approval-panel");
    render(<ApprovalPanel inspectionId="insp-1" />);

    fireEvent.click(screen.getByTestId("btn-reprovar-relatorio"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/problema encontrado no relat/i)).toBeInTheDocument();
    });
  });

  it("shows reason textarea when clicking Reprovar Equipamento", async () => {
    const { ApprovalPanel } = await import("../approval-panel");
    render(<ApprovalPanel inspectionId="insp-1" />);

    fireEvent.click(screen.getByTestId("btn-reprovar-equipamento"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/defeito de fabrica/i)).toBeInTheDocument();
    });
  });

  it("requires reason for equipment rejection (min 10 chars)", async () => {
    const { ApprovalPanel } = await import("../approval-panel");
    render(<ApprovalPanel inspectionId="insp-1" />);

    fireEvent.click(screen.getByTestId("btn-reprovar-equipamento"));

    // Type short reason
    const textarea = screen.getByPlaceholderText(/defeito de fabrica/i);
    fireEvent.change(textarea, { target: { value: "short" } });

    // Click confirm
    fireEvent.click(screen.getByText(/Confirmar Reprova/));

    await waitFor(() => {
      expect(screen.getByText(/pelo menos 10 caracteres/)).toBeInTheDocument();
    });

    // Should NOT have called the action
    expect(mockRejectEquipment).not.toHaveBeenCalled();
  });
});

describe("RejectionBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResumeInspection.mockResolvedValue({ success: true });
  });

  it("shows rejection reason and resume button", async () => {
    const { RejectionBanner } = await import("../rejection-banner");
    render(
      <RejectionBanner
        inspectionId="insp-1"
        rejectionReason="Foto do mecanismo esta desfocada"
      />
    );

    expect(screen.getByText(/Reprovado pelo Master/)).toBeInTheDocument();
    expect(screen.getByText(/Foto do mecanismo esta desfocada/)).toBeInTheDocument();
    expect(screen.getByText("Corrigir e Reenviar")).toBeInTheDocument();
  });

  it("calls resumeInspection when clicking resume button", async () => {
    const { RejectionBanner } = await import("../rejection-banner");
    render(
      <RejectionBanner
        inspectionId="insp-1"
        rejectionReason="Foto desfocada do equipamento"
      />
    );

    fireEvent.click(screen.getByText("Corrigir e Reenviar"));

    await waitFor(() => {
      expect(mockResumeInspection).toHaveBeenCalledWith("insp-1");
    });
  });
});

describe("Status transitions", () => {
  it("approval changes status to aprovado", async () => {
    const { ApprovalPanel } = await import("../approval-panel");
    render(<ApprovalPanel inspectionId="insp-1" />);

    fireEvent.click(screen.getByTestId("btn-aprovar"));

    await waitFor(() => {
      expect(screen.getByText("Sim, confirmar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sim, confirmar"));

    await waitFor(() => {
      expect(mockApproveInspection).toHaveBeenCalledWith("insp-1");
    });
  });
});
