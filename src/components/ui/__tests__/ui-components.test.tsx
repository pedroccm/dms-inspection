import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../button";
import { Input } from "../input";
import { Badge } from "../badge";
import { Select } from "../select";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("shows loading state with spinner", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("handles disabled state", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    );
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
  });

  it("applies variant classes", () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("bg-red-600");
  });

  it("supports fullWidth", () => {
    render(<Button fullWidth>Full</Button>);
    const button = screen.getByRole("button", { name: "Full" });
    expect(button.className).toContain("w-full");
  });
});

describe("Input", () => {
  it("renders with label", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<Input label="Email" error="Required field" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required field");
  });

  it("shows required indicator", () => {
    render(<Input label="Name" required />);
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("renders different input types", () => {
    render(<Input label="Password" type="password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });
});

describe("Badge", () => {
  it("renders with text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies success variant styles", () => {
    render(<Badge variant="success">Ativo</Badge>);
    const badge = screen.getByText("Ativo");
    expect(badge.className).toContain("bg-green-100");
    expect(badge.className).toContain("text-green-800");
  });

  it("applies danger variant styles", () => {
    render(<Badge variant="danger">Inativo</Badge>);
    const badge = screen.getByText("Inativo");
    expect(badge.className).toContain("bg-red-100");
  });

  it("applies warning variant styles", () => {
    render(<Badge variant="warning">Pendente</Badge>);
    const badge = screen.getByText("Pendente");
    expect(badge.className).toContain("bg-yellow-100");
  });

  it("defaults to neutral variant", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge.className).toContain("bg-gray-100");
  });
});

describe("Select", () => {
  const options = [
    { value: "admin", label: "Master" },
    { value: "inspector", label: "Executor" },
    { value: "reviewer", label: "Revisor" },
  ];

  it("renders with label", () => {
    render(<Select label="Role" options={options} />);
    expect(screen.getByLabelText("Role")).toBeInTheDocument();
  });

  it("renders all options", () => {
    render(<Select label="Role" options={options} />);
    expect(screen.getByRole("option", { name: "Master" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Executor" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Revisor" })).toBeInTheDocument();
  });

  it("renders placeholder option", () => {
    render(<Select label="Role" options={options} placeholder="Selecione..." />);
    expect(screen.getByRole("option", { name: "Selecione..." })).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<Select label="Role" options={options} error="Campo obrigatório" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Campo obrigatório");
  });
});
