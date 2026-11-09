export interface ServiceVersionResponse {
  id: string;
  service_id: string;
  version: string;
  changelog?: string | null;
  status: string; // e.g. "DRAFT", "PUBLISHED", "DEPRECATED"
  created_at: string;
  published_at?: string | null;
}

export interface CreateServiceVersionRequest {
  version: string;
  changelog?: string | null;
}

export interface UpdateServiceVersionRequest {
  version: string;
  changelog?: string | null;
}
