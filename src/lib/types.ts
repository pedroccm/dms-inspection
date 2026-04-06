export type UserRole = "admin" | "inspector";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Inspection status flow
export type InspectionStatus =
  | "disponivel" // Available for claiming by executor
  | "draft"
  | "in_progress"
  | "ready_for_review"
  | "aprovado"
  | "relatorio_reprovado"
  | "equipamento_reprovado"
  | "transferred";

export interface Inspection {
  id: string;
  inspector_id: string;
  equipment_id: string;
  service_order_id: string;
  status: InspectionStatus;
  observations: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  rejection_reason: string | null;
  rejection_type: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  numero_052r: string | null;
  numero_300: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  qr_data: Record<string, string> | null;
  // Joined relations (optional)
  equipment?: Equipment;
  checklist_items?: ChecklistItem[];
  photos?: Photo[];
  inspector?: { full_name: string };
}

export type ChecklistItemStatus = "approved" | "rejected" | "na" | "pending";

export interface ChecklistItem {
  id: string;
  inspection_id: string;
  item_name: string;
  category: string;
  sort_order: number;
  status: ChecklistItemStatus;
  rejection_reason: string | null;
  updated_at: string;
}

export type PhotoType = string; // Accepts fixed types or dynamic labels like "photo_7", "photo_8", etc.

/** The 6 required default photo types */
export const DEFAULT_PHOTO_TYPES: string[] = [
  "mechanism_front",
  "mechanism_back",
  "control_front_closed",
  "control_mirror_closed",
  "relay_front",
  "control_internal",
];

export const MIN_PHOTOS = 6;
export const MAX_PHOTOS = 20;

export interface Photo {
  id: string;
  inspection_id: string;
  photo_type: PhotoType;
  label: string | null;
  storage_path: string;
  file_size: number;
  uploaded_at: string;
}

export const PHOTO_TYPE_LABELS: Record<string, string> = {
  mechanism_front: "Foto Mecanismo Frente",
  mechanism_back: "Foto Mecanismo Traseira",
  control_front_closed: "Foto Controle Frente Fechado",
  control_mirror_closed: "Foto Controle Espelho Fechado",
  relay_front: "Foto Frente Rele",
  control_internal: "Foto Interna Controle",
};

/** Get display label for a photo slot */
export function getPhotoLabel(photoType: string, customLabel?: string | null): string {
  if (customLabel) return customLabel;
  if (PHOTO_TYPE_LABELS[photoType]) return PHOTO_TYPE_LABELS[photoType];
  // Dynamic slots: "photo_7" → "Foto 7"
  const match = photoType.match(/^photo_(\d+)$/);
  if (match) return `Foto ${match[1]}`;
  return photoType;
}

// ─── Inspection Locations ────────────────────────────────────────

export interface InspectionLocation {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
}

// ─── Teams ───────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  created_at: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  user?: Pick<Profile, "id" | "full_name">;
}

export type ServiceOrderStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface ServiceOrder {
  id: string;
  title: string;
  client_name: string;
  location: string | null;
  status: ServiceOrderStatus;
  assigned_to: string;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  order_number: string | null;
  client_request_date: string | null;
  location_id: string | null;
  equipment_count: number;
  assigned_team_id: string | null;
  // Joined relations (optional)
  equipment?: Equipment;
  assignee?: Profile;
  service_order_equipment?: ServiceOrderEquipment[];
  inspection_location?: InspectionLocation;
  team?: Team;
}

export interface ServiceOrderEquipment {
  id: string;
  service_order_id: string;
  equipment_id: string;
  // Joined relations (optional)
  equipment?: Equipment;
}

export interface Equipment {
  id: string;
  copel_ra_code: string;
  copel_control_code: string;
  mechanism_serial: string;
  control_box_serial: string;
  protection_relay_serial: string;
  manufacturer: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Expanded technical data (from QR Code)
  modelo?: string;
  numero_serie_controle?: string;
  numero_serie_tanque?: string;
  marca?: string;
  tipo?: string;
  tensao_nominal?: string;
  nbi?: string;
  frequencia_nominal?: string;
  corrente_nominal?: string;
  capacidade_interrupcao?: string;
  numero_fases?: string;
  tipo_controle?: string;
  modelo_controle?: string;
  sensor_tensao?: string;
  tc_interno?: string;
  sequencia_operacao?: string;
  meio_interrupcao?: string;
  massa_interruptor?: string;
  massa_caixa_controle?: string;
  massa_total?: string;
  norma_aplicavel?: string;
  qr_code_raw?: string;
  // Joined relations (optional)
  inspections?: Inspection[];
}

// Query filter types
export interface InspectionFilters {
  status?: InspectionStatus;
  inspector_id?: string;
  equipment_id?: string;
}

export interface ServiceOrderFilters {
  status?: ServiceOrderStatus;
  assigned_to?: string;
  equipment_id?: string;
}

export interface EquipmentFilters {
  search?: string;
  manufacturer?: string;
  page?: number;
  perPage?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
}

// ─── Audit Log ─────────────────────────────────────────────────

export type AuditAction = "insert" | "update" | "delete";

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
  // Joined
  user?: Pick<Profile, "id" | "full_name" | "role"> | null;
}

export interface FormattedAuditEntry {
  id: string;
  date: string;
  userName: string;
  description: string;
  action: AuditAction;
  tableName: string;
}

// ─── Settings ──────────────────────────────────────────────────

export interface Setting {
  key: string;
  value: unknown;
  updated_at: string;
}
