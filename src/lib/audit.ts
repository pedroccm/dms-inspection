import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditLog, FormattedAuditEntry, ChecklistItemStatus, InspectionStatus } from "@/lib/types";

// ─── Status label maps ─────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  in_progress: "Em Andamento",
  ready_for_review: "Pronta para Revisão",
  submitted: "Enviada",
  transferred: "Transferida",
};

const CHECKLIST_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  na: "N/A",
};

const TABLE_LABELS: Record<string, string> = {
  inspections: "inspeção",
  checklist_items: "item do checklist",
  equipment: "equipamento",
};

// ─── Fetch helpers ──────────────────────────────────────────────

export async function getAuditLogs(
  tableName: string,
  recordId: string
): Promise<AuditLog[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("table_name", tableName)
    .eq("record_id", recordId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Fetch user names for all unique user_ids
  const logs = (data ?? []) as AuditLog[];
  return await attachUserNames(logs);
}

export async function getInspectionAuditLogs(
  inspectionId: string
): Promise<FormattedAuditEntry[]> {
  const supabase = createAdminClient();

  // 1. Logs for the inspection itself
  const { data: inspLogs, error: inspError } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("table_name", "inspections")
    .eq("record_id", inspectionId)
    .order("created_at", { ascending: false });

  if (inspError) throw inspError;

  // 2. Get checklist item IDs for this inspection
  const { data: items } = await supabase
    .from("checklist_items")
    .select("id")
    .eq("inspection_id", inspectionId);

  const itemIds = (items ?? []).map((i) => i.id);

  let checklistLogs: AuditLog[] = [];
  if (itemIds.length > 0) {
    const { data: clLogs, error: clError } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("table_name", "checklist_items")
      .in("record_id", itemIds)
      .order("created_at", { ascending: false });

    if (clError) throw clError;
    checklistLogs = (clLogs ?? []) as AuditLog[];
  }

  // Combine and sort
  const allLogs = [...((inspLogs ?? []) as AuditLog[]), ...checklistLogs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Attach user names
  const enriched = await attachUserNames(allLogs);

  // Format for display
  return enriched.map(formatAuditEntry);
}

// ─── User name resolution ───────────────────────────────────────

async function attachUserNames(logs: AuditLog[]): Promise<AuditLog[]> {
  const supabase = createAdminClient();

  const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[];
  if (userIds.length === 0) return logs;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  return logs.map((log) => ({
    ...log,
    user: log.user_id ? profileMap.get(log.user_id) ?? null : null,
  }));
}

// ─── Formatting ─────────────────────────────────────────────────

export function formatAuditEntry(log: AuditLog): FormattedAuditEntry {
  const userName = log.user?.full_name ?? "Sistema";
  const description = buildDescription(log, userName);

  return {
    id: log.id,
    date: log.created_at,
    userName,
    description,
    action: log.action,
    tableName: log.table_name,
  };
}

function buildDescription(log: AuditLog, userName: string): string {
  const tableLabel = TABLE_LABELS[log.table_name] ?? log.table_name;

  if (log.action === "insert") {
    return `${userName} criou ${tableLabel}`;
  }

  if (log.action === "delete") {
    return `${userName} removeu ${tableLabel}`;
  }

  // UPDATE - describe what changed
  if (!log.old_data || !log.new_data) {
    return `${userName} alterou ${tableLabel}`;
  }

  const changes: string[] = [];

  // Inspection status change
  if (log.table_name === "inspections" && log.old_data.status !== log.new_data.status) {
    const oldLabel = STATUS_LABELS[log.old_data.status as string] ?? String(log.old_data.status);
    const newLabel = STATUS_LABELS[log.new_data.status as string] ?? String(log.new_data.status);
    changes.push(`status de '${oldLabel}' para '${newLabel}'`);
  }

  // Inspection observations change
  if (log.table_name === "inspections" && log.old_data.observations !== log.new_data.observations) {
    changes.push("observações");
  }

  // Checklist item status change
  if (log.table_name === "checklist_items" && log.old_data.status !== log.new_data.status) {
    const itemLabel = (log.new_data.item_name as string) ?? "item";
    const oldLabel = CHECKLIST_STATUS_LABELS[log.old_data.status as string] ?? String(log.old_data.status);
    const newLabel = CHECKLIST_STATUS_LABELS[log.new_data.status as string] ?? String(log.new_data.status);
    return `${userName} alterou status de '${oldLabel}' para '${newLabel}' no item '${itemLabel}'`;
  }

  // Checklist rejection reason
  if (log.table_name === "checklist_items" && log.old_data.rejection_reason !== log.new_data.rejection_reason) {
    const itemLabel = (log.new_data.item_name as string) ?? "item";
    changes.push(`motivo de rejeição no item '${itemLabel}'`);
  }

  if (changes.length > 0) {
    return `${userName} alterou ${changes.join(", ")}`;
  }

  return `${userName} alterou ${tableLabel}`;
}
