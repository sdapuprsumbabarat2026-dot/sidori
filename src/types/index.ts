export interface User {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "user";
  created_at: string;
}

export interface IrrigationType {
  id: string;
  name: string;
  created_at: string;
}

export interface IrrigationArea {
  id: string;
  name: string;
  irrigation_type_id: string;
  status: "active" | "approved" | "stock_program";
  created_at: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface Document {
  id: string;
  irrigation_area_id: string;
  category_id: string;
  file_name: string;
  file_url: string;
  status: "review" | "rejected" | "approved";
  notes: string | null;
  uploaded_by: string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}
