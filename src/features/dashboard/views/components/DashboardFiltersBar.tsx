import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  SlidersHorizontal,
  MapPin,
  Building2,
  ArrowUpDown,
  CreditCard,
  Package,
  Truck,
  Layers,
  Lock,
  ChevronDown,
} from "lucide-react";
import { DashboardFilters, FilterOption } from "../../models/types";
import { UserPerimeter } from "@/core/security/useUserPerimeter";
import { CaisseFilterSelect } from "@/shared/filters/CaisseFilterSelect";
import type { CaisseFilterOption } from "@/shared/filters/useCaisseFilterOptions";

interface DashboardFiltersBarProps {
  filters: DashboardFilters;
  structures: FilterOption[];
  agences: FilterOption[];
  caisses?: CaisseFilterOption[];
  caissesNeedAgency?: boolean;
  produits: FilterOption[];
  distributeurs: FilterOption[];
  moyensPaiement?: FilterOption[];
  loading: boolean;
  perimeter?: UserPerimeter;
  updateFilter: (key: keyof DashboardFilters, value: string | undefined) => void;
  refetch?: () => void;
}

const SENS_OPTIONS = [
  { id: "all", label: "Tous les sens" },
  { id: "credit", label: "Crédit" },
  { id: "debit", label: "Débit" },
];

/** Contrôle de saisie : fond teinté, coins arrondis, anneau de focus. */
const controlClass =
  "h-10 rounded-xl border-transparent bg-muted/50 text-xs shadow-none transition-colors hover:bg-muted/80 focus:bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/20";

const Field: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({
  icon,
  label,
  children,
}) => (
  <div className="space-y-1.5">
    <label className="flex h-4 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      <span>{label}</span>
    </label>
    {children}
  </div>
);

const iconClass = "h-3.5 w-3.5 text-primary/70";

