import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination } from "../pagination";

describe("Pagination", () => {
  it("renders page info", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        basePath="/dashboard/equipamentos"
      />
    );
    expect(screen.getByText("Página 2 de 5")).toBeInTheDocument();
  });

  it("disables previous button on first page", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        basePath="/dashboard/equipamentos"
      />
    );
    const prev = screen.getByText("Anterior");
    expect(prev).toHaveAttribute("aria-disabled", "true");
    expect(prev.tagName).toBe("SPAN");
  });

  it("disables next button on last page", () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={5}
        basePath="/dashboard/equipamentos"
      />
    );
    const next = screen.getByText("Próxima");
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next.tagName).toBe("SPAN");
  });

  it("does not render when totalPages is 1", () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={1}
        basePath="/dashboard/equipamentos"
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("highlights current page", () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        basePath="/dashboard/equipamentos"
      />
    );
    const currentLink = screen.getByText("3");
    expect(currentLink).toHaveAttribute("aria-current", "page");
    expect(currentLink.className).toContain("bg-blue-600");
  });
});
