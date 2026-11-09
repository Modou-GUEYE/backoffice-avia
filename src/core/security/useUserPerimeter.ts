import { useMemo } from "react";
import { useAuthStore } from "./authStore";
import { ActorRole, EntityContext } from "../permissions/permissions";

export interface UserPerimeter {
  // Profil & contexte de base
  role: ActorRole | null;
  entityContext: EntityContext | null;
  userId: string | null;
  email: string | null;

  // Catégorisation du profil
  isGlobalAdmin: boolean;
  isStructureUser: boolean;
  isPartnerUser: boolean;
  isDistributorUser: boolean;
  isAgencyUser: boolean;
  isCaisseUser: boolean;
  isProductUser: boolean;
  /** Caissier : ne voit que les opérations de sa caisse (contexte Caisse, ou Agent d'agence rattaché à une caisse). */
  isCashier: boolean;

  // Entités de rattachement
  institutionId: string | null;
  institutionLabel: string | null;
  distributorId: string | null;
  distributorLabel: string | null;
  agencyId: string | null;
  agencyLabel: string | null;
  caisseId: string | null;
  caisseLabel: string | null;
  productId: string | null;
  productLabel: string | null;

  // Contraintes de périmètre strictes pour le Reporting & Analytics
  enforcedStructureId: string | null;
  enforcedStructureLabel: string | null;
  enforcedDistributorId: string | null;
  enforcedDistributorLabel: string | null;
  /** Agence imposée : uniquement quand l'utilisateur est rattaché à une seule agence. */
  enforcedAgencyId: string | null;
  enforcedAgencyLabel: string | null;
  /** Agences de rattachement (une ou plusieurs) ; vide hors contexte agence/caisse. */
  enforcedAgencyIds: string[];
  enforcedCaisseId: string | null;
  enforcedCaisseLabel: string | null;
  enforcedProductId: string | null;
  enforcedProductLabel: string | null;

  // En-têtes HTTP de contexte
  contextHeaders: Record<string, string>;
}

