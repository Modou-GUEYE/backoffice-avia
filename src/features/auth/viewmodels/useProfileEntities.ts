import { useEffect, useState } from "react";
import { fetchStructureById } from "@/features/structures/services/structuresService";
import { fetchAgenceById } from "@/features/agences/services/agencesService";
import { fetchCaisseById } from "@/features/caisses/services/caissesService";
import { fetchDistributeurById } from "@/features/distributeurs/services/distributeursService";
import { fetchProduitById } from "@/features/produits/services/produitsService";
import { fetchPartenaireById } from "@/features/partenaires/services/partenairesService";

/** Entité de rattachement : son identifiant (jeton) et son nom s'il a été trouvé. */
export interface ProfileEntity {
  id: string;
  name: string | null;
}

export interface ProfileEntities {
  product: ProfileEntity | null;
  structure: ProfileEntity | null;
  partner: ProfileEntity | null;
  distributor: ProfileEntity | null;
  agencies: ProfileEntity[];
  caisse: ProfileEntity | null;
}

type ProfileEntityIds = {
  productId?: string | null;
  institutionId?: string | null;
  partnerId?: string | null;
  distributorId?: string | null;
  agencyIds?: string[];
  caisseId?: string | null;
};

const resolve = async (id: string, fetchName: (id: string) => Promise<string | null | undefined>): Promise<ProfileEntity> => {
  try {
    const name = (await fetchName(id))?.trim();
    return { id, name: name || null };
  } catch {
    // Entité introuvable ou inaccessible : l'identifiant reste affiché
    return { id, name: null };
  }
};

/**
 * Noms des entités de rattachement de l'utilisateur, retrouvés par leur identifiant exact
 * dans la Gestion Institutionnelle (le jeton ne porte que les identifiants).
 */
export const useProfileEntities = ({
  productId,
  institutionId,
  partnerId,
  distributorId,
  agencyIds = [],
  caisseId,
}: ProfileEntityIds): ProfileEntities => {
  const agencyKey = agencyIds.join(",");
  const [entities, setEntities] = useState<ProfileEntities>({
    product: null,
    structure: null,
    partner: null,
    distributor: null,
    agencies: [],
    caisse: null,
  });

  useEffect(() => {
    let isMounted = true;
    const ids = agencyKey ? agencyKey.split(",") : [];

    void Promise.all([
      productId ? resolve(productId, async (id) => (await fetchProduitById(id)).nom) : null,
      institutionId ? resolve(institutionId, async (id) => (await fetchStructureById(id)).name) : null,
      partnerId ? resolve(partnerId, async (id) => (await fetchPartenaireById(id)).name) : null,
      distributorId ? resolve(distributorId, async (id) => (await fetchDistributeurById(id)).name) : null,
      Promise.all(ids.map((id) => resolve(id, async (agencyId) => (await fetchAgenceById(agencyId)).name))),
      caisseId ? resolve(caisseId, async (id) => (await fetchCaisseById(id)).name) : null,
    ]).then(([product, structure, partner, distributor, agencies, caisse]) => {
      if (isMounted) setEntities({ product, structure, partner, distributor, agencies, caisse });
    });

    return () => {
      isMounted = false;
    };
  }, [productId, institutionId, partnerId, distributorId, agencyKey, caisseId]);

  return entities;
};
