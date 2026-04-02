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

export interface ChecklistItem {
  id: string;
  inspection_id: string;
  label: string;
  checked: boolean;
  notes: string | null;
  order: number;
  created_at: string;
}

export interface Photo {
  id: string;
  inspection_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export type ServiceOrderStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface ServiceOrder {
  id: string;
  title: string;
  description: string | null;
  status: ServiceOrderStatus;
  assigned_to: string;
  equipment_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations (optional)
  equipment?: Equipment;
  assignee?: Profile;
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
