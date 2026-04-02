import { createClient } from "@/lib/supabase/server";

export interface InspectorProductivity {
  inspector_id: string;
  inspector_name: string;
  total_inspections: number;
  approved_count: number;
  rejected_count: number;
  na_count: number;
  approval_rate: number;
}

export interface ProductivityReportResult {
  rows: InspectorProductivity[];
  totals: {
    total_inspections: number;
    approved_count: number;
    rejected_count: number;
    na_count: number;
    approval_rate: number;
  };
}

export async function getProductivityReport(
  startDate: string,
  endDate: string,
  inspectorId?: string
): Promise<ProductivityReportResult> {
  const supabase = await createClient();

  // Query inspections with checklist items and inspector profile
  let query = supabase
    .from("inspections")
    .select(
      "id, inspector_id, created_at, checklist_items(status), inspector:profiles!inspector_id(full_name)"
    )
    .gte("created_at", `${startDate}T00:00:00`)
    .lte("created_at", `${endDate}T23:59:59`)
    .in("status", ["submitted", "transferred", "ready_for_review"]);

  if (inspectorId) {
    query = query.eq("inspector_id", inspectorId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Aggregate per inspector
  const map = new Map<
    string,
    {
      inspector_name: string;
      total_inspections: number;
      approved_count: number;
      rejected_count: number;
      na_count: number;
    }
  >();

  for (const inspection of data ?? []) {
    const id = inspection.inspector_id;
    const name =
      (inspection.inspector as unknown as { full_name: string } | null)?.full_name ??
      "Desconhecido";

    if (!map.has(id)) {
      map.set(id, {
        inspector_name: name,
        total_inspections: 0,
        approved_count: 0,
        rejected_count: 0,
        na_count: 0,
      });
    }

    const entry = map.get(id)!;
    entry.total_inspections += 1;

    const items = (inspection.checklist_items ?? []) as {
      status: string;
    }[];
    for (const item of items) {
      if (item.status === "approved") entry.approved_count += 1;
      else if (item.status === "rejected") entry.rejected_count += 1;
      else if (item.status === "na") entry.na_count += 1;
    }
  }

  const rows: InspectorProductivity[] = Array.from(map.entries())
    .map(([inspector_id, entry]) => {
      const evaluated = entry.approved_count + entry.rejected_count;
      const approval_rate =
        evaluated > 0
          ? Math.round((entry.approved_count / evaluated) * 100 * 10) / 10
          : 0;
      return { inspector_id, ...entry, approval_rate };
    })
    .sort((a, b) => b.total_inspections - a.total_inspections);

  // Compute totals
  const totals = rows.reduce(
    (acc, row) => {
      acc.total_inspections += row.total_inspections;
      acc.approved_count += row.approved_count;
      acc.rejected_count += row.rejected_count;
      acc.na_count += row.na_count;
      return acc;
    },
    {
      total_inspections: 0,
      approved_count: 0,
      rejected_count: 0,
      na_count: 0,
      approval_rate: 0,
    }
  );

  const totalEvaluated = totals.approved_count + totals.rejected_count;
  totals.approval_rate =
    totalEvaluated > 0
      ? Math.round((totals.approved_count / totalEvaluated) * 100 * 10) / 10
      : 0;

  return { rows, totals };
}
