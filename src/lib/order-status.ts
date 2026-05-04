import type { ServiceOrderStatus } from "@/lib/types";

// Display-only states layered on top of the persisted ServiceOrderStatus.
// "inspection_started" / "inspection_finished" are NOT stored in the DB —
// they are derived at render time from the equipment-completion counts so
// the OS list reflects field progress without a schema migration.
export type OrderDisplayStatus =
  | ServiceOrderStatus
  | "inspection_started"
  | "inspection_finished";

export const ORDER_DISPLAY_LABELS: Record<OrderDisplayStatus, string> = {
  open: "Aberta",
  in_progress: "Aberta",
  aprovada: "Aberta",
  inspection_started: "Inspeção Iniciada",
  inspection_finished: "Inspeção Finalizada",
  finalizada: "Cadastrada",
  medida: "Medida",
  faturada: "Faturada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const ORDER_DISPLAY_VARIANTS: Record<
  OrderDisplayStatus,
  "info" | "warning" | "success" | "neutral"
> = {
  open: "info",
  in_progress: "info",
  aprovada: "info",
  inspection_started: "warning",
  inspection_finished: "success",
  finalizada: "success",
  medida: "success",
  faturada: "success",
  completed: "success",
  cancelled: "neutral",
};

/**
 * Map a raw DB status + equipment counts to the visual status used in the
 * OS list. Only the "open" cluster (open / in_progress / aprovada) gets
 * rewritten — terminal states pass through unchanged.
 *
 * "concluded" follows the EquipmentStatus rule: an equipment counts as
 * concluído once its latest inspection reaches ready_for_review (Concluído),
 * aprovado (Relatório Aprovado) or transferred (Cadastrada).
 */
export function deriveOrderDisplayStatus(
  status: ServiceOrderStatus,
  totalEquipment: number,
  concludedEquipment: number
): OrderDisplayStatus {
  if (
    status === "open" ||
    status === "in_progress" ||
    status === "aprovada"
  ) {
    if (totalEquipment === 0 || concludedEquipment === 0) return "open";
    if (concludedEquipment >= totalEquipment) return "inspection_finished";
    return "inspection_started";
  }
  return status;
}
