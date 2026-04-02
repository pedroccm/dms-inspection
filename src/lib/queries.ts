import { createClient } from "@/lib/supabase/server";
import type {
  Inspection,
  InspectionFilters,
  Profile,
  ServiceOrder,
  ServiceOrderFilters,
  Equipment,
  EquipmentFilters,
  PaginatedResult,
} from "@/lib/types";

// ─── Inspections ────────────────────────────────────────────

export async function getInspections(filters?: InspectionFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("inspections")
    .select("*, equipment(copel_ra_code, manufacturer), inspector:profiles!inspector_id(full_name)")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.inspector_id) {
    query = query.eq("inspector_id", filters.inspector_id);
  }
  if (filters?.equipment_id) {
    query = query.eq("equipment_id", filters.equipment_id);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as Inspection[];
}

export async function getInspectionById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inspections")
    .select(
      "*, equipment(*), checklist_items(*), photos(*), inspector:profiles!inspector_id(full_name)"
    )
    .eq("id", id)
    .order("sort_order", { referencedTable: "checklist_items", ascending: true })
    .single();

  if (error) throw error;
  return data as Inspection;
}

// ─── Form Locks ────────────────────────────────────────────

const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export async function getLockedInspectionIds(): Promise<Set<string>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("form_locks")
    .select("inspection_id, last_heartbeat");

  if (error || !data) return new Set();

  const now = Date.now();
  const activeIds = data
    .filter((lock) => now - new Date(lock.last_heartbeat).getTime() < STALE_THRESHOLD_MS)
    .map((lock) => lock.inspection_id);

  return new Set(activeIds);
}

// ─── Service Orders ─────────────────────────────────────────

export async function getServiceOrders(filters?: ServiceOrderFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("service_orders")
    .select("*, assignee:profiles!assigned_to(full_name)")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as ServiceOrder[];
}

export async function getServiceOrderById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_orders")
    .select(
      "*, assignee:profiles!assigned_to(full_name), service_order_equipment(*, equipment(*))"
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as ServiceOrder;
}

export async function getInspectors() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, active")
    .eq("role", "inspector")
    .eq("active", true)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Pick<Profile, "id" | "full_name" | "role" | "active">[];
}

export async function searchEquipmentByCode(search: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment")
    .select("id, copel_ra_code, manufacturer")
    .ilike("copel_ra_code", `%${search}%`)
    .order("copel_ra_code", { ascending: true })
    .limit(10);

  if (error) throw error;
  return (data ?? []) as Pick<Equipment, "id" | "copel_ra_code" | "manufacturer">[];
}

// ─── Equipment ──────────────────────────────────────────────

export async function getEquipment(
  filters?: EquipmentFilters
): Promise<PaginatedResult<Equipment>> {
  const supabase = await createClient();

  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("equipment")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.search) {
    query = query.ilike("copel_ra_code", `%${filters.search}%`);
  }
  if (filters?.manufacturer) {
    query = query.eq("manufacturer", filters.manufacturer);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: (data ?? []) as Equipment[], count: count ?? 0 };
}

export async function getDistinctManufacturers(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment")
    .select("manufacturer")
    .order("manufacturer", { ascending: true });

  if (error) throw error;

  const unique = [...new Set((data ?? []).map((d) => d.manufacturer))].filter(
    Boolean
  );
  return unique as string[];
}

export async function getEquipmentById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment")
    .select("*, inspections(*, inspector:profiles!inspector_id(full_name))")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Equipment;
}

// ─── Equipment (all, for dropdowns) ────────────────────────

export async function getAllEquipment() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment")
    .select("id, copel_ra_code, manufacturer")
    .order("copel_ra_code", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Pick<Equipment, "id" | "copel_ra_code" | "manufacturer">[];
}

// ─── Dashboard Counts ───────────────────────────────────────

export async function getDashboardCounts() {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [openOrders, inspectionsToday, equipmentCount, pendingReviews] =
    await Promise.all([
      supabase
        .from("service_orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]),
      supabase
        .from("inspections")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayISO),
      supabase
        .from("equipment")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("inspections")
        .select("id", { count: "exact", head: true })
        .eq("status", "ready_for_review"),
    ]);

  return {
    openOrders: openOrders.count ?? 0,
    inspectionsToday: inspectionsToday.count ?? 0,
    equipmentCount: equipmentCount.count ?? 0,
    pendingReviews: pendingReviews.count ?? 0,
  };
}
