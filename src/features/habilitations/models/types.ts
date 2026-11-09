export interface PermissionResponse {
  id: string;
  code: string;
  name: string;
  client_id: string;
  description: string | null;
  enabled: boolean;
  sync_status: string;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileResponse {
  id: string;
  code: string;
  name: string;
  client_id: string;
  description: string | null;
  enabled: boolean;
  sync_status: string;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
  permissions?: PermissionResponse[];
}

export interface HabilitationMatrixRowResponse {
  profile: ProfileResponse;
  permission_ids: string[];
}

export interface HabilitationClientMatrixResponse {
  client_id: string;
  permissions: PermissionResponse[];
  rows: HabilitationMatrixRowResponse[];
}

export interface HabilitationMatrixResponse {
  matrices: HabilitationClientMatrixResponse[];
}

export interface HabilitationResourceRequest {
  code: string;
  name: string;
  client_id: "backoffice-web" | "mobile-app";
  description?: string | null;
  enabled?: boolean;
}

export interface UpdateHabilitationResourceRequest {
  /** Envoyé uniquement quand le code technique a été modifié. */
  code?: string;
  name?: string | null;
  description?: string | null;
  enabled?: boolean | null;
}

export type RecapState = {
  mode: "edit" | "duplicate" | null;
  profileId: string;
  originalCode: string;
  originalName: string;
  newCode: string;
  newName: string;
  description: string;
  originalPermissionIds: string[];
  newPermissionIds: string[];
  addedPermissionIds: string[];
  removedPermissionIds: string[];
};

export interface ProfileEditForm {
  id?: string;
  name: string;
  code: string;
  description: string;
  enabled: boolean;
  permissionIds: string[];
}

export interface PermissionForm {
  id?: string;
  code: string;
  name: string;
  clientId: "backoffice-web" | "mobile-app";
  description: string;
  enabled?: boolean;
}

