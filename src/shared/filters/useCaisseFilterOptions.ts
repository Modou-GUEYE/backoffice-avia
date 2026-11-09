import { useEffect, useState } from "react";
import { fetchCaisseById, fetchCaisses } from "@/features/caisses/services/caissesService";

export interface CaisseFilterOption {
  id: string;
  label: string;
}

type Options = {
  /** Agence choisie dans les filtres. */
  agenceId?: string;
  /** Agences de rattachement de l'utilisateur (une ou plusieurs). */
  enforcedAgencyIds: string[];
  /** Caisse imposée (caissier). */
  enforcedCaisseId: string | null;
  enforcedCaisseLabel: string | null;
};

const toOptions = (caisses: Array<{ id: string; name?: string | null; code?: string | null }>): CaisseFilterOption[] =>
  caisses
    .filter((caisse) => caisse.id)
    .map((caisse) => ({ id: caisse.id, label: caisse.name || caisse.code || caisse.id }));

/**
 * Caisses proposées au filtre Caisse (Reporting : caisse_id) :
 * celles de l'agence choisie, sinon celles des agences de rattachement de l'utilisateur.
 * Sans agence, la liste reste vide : on choisit d'abord une agence.
 */
export const useCaisseFilterOptions = ({
  agenceId,
  enforcedAgencyIds,
  enforcedCaisseId,
  enforcedCaisseLabel,
}: Options) => {
  const [options, setOptions] = useState<CaisseFilterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const agencyKey = agenceId ? agenceId : enforcedAgencyIds.join(",");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      // Caissier : sa seule caisse, avec son nom
      if (enforcedCaisseId) {
        let label = enforcedCaisseLabel || enforcedCaisseId;
        if (!enforcedCaisseLabel) {
          try {
            const caisse = await fetchCaisseById(enforcedCaisseId);
            label = caisse.name || caisse.code || enforcedCaisseId;
          } catch {
            // Caisse introuvable : l'identifiant reste affiché
          }
        }
        if (isMounted) setOptions([{ id: enforcedCaisseId, label }]);
        return;
      }

      const agencyIds = agencyKey ? agencyKey.split(",") : [];
      if (agencyIds.length === 0) {
        if (isMounted) setOptions([]);
        return;
      }

      setLoading(true);
      const results = await Promise.allSettled(agencyIds.map((id) => fetchCaisses({ agency_id: id, limit: 100 })));
      if (!isMounted) return;
      const caisses = results.flatMap((result) => (result.status === "fulfilled" ? toOptions(result.value) : []));
      setOptions(caisses.sort((a, b) => a.label.localeCompare(b.label, "fr")));
      setLoading(false);
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [agencyKey, enforcedCaisseId, enforcedCaisseLabel]);

  return { options, loading, needsAgency: !enforcedCaisseId && !agencyKey };
};
