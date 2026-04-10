"use client";

import { useFormLock } from "@/hooks/use-form-lock";
import { FormLockBanner } from "@/components/form-lock-banner";
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
}

export function InspectionDetailClient({
  inspectionId,
  inspectionStatus,
  inspectionNotes,
  checklistItems,
  photos,
  isEditable,
}: InspectionDetailClientProps) {
  const { isLocked, lockedBy, lockedAt } =
    useFormLock(inspectionId);

  // If locked by another user, override editable to false
  const effectiveEditable = isEditable && !isLocked;

  return (
    <>
      {/* Lock banner */}
      {isLocked && lockedBy && (
        <FormLockBanner lockedBy={lockedBy} lockedAt={lockedAt} />
      )}

      {/* Checklist Summary (US-304) */}
      <ChecklistSummary items={checklistItems} />

      {/* Interactive Checklist Form (US-302 + US-303 + US-306) */}
      <ChecklistForm
        checklistItems={checklistItems}
        inspectionId={inspectionId}
        inspectionStatus={
          effectiveEditable ? inspectionStatus : "aprovado"
        }
        inspectionNotes={inspectionNotes}
        photoCount={photos.length}
      />

      {/* Photo Capture Section (US-401 + US-402) */}
      <PhotoSection
        inspectionId={inspectionId}
        existingPhotos={photos}
        isEditable={effectiveEditable}
      />
    </>
  );
}
