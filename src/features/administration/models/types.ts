export interface AdministrationCreate {
  name: string;
  code?: string | null;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface AdministrationRead {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  settings?: Record<string, unknown> | null;
  is_active: boolean;
  activated_at?: string | null;
  deactivated_at?: string | null;
  is_deleted: boolean;
}

export type AdministrationList = AdministrationRead[];
export type AdministrationDetail = AdministrationRead;

export interface AdministrationUpdate {
  name?: string | null;
  code?: string | null;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface AdministrationForm {
  name: string;
  code?: string;
  description?: string;
  contact_email: string;
  contact_phone: string;
}
