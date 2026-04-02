import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { Photo, PhotoType } from "@/lib/types";
import { PHOTO_TYPE_LABELS } from "@/lib/types";

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
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://example.com/signed-url.jpg" } }),
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

const PHOTO_TYPES: PhotoType[] = [
  "mechanism_front",
  "mechanism_back",
  "control_front_closed",
  "control_mirror_closed",
  "relay_front",
  "control_internal",
];

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "photo-1",
    inspection_id: "insp-1",
    photo_type: "mechanism_front",
    storage_path: "inspections/insp-1/mechanism_front_123.jpg",
    file_size: 1024000,
    caption: null,
    uploaded_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
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
  it("renders 6 photo slots with correct labels", async () => {
    await renderPhotoSection();

    for (const type of PHOTO_TYPES) {
      expect(screen.getByText(PHOTO_TYPE_LABELS[type])).toBeInTheDocument();
    }
  });

  it("shows 'Tirar Foto' button for empty slots", async () => {
    await renderPhotoSection();

    const buttons = screen.getAllByText("Tirar Foto");
    expect(buttons).toHaveLength(6);
  });

  it("shows progress indicator '0 de 6 fotos capturadas' when empty", async () => {
    await renderPhotoSection();

    expect(screen.getByText("0 de 6 fotos capturadas")).toBeInTheDocument();
  });

  it("shows correct progress count with existing photos", async () => {
    const photos = [
      makePhoto({ id: "p1", photo_type: "mechanism_front" }),
      makePhoto({ id: "p2", photo_type: "mechanism_back", storage_path: "inspections/insp-1/mechanism_back_123.jpg" }),
      makePhoto({ id: "p3", photo_type: "relay_front", storage_path: "inspections/insp-1/relay_front_123.jpg" }),
    ];

    await renderPhotoSection(photos);

    expect(screen.getByText("3 de 6 fotos capturadas")).toBeInTheDocument();
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
      const img = screen.getByAltText("Foto Mecanismo Frente");
      expect(img).toBeInTheDocument();
    });
  });

  it("shows 'Tirar Foto' only for empty slots when some photos exist", async () => {
    const photos = [
      makePhoto({ id: "p1", photo_type: "mechanism_front" }),
    ];

    await renderPhotoSection(photos);

    await waitFor(() => {
      const buttons = screen.getAllByText("Tirar Foto");
      expect(buttons).toHaveLength(5);
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
      expect(screen.getByAltText("Foto Mecanismo Frente")).toBeInTheDocument();
    });

    expect(screen.queryByText("Substituir")).not.toBeInTheDocument();
    expect(screen.queryByText("Remover")).not.toBeInTheDocument();
  });
});

describe("PhotoSection - File input attributes", () => {
  it("each file input has correct accept and capture attributes", async () => {
    await renderPhotoSection();

    for (const type of PHOTO_TYPES) {
      const input = screen.getByTestId(`file-input-${type}`) as HTMLInputElement;
      expect(input).toHaveAttribute("accept", "image/*");
      expect(input).toHaveAttribute("capture", "environment");
      expect(input.type).toBe("file");
    }
  });
});
