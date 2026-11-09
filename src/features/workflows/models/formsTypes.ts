export interface FormResponse {
  id: string;
  code: string;
  title: string;
  description: string | null;
}

export interface CreateFormRequest {
  code: string;
  title: string;
  description?: string | null;
}

export interface UpdateFormRequest {
  code: string;
  title: string;
  description?: string | null;
}

export interface FormFieldResponse {
  id: string;
  form_id: string;
  field_definition_id?: string | null;
  field_key: string;
  label: string;
  type: string;
  placeholder: string | null;
  default_value: string | null;
  required: boolean;
  validation_rules: Record<string, unknown> | null;
  visibility_rules: Record<string, unknown> | null;
  readonly_rules: Record<string, unknown> | null;
  data_source: Record<string, unknown> | null;
  ui_config: Record<string, unknown> | null;
  field_order: number;
}

export interface CreateFormFieldRequest {
  field_definition_id?: string | null;
  field_key: string;
  label: string;
  type: string;
  placeholder?: string | null;
  default_value?: string | null;
  required?: boolean;
  validation_rules?: Record<string, unknown> | null;
  visibility_rules?: Record<string, unknown> | null;
  readonly_rules?: Record<string, unknown> | null;
  data_source?: Record<string, unknown> | null;
  ui_config?: Record<string, unknown> | null;
  field_order?: number;
}

export interface UpdateFormFieldRequest {
  field_definition_id?: string | null;
  field_key: string;
  label: string;
  type: string;
  placeholder?: string | null;
  default_value?: string | null;
  required?: boolean;
  validation_rules?: Record<string, unknown> | null;
  visibility_rules?: Record<string, unknown> | null;
  readonly_rules?: Record<string, unknown> | null;
  data_source?: Record<string, unknown> | null;
  ui_config?: Record<string, unknown> | null;
  field_order?: number;
}
