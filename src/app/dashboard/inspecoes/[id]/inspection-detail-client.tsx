"use client";

import { ChecklistSummary } from "./checklist-summary";
import { ChecklistForm } from "./checklist-form";
import { PhotoSection } from "./photo-section";
import type { ChecklistItem, InspectionStatus, Photo } from "@/lib/types";

interface InspectionDetailClientProps {
  inspectionId: string;
  inspectionStatus: InspectionStatus;
  inspectionNotes: string | null;
  checklistItems: ChecklistItem[];
  photos: Photo[];
  isEditable: boolean;
  serverPhotoUrls?: Record<string, string>;
}

export function InspectionDetailClient({
  inspectionId,
  inspectionStatus,
  inspectionNotes,
  checklistItems,
  photos,
  isEditable,
  serverPhotoUrls,
}: InspectionDetailClientProps) {
  return (
    <>
      {/* Checklist Summary */}
      <ChecklistSummary items={checklistItems} />

      {/* Interactive Checklist Form */}
      <ChecklistForm
        checklistItems={checklistItems}
        inspectionId={inspectionId}
        inspectionStatus={isEditable ? inspectionStatus : "aprovado"}
        inspectionNotes={inspectionNotes}
        photoCount={photos.length}
      />

      {/* Photo Capture Section */}
      <PhotoSection
        inspectionId={inspectionId}
        existingPhotos={photos}
        isEditable={isEditable}
        serverPhotoUrls={serverPhotoUrls}
      />
    </>
  );
}
