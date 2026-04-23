"use client";

import { useState } from "react";
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
  serviceOrderId?: string | null;
  numero052r?: string | null;
  numero300?: string | null;
}

export function InspectionDetailClient({
  inspectionId,
  inspectionStatus,
  inspectionNotes,
  checklistItems,
  photos,
  isEditable,
  serverPhotoUrls,
  serviceOrderId,
  numero052r,
  numero300,
}: InspectionDetailClientProps) {
  const [photoCount, setPhotoCount] = useState(photos.length);

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
        photoCount={photoCount}
        serviceOrderId={serviceOrderId}
      />

      {/* Photo Capture Section */}
      <PhotoSection
        inspectionId={inspectionId}
        existingPhotos={photos}
        isEditable={isEditable}
        serverPhotoUrls={serverPhotoUrls}
        onPhotoCountChange={setPhotoCount}
        numero052r={numero052r}
        numero300={numero300}
      />
    </>
  );
}
