import { useCallback, useEffect, useState } from "react";
import { fetchProduits } from "@/features/produits/services/produitsService";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { fetchCaisses } from "@/features/caisses/services/caissesService";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import type { TrackingEventDetail } from "../models/types";
import { fetchTrackingEventDetail } from "../services/trackingService";
import {
  AgencyCatalogItem,
  CaisseCatalogItem,
  DistributorCatalogItem,
  ProductCatalogItem,
  StructureCatalogItem,
  mapAgences,
  mapCaisses,
  mapDistributeurs,
  mapProducts,
  mapStructures,
  resolveCatalogName,
} from "./useTrackingEvents";

type Catalogs = {
  produits: ProductCatalogItem[];
  structures: StructureCatalogItem[];
  agences: AgencyCatalogItem[];
  caisses: CaisseCatalogItem[];
  distributeurs: DistributorCatalogItem[];
};

const emptyCatalogs: Catalogs = { produits: [], structures: [], agences: [], caisses: [], distributeurs: [] };

/** Détail d'un événement de tracking, avec les catalogues nécessaires pour afficher les noms du périmètre. */
export const useTrackingEventDetail = (eventId: string | undefined) => {
  const [event, setEvent] = useState<TrackingEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogs, setCatalogs] = useState<Catalogs>(emptyCatalogs);

  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;

    setLoading(true);
    setError(null);
    setEvent(null);
    fetchTrackingEventDetail(eventId)
      .then((detail) => {
        if (isMounted) setEvent(detail);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Impossible de récupérer le détail de l'événement");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    let isMounted = true;

    void Promise.allSettled([
      fetchProduits(),
      fetchStructures(),
      fetchAgences(),
      fetchCaisses(),
      fetchDistributeurs(),
    ]).then(([prodRes, structRes, agenceRes, caisseRes, distRes]) => {
      if (!isMounted) return;
      setCatalogs({
        produits: prodRes.status === "fulfilled" ? mapProducts(prodRes.value) : [],
        structures: structRes.status === "fulfilled" ? mapStructures(structRes.value) : [],
        agences: agenceRes.status === "fulfilled" ? mapAgences(agenceRes.value) : [],
        caisses: caisseRes.status === "fulfilled" ? mapCaisses(caisseRes.value) : [],
        distributeurs: distRes.status === "fulfilled" ? mapDistributeurs(distRes.value.items) : [],
      });
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const getProduitName = useCallback((id?: string | null) => resolveCatalogName(catalogs.produits, id), [catalogs.produits]);
  const getStructureName = useCallback((id?: string | null) => resolveCatalogName(catalogs.structures, id), [catalogs.structures]);
  const getAgenceName = useCallback((id?: string | null) => resolveCatalogName(catalogs.agences, id), [catalogs.agences]);
  const getCaisseName = useCallback((id?: string | null) => resolveCatalogName(catalogs.caisses, id), [catalogs.caisses]);
  const getDistributeurName = useCallback(
    (id?: string | null) => resolveCatalogName(catalogs.distributeurs, id),
    [catalogs.distributeurs],
  );

  return {
    event,
    loading,
    error,
    getProduitName,
    getStructureName,
    getAgenceName,
    getCaisseName,
    getDistributeurName,
  };
};
