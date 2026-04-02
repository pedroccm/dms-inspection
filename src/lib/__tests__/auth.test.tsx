import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminOnly } from "@/components/admin-only";
import type { Profile, UserRole } from "@/lib/types";

// Mock the auth context
const mockUseAuth = vi.fn();
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("Types", () => {
  it("should define UserRole as admin or inspector", () => {
    const admin: UserRole = "admin";
    const inspector: UserRole = "inspector";

    expect(admin).toBe("admin");
    expect(inspector).toBe("inspector");
  });

  it("should define Profile with correct shape", () => {
    const profile: Profile = {
      id: "123",
      full_name: "Test User",
      role: "admin",
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    expect(profile.id).toBe("123");
    expect(profile.full_name).toBe("Test User");
    expect(profile.role).toBe("admin");
    expect(profile.active).toBe(true);
    expect(profile.created_at).toBeDefined();
    expect(profile.updated_at).toBeDefined();
  });

  it("should allow inspector role in Profile", () => {
    const profile: Profile = {
      id: "456",
      full_name: "Inspector User",
      role: "inspector",
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    expect(profile.role).toBe("inspector");
  });
});

describe("AdminOnly", () => {
  it("should render children when user is admin", () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, loading: false });

    render(
      <AdminOnly>
        <span>Admin Content</span>
      </AdminOnly>
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("should not render children when user is inspector", () => {
    mockUseAuth.mockReturnValue({ isAdmin: false, loading: false });

    render(
      <AdminOnly>
        <span>Admin Content</span>
      </AdminOnly>
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("should render fallback for non-admin users", () => {
    mockUseAuth.mockReturnValue({ isAdmin: false, loading: false });

    render(
      <AdminOnly fallback={<span>Sem permissão</span>}>
        <span>Admin Content</span>
      </AdminOnly>
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    expect(screen.getByText("Sem permissão")).toBeInTheDocument();
  });

  it("should render nothing while loading", () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, loading: true });

    const { container } = render(
      <AdminOnly>
        <span>Admin Content</span>
      </AdminOnly>
    );

    expect(container.innerHTML).toBe("");
  });
});
