import { createClient } from "@/lib/supabase/server";
import type {
  Inspection,
  InspectionFilters,
  InspectionStatus,
  Profile,
  ServiceOrder,
  ServiceOrderFilters,
  Equipment,
  EquipmentFilters,
  PaginatedResult,
  InspectionLocation,
  Team,
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
    .single();

  if (error) throw error;

  // Sort checklist items client-side (PostgREST can't order on one-to-many)
  if (data?.checklist_items) {
    data.checklist_items.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);
  }

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

export type ServiceOrderWithCounts = ServiceOrder & {
  equipment_total: number;
  equipment_concluded: number;
};

export async function getServiceOrders(filters?: ServiceOrderFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("service_orders")
    .select("*, assignee:profiles!assigned_to(full_name), inspection_location:inspection_locations!location_id(name)")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    // "Aberta" is a UI alias covering open/in_progress/aprovada
    if (filters.status === "open") {
      query = query.in("status", ["open", "in_progress", "aprovada"]);
    } else {
      query = query.eq("status", filters.status);
    }
  }
  if (filters?.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  const { data, error } = await query;

  if (error) throw error;
  const orders = (data ?? []) as ServiceOrder[];

  if (orders.length === 0) return [] as ServiceOrderWithCounts[];

  // Single follow-up query: pull equipment + their inspections for every
  // listed OS, then fold per-order totals in memory. Avoids N+1 and keeps
  // the count rule in sync with EquipmentStatus derivation.
  const orderIds = orders.map((o) => o.id);
  const { data: equipRows } = await supabase
    .from("equipment")
    .select("id, service_order_id, registered, inspections(status, created_at)")
    .in("service_order_id", orderIds);

  type EquipRow = {
    id: string;
    service_order_id: string;
    registered: boolean | null;
    inspections: { status: InspectionStatus; created_at: string }[] | null;
  };

  const totals = new Map<string, { total: number; concluded: number }>();
  for (const id of orderIds) totals.set(id, { total: 0, concluded: 0 });

  for (const eq of (equipRows ?? []) as EquipRow[]) {
    const bucket = totals.get(eq.service_order_id);
    if (!bucket) continue;
    bucket.total++;

    if (eq.registered) {
      bucket.concluded++;
      continue;
    }
    const inspections = eq.inspections ?? [];
    if (inspections.length === 0) continue;
    const latest = [...inspections].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[inspections.length - 1];
    if (
      latest.status === "ready_for_review" ||
      latest.status === "aprovado" ||
      latest.status === "transferred"
    ) {
      bucket.concluded++;
    }
  }

  return orders.map((o) => ({
    ...o,
    equipment_total: totals.get(o.id)?.total ?? 0,
    equipment_concluded: totals.get(o.id)?.concluded ?? 0,
  })) as ServiceOrderWithCounts[];
}

export async function getServiceOrderById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_orders")
    .select(
      "*, assignee:profiles!assigned_to(full_name), service_order_equipment(*, equipment(*)), inspection_location:inspection_locations!location_id(id, name, address), team:teams!assigned_team_id(id, name, members:team_members(id, user_id, user:profiles!user_id(id, full_name)))"
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as ServiceOrder;
}

export async function getInspectionsByServiceOrderId(serviceOrderId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inspections")
    .select("*, inspector:profiles!inspector_id(full_name), claimed_user:profiles!claimed_by(full_name)")
    .eq("service_order_id", serviceOrderId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as (Inspection & { claimed_user?: { full_name: string } | null })[];
}

export async function getEquipmentByServiceOrderId(serviceOrderId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment")
    .select("*, inspections(id, status, inspector_id, inspector:profiles!inspector_id(full_name))")
    .eq("service_order_id", serviceOrderId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as (Equipment & {
    registered?: boolean;
    inspections?: (Pick<Inspection, "id" | "status" | "inspector_id"> & {
      inspector?: { full_name: string } | null;
    })[];
  })[];
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

// Equipment status counts — replicates the 5-stage derivation used in
// /dashboard/ordens/[id]/page.tsx so the painel stays in sync.
export async function getEquipmentStatusCounts() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment")
    .select("id, registered, inspections(id, status, created_at)");

  if (error) throw error;

  const counts = {
    pendente: 0,
    emInspecao: 0,
    concluido: 0,
    relatorioAprovado: 0,
    cadastrada: 0,
  };

  type Row = {
    id: string;
    registered: boolean | null;
    inspections: { id: string; status: InspectionStatus; created_at: string }[] | null;
  };

  for (const eq of (data ?? []) as Row[]) {
    if (eq.registered) {
      counts.cadastrada++;
      continue;
    }

    const inspections = eq.inspections ?? [];
    if (inspections.length === 0) {
      counts.pendente++;
      continue;
    }

    const latest = [...inspections].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[inspections.length - 1];

    if (latest.status === "transferred") {
      counts.cadastrada++;
    } else if (latest.status === "aprovado") {
      counts.relatorioAprovado++;
    } else if (latest.status === "ready_for_review") {
      counts.concluido++;
    } else if (latest.status === "disponivel") {
      counts.pendente++;
    } else {
      counts.emInspecao++;
    }
  }

  return counts;
}

// ─── Clients ──────────────────────────────────────────────

export async function getClients() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as import("@/lib/types").Client[];
}

// ─── Contracts ────────────────────────────────────────────

export async function getContracts() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as import("@/lib/types").Contract[];
}

// ─── Inspection Locations ──────────────────────────────────

export async function getInspectionLocations() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inspection_locations")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as import("@/lib/types").InspectionLocation[];
}

// ─── Teams ─────────────────────────────────────────────────

export async function getTeams() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("*, members:team_members(*, user:profiles!user_id(id, full_name))")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as import("@/lib/types").Team[];
}

// ─── Next Order Number ─────────────────────────────────────

export async function getNextOrderNumber(): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_orders")
    .select("order_number")
    .not("order_number", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextSeq = 1;
  if (data && data.length > 0 && data[0].order_number) {
    const match = data[0].order_number.match(/(\d+)$/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }

  return `DS-CP-INSP-RA-${String(nextSeq).padStart(3, "0")}`;
}