export const DashboardFiltersBar: React.FC<DashboardFiltersBarProps> = ({
  filters,
  structures,
  agences,
  caisses = [],
  caissesNeedAgency = false,
  produits,
  distributeurs,
  moyensPaiement = [],
  perimeter,
  updateFilter,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const lockOrIcon = (locked: unknown, icon: React.ReactNode) =>
    locked ? <Lock className={iconClass} /> : icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

      <div className="relative mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <SlidersHorizontal className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Filtres</h2>
          <p className="text-[11px] text-muted-foreground">Affinez la période et le périmètre analysés</p>
        </div>
      </div>

      {/* Ligne principale des filtres directs */}
      <div className="relative grid grid-cols-1 items-end gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Field icon={<Calendar className={iconClass} />} label="Date début">
          <Input
            type="date"
            className={controlClass}
            value={filters.date_from || ""}
            onChange={(e) => updateFilter("date_from", e.target.value || undefined)}
          />
        </Field>

        <Field icon={<Calendar className={iconClass} />} label="Date fin">
          <Input
            type="date"
            className={controlClass}
            value={filters.date_to || ""}
            onChange={(e) => updateFilter("date_to", e.target.value || undefined)}
          />
        </Field>

        <Field icon={<Layers className={iconClass} />} label="Opération">
          <Input
            placeholder="Ex: Versement, Retrait..."
            className={controlClass}
            value={filters.type_transaction || ""}
            onChange={(e) => updateFilter("type_transaction", e.target.value || undefined)}
          />
        </Field>

        <Field icon={<ArrowUpDown className={iconClass} />} label="Sens">
          <Select
            value={filters.sens || "all"}
            onValueChange={(val) => updateFilter("sens", val === "all" ? undefined : val)}
          >
            <SelectTrigger className={controlClass}>
              <SelectValue placeholder="Tous les sens" />
            </SelectTrigger>
            <SelectContent>
              {SENS_OPTIONS.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field icon={<CreditCard className={iconClass} />} label="Moyen de paiement">
          <Select
            value={filters.moyen_paiement || "all"}
            onValueChange={(val) => updateFilter("moyen_paiement", val === "all" ? undefined : val)}
          >
            <SelectTrigger className={controlClass}>
              <SelectValue placeholder="Tous les moyens" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Tous les moyens</SelectItem>
              {moyensPaiement.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field icon={<SlidersHorizontal className={iconClass} />} label="Options">
          <Button
            type="button"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((prev) => !prev)}
            className={`group h-10 w-full justify-between gap-2 rounded-xl px-3 text-xs font-semibold shadow-sm transition-all ${
              showAdvanced
                ? "gradient-accent text-accent-foreground shadow-primary/25 hover:opacity-90"
                : "border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:shadow-md"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${
                  showAdvanced ? "bg-white/20" : "bg-primary/15"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{showAdvanced ? "Masquer options" : "Filtres avancés"}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} />
            </span>
          </Button>
        </Field>
      </div>

      {/* Filtres avancés */}
      <AnimatePresence initial={false}>
        {showAdvanced && (
          <motion.div
            key="advanced"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative overflow-hidden"
          >
            <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                <Field icon={lockOrIcon(perimeter?.enforcedProductId, <Package className={iconClass} />)} label="Produit">
                  <Select
                    value={filters.produit_id || filters.produit || (perimeter?.enforcedProductId ?? "all")}
                    onValueChange={(val) => updateFilter("produit_id", val === "all" ? undefined : val)}
                    disabled={Boolean(perimeter?.enforcedProductId)}
                  >
                    <SelectTrigger className={controlClass}>
                      <SelectValue placeholder="Tous les produits" />
                    </SelectTrigger>
                    <SelectContent>
                      {!perimeter?.enforcedProductId && (
                        <SelectItem value="all" className="text-xs">Tous les produits</SelectItem>
                      )}
                      {produits.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  icon={lockOrIcon(perimeter?.enforcedStructureId, <Building2 className={iconClass} />)}
                  label={perimeter?.isPartnerUser ? "Partenaire" : "Structure"}
                >
                  <Select
                    value={filters.structure_id || (perimeter?.enforcedStructureId ?? "all")}
                    onValueChange={(val) => updateFilter("structure_id", val === "all" ? undefined : val)}
                    disabled={Boolean(perimeter?.enforcedStructureId)}
                  >
                    <SelectTrigger className={controlClass}>
                      <SelectValue placeholder="Toutes les structures" />
                    </SelectTrigger>
                    <SelectContent>
                      {!perimeter?.enforcedStructureId && (
                        <SelectItem value="all" className="text-xs">Toutes les structures</SelectItem>
                      )}
                      {structures.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field icon={lockOrIcon(perimeter?.enforcedAgencyId, <MapPin className={iconClass} />)} label="Agence">
                  <Select
                    value={filters.agence_id || (perimeter?.enforcedAgencyId ?? "all")}
                    onValueChange={(val) => updateFilter("agence_id", val === "all" ? undefined : val)}
                    disabled={Boolean(perimeter?.enforcedAgencyId)}
                  >
                    <SelectTrigger className={controlClass}>
                      <SelectValue placeholder="Toutes les agences" />
                    </SelectTrigger>
                    <SelectContent>
                      {!perimeter?.enforcedAgencyId && (
                        <SelectItem value="all" className="text-xs">Toutes les agences</SelectItem>
                      )}
                      {agences.map((ag) => (
                        <SelectItem key={ag.id} value={ag.id} className="text-xs">
                          {ag.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field icon={null} label="Caisse">
                  <CaisseFilterSelect
                    value={filters.caisse_id}
                    options={caisses}
                    lockedCaisseId={perimeter?.enforcedCaisseId}
                    needsAgency={caissesNeedAgency}
                    triggerClassName={controlClass}
                    onChange={(value) => updateFilter("caisse_id", value)}
                  />
                </Field>

                <Field icon={lockOrIcon(perimeter?.enforcedDistributorId, <Truck className={iconClass} />)} label="Distributeur">
                  <Select
                    value={filters.distributeur_id || (perimeter?.enforcedDistributorId ?? "all")}
                    onValueChange={(val) => updateFilter("distributeur_id", val === "all" ? undefined : val)}
                    disabled={Boolean(perimeter?.enforcedDistributorId)}
                  >
                    <SelectTrigger className={controlClass}>
                      <SelectValue placeholder="Tous les distributeurs" />
                    </SelectTrigger>
                    <SelectContent>
                      {!perimeter?.enforcedDistributorId && (
                        <SelectItem value="all" className="text-xs">Tous les distributeurs</SelectItem>
                      )}
                      {distributeurs.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