export const computeUserPerimeter = (
  user: ReturnType<typeof useAuthStore.getState>["user"]
): UserPerimeter => {
  const role = user?.role || null;
  const entityContext = user?.entityContext || null;
  const userId = user?.userId ?? null;
  const email = user?.email ?? null;

  const institutionId = user?.institutionId?.trim() || null;
  const institutionLabel = user?.institutionLabel?.trim() || null;
  const distributorId = user?.distributorId?.trim() || null;
  const distributorLabel = user?.distributorLabel?.trim() || null;
  const agencyId = user?.agencyId?.trim() || null;
  const agencyLabel = user?.agencyLabel?.trim() || null;
  const agencyIds = user?.agencyIds?.length ? user.agencyIds : agencyId ? [agencyId] : [];
  // Plusieurs agences : aucune n'est imposée seule, les listes sont limitées à ces agences
  const singleAgencyId = agencyIds.length === 1 ? agencyIds[0] : null;
  const singleAgencyLabel = singleAgencyId && singleAgencyId === agencyId ? agencyLabel : null;
  const caisseId = user?.caisseId?.trim() || null;
  const caisseLabel = user?.caisseLabel?.trim() || null;
  const productId = user?.productId?.trim() || null;
  const productLabel = user?.productLabel?.trim() || null;

  const isGlobalAdmin = entityContext === "Administration";
  const isStructureUser = entityContext === "Structure" || entityContext === "Partenaire";
  const isPartnerUser  = entityContext === "Partenaire";
  const isDistributorUser = entityContext === "Distributeur";
  const isAgencyUser = entityContext === "Agence";
  const isCaisseUser = entityContext === "Caisse";
  const isProductUser = entityContext === "Produit";
  // Le profil agence-agent arrive en contexte Agence ; son groupe CAISSE dans le jeton en fait un caissier
  const isCashier = isCaisseUser || (isAgencyUser && role === "Agent" && Boolean(caisseId));

  // Calcul des restrictions de périmètre :
  let enforcedStructureId: string | null = null;
  let enforcedStructureLabel: string | null = null;
  let enforcedDistributorId: string | null = null;
  let enforcedDistributorLabel: string | null = null;
  let enforcedAgencyId: string | null = null;
  let enforcedAgencyLabel: string | null = null;
  let enforcedAgencyIds: string[] = [];
  let enforcedCaisseId: string | null = null;
  let enforcedCaisseLabel: string | null = null;
  let enforcedProductId: string | null = null;
  let enforcedProductLabel: string | null = null;

  if (!isGlobalAdmin && entityContext) {
    if (isProductUser) {
      enforcedProductId = productId;
      enforcedProductLabel = productLabel;
    } else if (isCaisseUser) {
      enforcedCaisseId = caisseId;
      enforcedCaisseLabel = caisseLabel;
      enforcedAgencyId = singleAgencyId;
      enforcedAgencyLabel = singleAgencyLabel;
      enforcedAgencyIds = agencyIds;
      enforcedStructureId = institutionId;
      enforcedStructureLabel = institutionLabel;
      enforcedDistributorId = distributorId;
      enforcedDistributorLabel = distributorLabel;
    } else if (isAgencyUser) {
      enforcedAgencyId = singleAgencyId;
      enforcedAgencyLabel = singleAgencyLabel;
      enforcedAgencyIds = agencyIds;
      enforcedStructureId = institutionId;
      enforcedStructureLabel = institutionLabel;
      enforcedDistributorId = distributorId;
      enforcedDistributorLabel = distributorLabel;
      if (isCashier) {
        enforcedCaisseId = caisseId;
        enforcedCaisseLabel = caisseLabel;
      }
    } else if (isDistributorUser) {
      enforcedDistributorId = distributorId;
      enforcedDistributorLabel = distributorLabel;
      enforcedStructureId = institutionId;
      enforcedStructureLabel = institutionLabel;
    } else if (isStructureUser) {
      enforcedStructureId = institutionId;
      enforcedStructureLabel = institutionLabel;
    }
  }

  const contextHeaders: Record<string, string> = {};
  if (enforcedStructureId) {
    contextHeaders["X-Structure-Id"] = enforcedStructureId;
  }
  if (enforcedStructureLabel) {
    contextHeaders["X-Structure"] = enforcedStructureLabel;
  }
  if (enforcedProductId) {
    contextHeaders["X-Product-Id"] = enforcedProductId;
  }
  if (role) {
    contextHeaders["X-User-Role"] = role;
  }
  if (userId) {
    contextHeaders["X-User-Id"] = userId;
  }

  return {
    role,
    entityContext,
    userId,
    email,
    isGlobalAdmin,
    isStructureUser,
    isPartnerUser,
    isDistributorUser,
    isAgencyUser,
    isCaisseUser,
    isProductUser,
    isCashier,
    institutionId,
    institutionLabel,
    distributorId,
    distributorLabel,
    agencyId,
    agencyLabel,
    caisseId,
    caisseLabel,
    productId,
    productLabel,
    enforcedStructureId,
    enforcedStructureLabel,
    enforcedDistributorId,
    enforcedDistributorLabel,
    enforcedAgencyId,
    enforcedAgencyLabel,
    enforcedAgencyIds,
    enforcedCaisseId,
    enforcedCaisseLabel,
    enforcedProductId,
    enforcedProductLabel,
    contextHeaders,
  };
};

/** En-têtes de contexte du périmètre de l'utilisateur connecté (Reporting, Tracking). */
export const getPerimeterContextHeaders = (): Record<string, string> =>
  computeUserPerimeter(useAuthStore.getState().user).contextHeaders;

export const useUserPerimeter = (): UserPerimeter => {
  const user = useAuthStore((state) => state.user);
  const perimeter = useMemo(() => computeUserPerimeter(user), [user]);
  // La liste des agences garde la même référence tant que son contenu ne change pas :
  // elle sert de dépendance aux chargements, qui ne doivent pas se relancer à chaque rendu
  const agencyIdsKey = perimeter.enforcedAgencyIds.join(",");
  const enforcedAgencyIds = useMemo(() => (agencyIdsKey ? agencyIdsKey.split(",") : []), [agencyIdsKey]);
  return useMemo(() => ({ ...perimeter, enforcedAgencyIds }), [perimeter, enforcedAgencyIds]);
};
