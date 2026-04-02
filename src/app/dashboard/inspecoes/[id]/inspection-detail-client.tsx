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
  const { isLocked, lockedBy, lockedAt, loading } =
    useFormLock(inspectionId);

  // While checking lock status, show a subtle loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-full" />
        </div>
      </div>
    );
  }

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

      {/* Interactive Checklist Form (US-302 + US-303) */}
      <ChecklistForm
        checklistItems={checklistItems}
        inspectionId={inspectionId}
        inspectionStatus={
          effectiveEditable ? inspectionStatus : "submitted"
        }
        inspectionNotes={inspectionNotes}
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
