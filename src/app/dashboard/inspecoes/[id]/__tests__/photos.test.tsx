import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { Photo } from "@/lib/types";
import {
  DEFAULT_PHOTO_TYPES,
  PHOTO_TYPE_LABELS,
  MIN_PHOTOS,
  MAX_PHOTOS,
  getPhotoLabel,
} from "@/lib/types";

// Mock storage functions
vi.mock("@/lib/storage", () => ({
  uploadInspectionPhoto: vi.fn(),
  deleteInspectionPhoto: vi.fn(),
  getPhotoUrl: vi.fn().mockResolvedValue("https://example.com/signed-url.jpg"),
}));

// Mock supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: vi.fn(),
        remove: vi.fn(),
        createSignedUrl: vi
          .fn()
          .mockResolvedValue({
            data: { signedUrl: "https://example.com/signed-url.jpg" },
          }),
      }),
    },
    from: () => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "photo-1",
    inspection_id: "insp-1",
    photo_type: "mechanism_front",
    label: null,
    storage_path: "inspections/insp-1/mechanism_front_123.jpg",
    file_size: 1024000,
    uploaded_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

async function renderPhotoSection(
  existingPhotos: Photo[] = [],
  isEditable = true
) {
  const { PhotoSection } = await import("../photo-section");
  return render(
    <PhotoSection
      inspectionId="insp-1"
      existingPhotos={existingPhotos}
      isEditable={isEditable}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PhotoSection - Rendering", () => {
  it("renders 6 default photo slots with correct labels", async () => {
    await renderPhotoSection();

    for (const type of DEFAULT_PHOTO_TYPES) {
      expect(screen.getByText(PHOTO_TYPE_LABELS[type])).toBeInTheDocument();
    }
  });

  it("shows 'Tirar Foto' button for empty slots", async () => {
    await renderPhotoSection();

    const buttons = screen.getAllByText("Tirar Foto");
    expect(buttons).toHaveLength(7);
  });

  it("shows progress indicator for required photos when empty", async () => {
    await renderPhotoSection();

    expect(
      screen.getByText(`0 de ${MIN_PHOTOS} fotos obrigatórias`)
    ).toBeInTheDocument();
  });

  it("shows correct progress count with existing photos", async () => {
    const photos = [
      makePhoto({ id: "p1", photo_type: "mechanism_front" }),
      makePhoto({
        id: "p2",
        photo_type: "mechanism_back",
        storage_path: "inspections/insp-1/mechanism_back_123.jpg",
      }),
      makePhoto({
        id: "p3",
        photo_type: "relay_front",
        storage_path: "inspections/insp-1/relay_front_123.jpg",
      }),
    ];

    await renderPhotoSection(photos);

    expect(
      screen.getByText(`3 de ${MIN_PHOTOS} fotos obrigatórias`)
    ).toBeInTheDocument();
  });

  it("shows section title", async () => {
    await renderPhotoSection();

    expect(
      screen.getByText("Coleta de Imagens do Equipamento")
    ).toBeInTheDocument();
  });
});

describe("PhotoSection - Photo slots with existing photos", () => {
  it("shows 'Substituir' and 'Remover' buttons for slots with photos", async () => {
    const photos = [makePhoto()];

    await renderPhotoSection(photos);

    await waitFor(() => {
      expect(screen.getByText("Substituir")).toBeInTheDocument();
      expect(screen.getByText("Remover")).toBeInTheDocument();
    });
  });

  it("shows thumbnail image for existing photo", async () => {
    const photos = [makePhoto()];

    await renderPhotoSection(photos);

    await waitFor(() => {
      const img = screen.getByAltText("Foto Placa Mecanismo");
      expect(img).toBeInTheDocument();
    });
  });

  it("shows 'Tirar Foto' only for empty slots when some photos exist", async () => {
    const photos = [makePhoto({ id: "p1", photo_type: "mechanism_front" })];

    await renderPhotoSection(photos);

    await waitFor(() => {
      const buttons = screen.getAllByText("Tirar Foto");
      expect(buttons).toHaveLength(6);
    });
  });
});

