import httpClient, { refreshAccessToken } from "@/core/network/httpClient";

export interface BatchPipelineItem {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  path: string;
  query?: Record<string, string | number | boolean>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface BatchResponseItem {
  body: string | unknown;
  reason: string;
  status: number;
  headers: Record<string, string>;
}

/**
 * Appelle le endpoint APISIX batch-requests pour effectuer plusieurs requêtes
 * en un seul appel HTTP.
 *
 * @param pipeline - Liste des requêtes à effectuer en parallèle
 * @param timeout  - Délai global en millisecondes (défaut : 10 000)
 * @returns Tableau de résultats dans le même ordre que le pipeline
 */
export const batchRequests = async (
  pipeline: BatchPipelineItem[],
  timeout = 60000,
  name?: string,
  hasRetriedAfterRefresh = false,
): Promise<BatchResponseItem[]> => {
  const updatedPipeline = pipeline.map((item) => {
    let path = item.path;
    if (path.includes("/package-assignments")) {
      if (path.startsWith("/api/v1/organisation/structures")) {
        path = path.replace("/api/v1/organisation/structures", "/api/v1/packages-services/structures");
      } else if (path.startsWith("/api/v1/structures")) {
        path = path.replace("/api/v1/structures", "/api/v1/packages-services/structures");
      } else if (!path.startsWith("/api/v1/packages-services")) {
        path = path.replace("/api/v1", "/api/v1/packages-services");
      }
    } else if (path.startsWith("/enrollment")) {
      path = path.replace("/enrollment", "/api/v1/enrollment");
    } else if (path.startsWith("/v1")) {
      path = path.replace("/v1", "/api/v1/security");
    } else {
      const organisationPaths = [
        "/api/v1/administrations",
        "/api/v1/products",
        "/api/v1/structures",
        "/api/v1/agencies",
        "/api/v1/caisses",
        "/api/v1/distributors",
        "/api/v1/partners",
      ];
      const matchingOrgPath = organisationPaths.find((p) => path.startsWith(p));
      if (matchingOrgPath) {
        path = path.replace("/api/v1", "/api/v1/organisation");
      } else {
        const packagesServicesPaths = [
          "/api/v1/packages",
          "/api/v1/services",
          "/api/v1/payment-methods",
          "/api/v1/service-categories",
          "/api/v1/workflows",
          "/api/v1/forms",
          "/api/v1/workflow-instances",
          "/api/v1/field-types",
          "/api/v1/field-definitions",
        ];
        const matchingPkgPath = packagesServicesPaths.find((p) => path.startsWith(p));
        if (matchingPkgPath) {
          path = path.replace("/api/v1", "/api/v1/packages-services");
        }
      }
    }
    return { ...item, path };
  });

  const url = name ? `/batch-requests?name=${encodeURIComponent(name)}` : "/batch-requests";
  const { data } = await httpClient.post<BatchResponseItem[]>(url, {
    timeout,
    headers: {
      "Connection": "keep-alive",
    },
    pipeline: updatedPipeline,
  });

  // The batch endpoint can return 200 while one of its internal requests returns 401.
  // Axios cannot refresh the token in that case because the outer response is successful.
  if (!hasRetriedAfterRefresh && data.some((item) => item?.status === 401)) {
    const nextAccessToken = await refreshAccessToken();
    if (nextAccessToken) {
      return batchRequests(pipeline, timeout, name, true);
    }
  }

  return data;
};

/**
 * Parse le body d'une réponse batch (peut être une string JSON ou un objet déjà parsé).
 * Retourne null si le statut indique une erreur ou si le parsing échoue.
 */
export const parseBatchBody = <T>(item: BatchResponseItem): T | null => {
  if (item.status >= 400) {
    console.warn(`[batch-requests] Erreur HTTP ${item.status} : ${item.reason}`);
    return null;
  }

  const body = item.body;

  if (typeof body === "string") {
    if (!body.trim()) return null;
    try {
      return JSON.parse(body) as T;
    } catch {
      console.warn("[batch-requests] Impossible de parser le body :", body.slice(0, 200));
      return null;
    }
  }

  if (body && typeof body === "object") {
    return body as T;
  }

  return null;
};

/**
 * Extrait une liste depuis le body d'une réponse batch, même si la réponse est enveloppée
 * dans une structure paginée (ex: { items: [...] }, { data: [...] }, { results: [...] }).
 */
export const parseBatchList = <T = unknown>(item?: BatchResponseItem | null): T[] => {
  if (!item) return [];
  const body = parseBatchBody<unknown>(item);
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const candidates = [
      record.items,
      record.data,
      record.results,
      record.products,
      record.structures,
      record.agencies,
      record.caisses,
      record.distributors,
      record.partners,
      record.content,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as T[];
      }
    }
  }
  return [];
};

