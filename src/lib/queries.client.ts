import { createClient } from "@/lib/supabase/client";
import type {
  Inspection,
  InspectionFilters,
  ServiceOrder,
  ServiceOrderFilters,
  Equipment,
  EquipmentFilters,
} from "@/lib/types";

// Singleton browser client
function getSupabase() {
  return createClient();
}

// ─── Inspections ────────────────────────────────────────────

export async function getInspections(filters?: InspectionFilters) {
  const supabase = getSupabase();

  let query = supabase
    .from("inspections")
    .select("*, equipment(*), inspector:profiles!inspector_id(*)")
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
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("inspections")
    .select(
      "*, equipment(*), checklist_items(*), photos(*), inspector:profiles!inspector_id(*)"
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Inspection;
}

// ─── Service Orders ─────────────────────────────────────────

export async function getServiceOrders(filters?: ServiceOrderFilters) {
  const supabase = getSupabase();

  let query = supabase
    .from("service_orders")
    .select("*, equipment(*), assignee:profiles!assigned_to(*)")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }
  if (filters?.equipment_id) {
    query = query.eq("equipment_id", filters.equipment_id);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as ServiceOrder[];
}

export async function getServiceOrderById(id: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("service_orders")
    .select("*, equipment(*), assignee:profiles!assigned_to(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as ServiceOrder;
}

// ─── Equipment ──────────────────────────────────────────────

export async function getEquipment(filters?: EquipmentFilters) {
  const supabase = getSupabase();

  let query = supabase
    .from("equipment")
    .select("*")
    .order("name", { ascending: true });

  if (filters?.active !== undefined) {
    query = query.eq("active", filters.active);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as Equipment[];
}

export async function getEquipmentById(id: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("equipment")
    .select("*, inspections(*, inspector:profiles!inspector_id(*))")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Equipment;
}
