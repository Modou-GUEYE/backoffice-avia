export interface FieldTypeResponse {
  id: string;
  code: string;
  label: string;
  description?: string | null;
  renderer_key: string;
  value_type: string;
  validation_schema?: Record<string, unknown> | null;
  ui_schema?: Record<string, unknown> | null;
  data_source_schema?: Record<string, unknown> | null;
  default_ui_config?: Record<string, unknown> | null;
  supports_data_source: boolean;
  active: boolean;
}

export interface CreateFieldTypeRequest {
  code: string;
  label: string;
  description?: string | null;
  renderer_key: string;
  value_type: string;
  validation_schema?: Record<string, unknown> | null;
  ui_schema?: Record<string, unknown> | null;
  data_source_schema?: Record<string, unknown> | null;
  default_ui_config?: Record<string, unknown> | null;
  supports_data_source?: boolean;
  active?: boolean;
}

export interface UpdateFieldTypeRequest {
  label: string;
  description?: string | null;
  renderer_key: string;
  value_type: string;
  validation_schema?: Record<string, unknown> | null;
  ui_schema?: Record<string, unknown> | null;
  data_source_schema?: Record<string, unknown> | null;
  default_ui_config?: Record<string, unknown> | null;
  supports_data_source?: boolean;
  active?: boolean;
}

export interface FieldDefinitionResponse {
  id: string;
  field_key: string;
  label: string;
  field_type_id: string;
  placeholder?: string | null;
  default_value?: string | null;
  required: boolean;
  validation_rules?: Record<string, unknown> | null;
  data_source?: Record<string, unknown> | null;
  ui_config?: Record<string, unknown> | null;
  type?: string | null;
}

export interface CreateFieldDefinitionRequest {
  field_key: string;
  label: string;
  field_type_id: string;
  placeholder?: string | null;
  default_value?: string | null;
  required?: boolean;
  validation_rules?: Record<string, unknown> | null;
  data_source?: Record<string, unknown> | null;
  ui_config?: Record<string, unknown> | null;
}

export interface UpdateFieldDefinitionRequest {
  field_key: string;
  label: string;
  field_type_id: string;
  placeholder?: string | null;
  default_value?: string | null;
  required?: boolean;
  validation_rules?: Record<string, unknown> | null;
  data_source?: Record<string, unknown> | null;
  ui_config?: Record<string, unknown> | null;
}

export interface PatchFieldDefinitionRequest {
  field_key?: string | null;
  label?: string | null;
  field_type_id?: string | null;
  placeholder?: string | null;
  default_value?: string | null;
  required?: boolean | null;
  validation_rules?: Record<string, unknown> | null;
  data_source?: Record<string, unknown> | null;
  ui_config?: Record<string, unknown> | null;
}
