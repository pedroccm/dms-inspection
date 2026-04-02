import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock supabase client
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignOut = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
    from: () => ({
      select: mockSelect,
    }),
  }),
}));

function TestConsumer() {
  const { user, profile, role, isAdmin, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <span data-testid="user">{user?.id ?? "no-user"}</span>
      <span data-testid="profile">{profile?.full_name ?? "no-profile"}</span>
      <span data-testid="role">{role ?? "no-role"}</span>
      <span data-testid="is-admin">{isAdmin ? "yes" : "no"}</span>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it("should provide user data for admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "admin@test.com" } },
    });
    mockSingle.mockResolvedValue({
      data: {
        id: "user-1",
        full_name: "Admin User",
        role: "admin",
        active: true,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("user-1");
    });

    expect(screen.getByTestId("profile").textContent).toBe("Admin User");
    expect(screen.getByTestId("role").textContent).toBe("admin");
    expect(screen.getByTestId("is-admin").textContent).toBe("yes");
  });

  it("should return isAdmin=false for inspector", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-2", email: "inspector@test.com" } },
    });
    mockSingle.mockResolvedValue({
      data: {
        id: "user-2",
        full_name: "Inspector User",
        role: "inspector",
        active: true,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("user-2");
    });

    expect(screen.getByTestId("role").textContent).toBe("inspector");
    expect(screen.getByTestId("is-admin").textContent).toBe("no");
  });

  it("should handle no user (unauthenticated)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("no-user");
    });

    expect(screen.getByTestId("profile").textContent).toBe("no-profile");
    expect(screen.getByTestId("role").textContent).toBe("no-role");
    expect(screen.getByTestId("is-admin").textContent).toBe("no");
  });
});