describe("PhotoSection - Read-only mode", () => {
  it("hides 'Tirar Foto' buttons when not editable", async () => {
    await renderPhotoSection([], false);

    expect(screen.queryByText("Tirar Foto")).not.toBeInTheDocument();
  });

  it("hides 'Substituir' and 'Remover' buttons when not editable", async () => {
    const photos = [makePhoto()];

    await renderPhotoSection(photos, false);

    // Wait for signed URLs to load, then verify buttons are hidden
    await waitFor(() => {
      expect(
        screen.getByAltText("Foto Placa Mecanismo")
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Substituir")).not.toBeInTheDocument();
    expect(screen.queryByText("Remover")).not.toBeInTheDocument();
  });
});

describe("PhotoSection - File input attributes", () => {
  it("each default file input has correct accept and capture attributes", async () => {
    await renderPhotoSection();

    for (const type of DEFAULT_PHOTO_TYPES) {
      const input = screen.getByTestId(
        `file-input-${type}`
      ) as HTMLInputElement;
      expect(input).toHaveAttribute("accept", "image/*");
      expect(input).toHaveAttribute("capture", "environment");
      expect(input.type).toBe("file");
    }
  });
});

describe("PhotoSection - Dynamic photos (RF-08)", () => {
  it("shows 'Adicionar Foto' button when editable", async () => {
    await renderPhotoSection();

    expect(screen.getByTestId("add-photo-btn")).toBeInTheDocument();
    expect(
      screen.getByText(`Adicionar Foto (7/${MAX_PHOTOS})`)
    ).toBeInTheDocument();
  });

  it("hides 'Adicionar Foto' button when not editable", async () => {
    await renderPhotoSection([], false);

    expect(screen.queryByTestId("add-photo-btn")).not.toBeInTheDocument();
  });

  it("adds a new dynamic slot when clicking 'Adicionar Foto'", async () => {
    await renderPhotoSection();

    fireEvent.click(screen.getByTestId("add-photo-btn"));

    expect(screen.getByText("Foto 7")).toBeInTheDocument();
    expect(
      screen.getByText(`Adicionar Foto (8/${MAX_PHOTOS})`)
    ).toBeInTheDocument();
  });

  it("adds multiple dynamic slots with sequential numbering", async () => {
    await renderPhotoSection();

    fireEvent.click(screen.getByTestId("add-photo-btn"));
    fireEvent.click(screen.getByTestId("add-photo-btn"));
    fireEvent.click(screen.getByTestId("add-photo-btn"));

    expect(screen.getByText("Foto 7")).toBeInTheDocument();
    expect(screen.getByText("Foto 8")).toBeInTheDocument();
    expect(screen.getByText("Foto 9")).toBeInTheDocument();
  });

  it("shows remove button on dynamic empty slots", async () => {
    await renderPhotoSection();

    fireEvent.click(screen.getByTestId("add-photo-btn"));

    expect(screen.getByTestId("remove-slot-photo_7")).toBeInTheDocument();
  });

  it("removes a dynamic slot when clicking remove", async () => {
    await renderPhotoSection();

    fireEvent.click(screen.getByTestId("add-photo-btn"));
    expect(screen.getByText("Foto 7")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("remove-slot-photo_7"));
    expect(screen.queryByText("Foto 7")).not.toBeInTheDocument();
  });

  it("marks required slots with asterisk", async () => {
    await renderPhotoSection();

    // 7 required markers for the default slots
    const requiredMarkers = screen.getAllByTitle("Obrigatória");
    expect(requiredMarkers).toHaveLength(7);
  });

  it("renders existing dynamic photos from DB", async () => {
    const photos = [
      makePhoto({ id: "p1", photo_type: "mechanism_front" }),
      makePhoto({
        id: "p7",
        photo_type: "photo_7",
        label: "Painel Lateral",
        storage_path: "inspections/insp-1/photo_7_123.jpg",
      }),
    ];

    await renderPhotoSection(photos);

    // The dynamic photo should appear with its custom label
    expect(screen.getByText("Painel Lateral")).toBeInTheDocument();
  });

  it("shows progress as complete when all required photos captured", async () => {
    const photos = DEFAULT_PHOTO_TYPES.map((type, i) =>
      makePhoto({
        id: `p${i}`,
        photo_type: type,
        storage_path: `inspections/insp-1/${type}_123.jpg`,
      })
    );

    await renderPhotoSection(photos);

    expect(
      screen.getByText("7 fotos capturadas")
    ).toBeInTheDocument();
  });
});

describe("getPhotoLabel", () => {
  it("returns default label for known types", () => {
    expect(getPhotoLabel("mechanism_front")).toBe("Foto Placa Mecanismo");
    expect(getPhotoLabel("mechanism_back")).toBe("Foto Mecanismo");
    expect(getPhotoLabel("relay_label")).toBe("Foto Etiqueta Relé");
  });

  it("returns custom label when provided", () => {
    expect(getPhotoLabel("photo_7", "Painel Lateral")).toBe("Painel Lateral");
  });

  it("returns auto-generated label for dynamic types without custom label", () => {
    expect(getPhotoLabel("photo_7")).toBe("Foto 7");
    expect(getPhotoLabel("photo_15")).toBe("Foto 15");
  });

  it("returns the type string as fallback for unknown types", () => {
    expect(getPhotoLabel("unknown_type")).toBe("unknown_type");
  });
});
