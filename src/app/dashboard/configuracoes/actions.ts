"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

const VALID_RETENTION_DAYS = [7, 15, 30, 60, 90];

export async function getRetentionSetting(): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "retention_days")
    .single();

  if (error || !data) return 30;
  return parseInt(data.value as string, 10) || 30;
}

export async function updateRetentionPeriod(days: number) {
  await requireAdmin();

  if (!VALID_RETENTION_DAYS.includes(days)) {
    return { success: false, error: "Período de retenção inválido." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("settings")
    .upsert(
      { key: "retention_days", value: String(days), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function executeCleanup(): Promise<{
  success: boolean;
  error?: string;
  summary?: { inspections: number; photos: number };
}> {
  await requireAdmin();

  const supabase = createAdminClient();

  // Get retention period
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "retention_days")
    .single();

  const retentionDays = parseInt(setting?.value as string, 10) || 30;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffISO = cutoffDate.toISOString();

  // Find transferred inspections older than retention period
  const { data: inspections, error: fetchError } = await supabase
    .from("inspections")
    .select("id")
    .eq("status", "transferred")
    .lt("updated_at", cutoffISO);

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!inspections || inspections.length === 0) {
    return {
      success: true,
      summary: { inspections: 0, photos: 0 },
    };
  }

  const inspectionIds = inspections.map((i) => i.id);
  let photosDeleted = 0;

  // For each inspection, delete photos from storage and DB
  for (const inspId of inspectionIds) {
    const { data: photos } = await supabase
      .from("photos")
      .select("id, storage_path")
      .eq("inspection_id", inspId);

    if (photos && photos.length > 0) {
      const paths = photos.map((p) => p.storage_path);
      await supabase.storage.from("inspection-photos").remove(paths);

      await supabase
        .from("photos")
        .delete()
        .eq("inspection_id", inspId);

      photosDeleted += photos.length;
    }

    // Delete checklist items
    await supabase
      .from("checklist_items")
      .delete()
      .eq("inspection_id", inspId);

    // Delete audit logs for this inspection
    await supabase
      .from("audit_logs")
      .delete()
      .eq("table_name", "inspections")
      .eq("record_id", inspId);
  }

  // Delete the inspections themselves
  const { error: deleteError } = await supabase
    .from("inspections")
    .delete()
    .in("id", inspectionIds);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  return {
    success: true,
    summary: {
      inspections: inspectionIds.length,
      photos: photosDeleted,
    },
  };
}
