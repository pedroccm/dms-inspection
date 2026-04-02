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
  | "draft"
  | "in_progress"
  | "ready_for_review"
  | "submitted"
  | "transferred";

export interface Inspection {
  id: string;
  inspector_id: string;
  equipment_id: string;
  service_order_id: string | null;
  status: InspectionStatus;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations (optional)
  equipment?: Equipment;
  checklist_items?: ChecklistItem[];
  photos?: Photo[];
  inspector?: Profile;
}

export type ChecklistItemStatus = "approved" | "rejected" | "na" | "pending";

export interface ChecklistItem {
  id: string;
  inspection_id: string;
  label: string;
  checked: boolean;
  status: ChecklistItemStatus;
  rejection_reason: string | null;
  notes: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export type PhotoType =
  | "mechanism_front"
  | "mechanism_back"
  | "control_front_closed"
  | "control_mirror_closed"
  | "relay_front"
  | "control_internal";

export interface Photo {
  id: string;
  inspection_id: string;
  photo_type: PhotoType;
  storage_path: string;
  file_size: number;
  caption: string | null;
  uploaded_at: string;
  created_at: string;
}

export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  mechanism_front: "Foto Mecanismo Frente",
  mechanism_back: "Foto Mecanismo Traseira",
  control_front_closed: "Foto Controle Frente Fechado",
  control_mirror_closed: "Foto Controle Espelho Fechado",
  relay_front: "Foto Frente Rele",
  control_internal: "Foto Interna Controle",
};

export type ServiceOrderStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface ServiceOrder {
  id: string;
  title: string;
  client_name: string;
  location: string | null;
  description: string | null;
  status: ServiceOrderStatus;
  assigned_to: string;
  equipment_id: string | null;
  start_date: string | null;
  end_date: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined relations (optional)
  equipment?: Equipment;
  assignee?: Profile;
  service_order_equipment?: ServiceOrderEquipment[];
}

export type EquipmentInspectionStatus = "not_started" | "in_progress" | "completed";

export interface ServiceOrderEquipment {
  id: string;
  service_order_id: string;
  equipment_id: string;
  inspection_status: EquipmentInspectionStatus;
  created_at: string;
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
