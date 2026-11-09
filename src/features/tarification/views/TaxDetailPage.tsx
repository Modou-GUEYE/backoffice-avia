import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  Clock,
  Layers,
  AlertCircle,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/core/references/dateUtils";
import { useParams, useNavigate } from "react-router-dom";
import {
  TaxResponse,
  CatalogServiceItem,
} from "../models/types";
import { fetchTaxDetail } from "../services/taxesService";
import { fetchCatalogServices } from "../services/commissionsService";
import { fetchProduits } from "@/features/produits/services/produitsService";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import { Distributeur } from "@/features/distributeurs/models/types";
import { fetchStructures, extractStructuresList } from "@/features/structures/services/structuresService";
import {
  fetchDefaultRealmUsers,
  DefaultRealmUser,
} from "@/core/security/accessSecurityService";

export interface TaxDetailPageProps {
  item?: TaxResponse | null;
  onBack?: () => void;
  catalogServices?: CatalogServiceItem[];
  products?: { id: string; nom: string }[];
  structures?: { id: string; name: string }[];
  distributors?: Distributeur[];
  activeAgencies?: { id: string; name: string }[];
}

export const TaxDetailPage: React.FC<TaxDetailPageProps> = ({
  item: initialItem,
  onBack,
  catalogServices = [],
  products = [],
  structures = [],
  distributors = [],
  activeAgencies = [],
}) => {
  const { id: routeId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<TaxResponse | null>(initialItem || null);
  const [loading, setLoading] = useState<boolean>(!initialItem && !!routeId);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const effectiveId = initialItem?.id || routeId;
  const fetchedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialItem) {
      setItem(initialItem);
      fetchedIdRef.current = initialItem.id;
    }
  }, [initialItem]);

  // Si monté directement par URL sans initialItem, ou si l'ID change
  useEffect(() => {
    let isMounted = true;
    if (effectiveId && (!initialItem || fetchedIdRef.current !== effectiveId)) {
      fetchedIdRef.current = effectiveId;
      setLoading(!initialItem);
      fetchTaxDetail(effectiveId)
        .then((detail) => {
          if (isMounted && detail) {
            setItem(detail);
          }
        })
        .catch((err) => {
          if (isMounted && !initialItem) {
            setError(err instanceof Error ? err.message : "Erreur de chargement de la taxe");
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [effectiveId, initialItem]);

  const [servicesList, setServicesList] = useState<CatalogServiceItem[]>(catalogServices);
  const [productsList, setProductsList] = useState(products);
  const [structuresList, setStructuresList] = useState(structures);
  const [distributorsList, setDistributorsList] = useState(distributors);
  const [securityUsers, setSecurityUsers] = useState<DefaultRealmUser[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchDefaultRealmUsers()
      .then((users) => {
        if (isMounted) setSecurityUsers(users);
      })
      .catch((err) => {
        console.error("Erreur chargement utilisateurs pour traçabilité:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const getUserDisplay = (userId?: string | null) => {
    if (!userId) return { name: "—", email: null, isResolved: false };
    const user = securityUsers.find((u) => u.user_id === userId);
    if (user) {
      return {
        name: user.username,
        email: user.email || null,
        isResolved: true,
      };
    }
    return {
      name: userId,
      email: null,
      isResolved: false,
    };
  };

  useEffect(() => {
    if (catalogServices.length > 0) setServicesList(catalogServices);
    else fetchCatalogServices().then(setServicesList).catch(() => {});

    if (products.length > 0) setProductsList(products);
    else fetchProduits().then((res) => setProductsList(Array.isArray(res) ? res : [])).catch(() => {});

    if (structures.length > 0) setStructuresList(structures);
    else fetchStructures().then((res) => setStructuresList(extractStructuresList(res))).catch(() => {});

    if (distributors.length > 0) setDistributorsList(distributors);
    else {
      fetchDistributeurs().then((res) => {
        const list = Array.isArray(res) ? res : Array.isArray((res as { items?: Distributeur[] })?.items) ? (res as { items: Distributeur[] }).items : [];
        setDistributorsList(list);
      }).catch(() => {});
    }
  }, [catalogServices, products, structures, distributors]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copié dans le presse-papiers");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const getTargetEntityInfo = () => {
    if (!item) return { label: "Entité cible", name: "—", rawId: null };
    if (item.tenant_level === "GLOBAL") {
      return {
        label: "Périmètre",
        name: "Global",
        rawId: null,
      };
    }
    if (item.tenant_level === "PRODUCT") {
      const prod = productsList.find(
        (p) => p.id === item.tenant_id || (p as { id: string; nom?: string; name?: string; code?: string }).code === item.tenant_id
      );
      const prodObj = prod as { nom?: string; name?: string } | undefined;
      return {
        label: "Produit cible",
        name: prodObj?.nom || prodObj?.name || item.tenant_id || "—",
        rawId: item.tenant_id,
      };
    }
    if (item.tenant_level === "STRUCTURE") {
      const structId = item.structure_id || item.tenant_id;
      const struct = structuresList.find(
        (s) => s.id === structId || (s as { id: string; name: string; code?: string }).code === structId
      );
      const structObj = struct as { name?: string; nom?: string } | undefined;
      return {
        label: "Structure cible",
        name: structObj?.name || structObj?.nom || structId || "—",
        rawId: structId,
      };
    }
    if (item.tenant_level === "AGENCY") {
      const ag = activeAgencies.find(
        (a) => a.id === item.tenant_id || (a as { id: string; name: string; code?: string }).code === item.tenant_id
      );
      const agObj = ag as { name?: string; nom?: string } | undefined;
      return {
        label: "Agence cible",
        name: agObj?.name || agObj?.nom || item.tenant_id || "—",
        rawId: item.tenant_id,
      };
    }
    if (item.tenant_level === "DISTRIBUTEUR") {
      const dist = distributorsList.find(
        (d) => d.id === item.tenant_id || (d as { id?: string; code?: string }).code === item.tenant_id
      );
      const distObj = dist as { nom?: string; name?: string } | undefined;
      return {
        label: "Distributeur cible",
        name: distObj?.nom || distObj?.name || item.tenant_id || "—",
        rawId: item.tenant_id,
      };
    }
    return {
      label: "Entité cible",
      name: item.tenant_id || "—",
      rawId: item.tenant_id,
    };
  };

  const serviceLabel =
    servicesList.find((s) => s.code === item?.service_type)?.label || item?.service_type || "—";

  const formatTaxTypeLabel = (type?: string) => {
    if (!type) return "—";
    switch (type) {
      case "TVA":
        return "TVA";
      case "TIMBRE_FISCAL":
        return "Timbre Fiscal";
      case "TAXE_REGIONALE":
        return "Taxe Régionale";
      default:
        return type;
    }
  };

  const formatClientTypeLabel = (type?: string) => {
    if (!type) return "—";
    switch (type) {
      case "PARTICULIER":
        return "Particulier";
      case "ENTREPRISE":
        return "Entreprise";
      case "TOUS":
        return "Tous";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground text-sm">Chargement des détails de la taxe...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="hover:underline">Retour aux taxes</span>
        </button>
        <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-2">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p>{error || "Taxe introuvable"}</p>
        </div>
      </div>
    );
  }

  const taxAmountNum = item.tax_amount !== undefined && item.tax_amount !== null ? Number(item.tax_amount) : null;
  const taxRateNum = item.tax_rate !== undefined && item.tax_rate !== null ? Number(item.tax_rate) : null;

  const formulaText = (() => {
    const hasAmount = taxAmountNum !== null && taxAmountNum > 0;
    const hasRate = taxRateNum !== null && taxRateNum > 0;

    if (hasAmount && hasRate) {
      return `${taxAmountNum.toLocaleString("fr-FR")} FCFA + ${taxRateNum}%`;
    }
    if (hasRate) {
      return `${taxRateNum}%`;
    }
    if (hasAmount) {
      return `${taxAmountNum.toLocaleString("fr-FR")} FCFA`;
    }
    if (taxAmountNum === 0 && taxRateNum === 0) {
      return "0 FCFA";
    }
    return "—";
  })();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-6"
      >
        {/* Card 1 : Informations Générales */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/40 gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Informations Générales</h3>
                <p className="text-xs text-muted-foreground">Caractéristiques principales et périmètre de la règle fiscale</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer self-start sm:self-auto group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span className="group-hover:underline">Retour aux taxes</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">ID Règle</span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                <span className="truncate select-all">{item.id}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(item.id, "id")}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  title="Copier l'identifiant"
                >
                  {copiedKey === "id" ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Niveau d'application</span>
              <p className="text-sm font-semibold text-foreground">
                {item.tenant_level === "GLOBAL"
                  ? "Global"
                  : item.tenant_level === "STRUCTURE"
                    ? "Structure"
                    : item.tenant_level === "PRODUCT"
                      ? "Produit"
                      : item.tenant_level === "AGENCY"
                        ? "Agence"
                        : item.tenant_level === "DISTRIBUTEUR"
                          ? "Distributeur"
                          : item.tenant_level}
              </p>
            </div>

            {(() => {
              const target = getTargetEntityInfo();
              return (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    {target.label}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground">
                        {target.name}
                      </p>
                      {target.rawId && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(target.rawId!, "tenant_id")}
                          className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                          title={`Copier l'identifiant cible (${target.rawId})`}
                        >
                          {copiedKey === "tenant_id" ? (
                            <Check className="h-3 w-3 text-accent" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                    {target.rawId && target.name !== target.rawId && (
                      <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5" title={target.rawId}>
                        ID: {target.rawId}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Type de Service</span>
              <p className="text-sm font-semibold text-foreground">{serviceLabel}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Type de Taxe</span>
              <p className="text-sm font-semibold text-foreground">{formatTaxTypeLabel(item.tax_type)}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Type de Client</span>
              <p className="text-sm font-semibold text-foreground">{formatClientTypeLabel(item.client_type)}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Statut</span>
              <p className="text-sm font-semibold text-foreground">{item.is_active ? "Actif" : "Inactif"}</p>
            </div>

            {item.override_reason && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-1 pt-4 border-t border-border/40">
                <span className="text-xs text-muted-foreground font-medium">Motif de dérogation</span>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {item.override_reason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 2 : Barème Fiscal & Prélèvements */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border/40">
            <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Barème Fiscal & Prélèvements</h3>
              <p className="text-xs text-muted-foreground">
                Taux de taxe, montant fixe et calcul appliqué
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Taux de taxe (%)</span>
              <p className="text-base font-semibold font-mono text-accent">
                {taxRateNum !== null ? `${taxRateNum}%` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Pourcentage prélevé sur le montant
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Montant fixe (FCFA)</span>
              <p className="text-base font-semibold font-mono text-accent">
                {taxAmountNum !== null ? `${taxAmountNum.toLocaleString("fr-FR")} FCFA` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Frais fiscaux forfaitaires par transaction
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Formule appliquée</span>
              <p className="text-base font-semibold font-mono text-foreground">
                {formulaText}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Total des prélèvements fiscaux appliqués
              </p>
            </div>
          </div>
        </div>

        {/* Card 3 : Traçabilité & Audit */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border/40">
            <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Traçabilité & Audit</h3>
              <p className="text-xs text-muted-foreground">Historique de création, de mise à jour et identifiants des intervenants</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Date de création</span>
              <p className="text-sm font-semibold text-foreground font-mono">
                {formatDateTime(item.created_at)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Créé par</span>
              {(() => {
                const user = getUserDisplay(item.created_by);
                if (!item.created_by) {
                  return <p className="text-sm font-semibold text-foreground">—</p>;
                }
                return (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground">
                        {user.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.created_by!, "created_by")}
                        className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                        title={`Copier l'identifiant (${item.created_by})`}
                      >
                        {copiedKey === "created_by" ? (
                          <Check className="h-3 w-3 text-accent" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    {user.email && (
                      <p className="text-xs text-muted-foreground truncate" title={user.email}>
                        {user.email}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Dernière mise à jour</span>
              <p className="text-sm font-semibold text-foreground font-mono">
                {formatDateTime(item.updated_at)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Modifié par</span>
              {(() => {
                const user = getUserDisplay(item.updated_by);
                if (!item.updated_by) {
                  return <p className="text-sm font-semibold text-foreground">—</p>;
                }
                return (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground">
                        {user.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.updated_by!, "updated_by")}
                        className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                        title={`Copier l'identifiant (${item.updated_by})`}
                      >
                        {copiedKey === "updated_by" ? (
                          <Check className="h-3 w-3 text-accent" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    {user.email && (
                      <p className="text-xs text-muted-foreground truncate" title={user.email}>
                        {user.email}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TaxDetailPage;
