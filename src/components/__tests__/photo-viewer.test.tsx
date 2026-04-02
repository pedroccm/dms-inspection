import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhotoViewer } from "../photo-viewer";
import type { PhotoViewerItem } from "../photo-viewer";

function makePhotos(count: number): PhotoViewerItem[] {
  return Array.from({ length: count }, (_, i) => ({
    url: `https://example.com/photo-${i + 1}.jpg`,
    label: `Foto ${i + 1}`,
  }));
}

describe("PhotoViewer", () => {
  it("renders the photo label", () => {
    const photos = makePhotos(3);
    render(
      <PhotoViewer
        photos={photos}
        currentIndex={1}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByTestId("photo-viewer-label")).toHaveTextContent(
      "Foto 2"
    );
  });

  it("renders the photo counter (X de Y)", () => {
    const photos = makePhotos(6);
    render(
      <PhotoViewer
        photos={photos}
        currentIndex={2}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByTestId("photo-viewer-counter")).toHaveTextContent(
      "3 de 6"
    );
  });

  it("shows both navigation arrows for a middle photo", () => {
    const photos = makePhotos(3);
    render(
      <PhotoViewer
        photos={photos}
        currentIndex={1}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByTestId("photo-viewer-prev")).toBeInTheDocument();
    expect(screen.getByTestId("photo-viewer-next")).toBeInTheDocument();
  });

  it("hides previous arrow on the first photo", () => {
    const photos = makePhotos(3);
    render(
      <PhotoViewer
        photos={photos}
        currentIndex={0}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.queryByTestId("photo-viewer-prev")).not.toBeInTheDocument();
    expect(screen.getByTestId("photo-viewer-next")).toBeInTheDocument();
  });

  it("hides next arrow on the last photo", () => {
    const photos = makePhotos(3);
    render(
      <PhotoViewer
        photos={photos}
        currentIndex={2}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByTestId("photo-viewer-prev")).toBeInTheDocument();
    expect(screen.queryByTestId("photo-viewer-next")).not.toBeInTheDocument();
  });
});
