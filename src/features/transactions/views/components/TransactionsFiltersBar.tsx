import React, { useState } from "react";
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
  Search,
  User,
  SlidersHorizontal,
  Calendar,
  AlertTriangle,
  Lock,
  MapPin,
} from "lucide-react";
import { TransactionFilters } from "../../models/types";
import { FilterOption } from "../../viewmodels/useTransactions";
import { CaisseFilterSelect } from "@/shared/filters/CaisseFilterSelect";
import type { CaisseFilterOption } from "@/shared/filters/useCaisseFilterOptions";
import { UserPerimeter } from "@/core/security/useUserPerimeter";

interface TransactionsFiltersBarProps {
  filters: TransactionFilters;
  onFilterChange: (key: keyof TransactionFilters, value: unknown) => void;
  structures: FilterOption[];
  agences: FilterOption[];
  caisses?: CaisseFilterOption[];
  caissesNeedAgency?: boolean;
  produits: FilterOption[];
  distributeurs: FilterOption[];
  moyensPaiement: FilterOption[];
  perimeter?: UserPerimeter;
}

// Statuts documentés dans le contrat OpenAPI: "Filtre sur le statut (initiee, validee, rejetee)"
const STATUT_OPTIONS = [
  { id: "all", label: "Tous les statuts" },
  { id: "initiee", label: "Initiée" },
  { id: "validee", label: "Validée" },
  { id: "rejetee", label: "Rejetée" },
];

const SENS_OPTIONS = [
  { id: "all", label: "Tous les sens" },
  { id: "CREDIT", label: "Crédit" },
  { id: "DEBIT", label: "Débit" },
];

export const TransactionsFiltersBar: React.FC<TransactionsFiltersBarProps> = ({
  filters,
  onFilterChange,
  structures,
  agences,
  caisses = [],
  caissesNeedAgency = false,
  produits,
  distributeurs,
  moyensPaiement,
  perimeter,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-card rounded-lg border border-border/60 p-4 space-y-3 shadow-xs">

      {/* Ligne principale des filtres directs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-center">
        {/* Recherche par Référence (partielle) */}
        <div className="relative md:col-span-2 lg:col-span-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Recherche par référence..."
            className="h-9 pl-8 text-xs bg-background"
            value={filters.reference || ""}
            onChange={(e) => onFilterChange("reference", e.target.value)}
          />
        </div>

        {/* Agence (en haut comme dans le Dashboard) */}
        <Select
          value={filters.agence_id || (perimeter?.enforcedAgencyId ?? "all")}
          onValueChange={(val) => onFilterChange("agence_id", val === "all" ? undefined : val)}
          disabled={Boolean(perimeter?.enforcedAgencyId)}
        >
          <SelectTrigger className="h-9 text-xs bg-background">
            <div className="flex items-center gap-1.5 truncate">
              {perimeter?.enforcedAgencyId ? (
                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <SelectValue placeholder="Toutes les agences" />
            </div>
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

        {/* Type d'opération */}
        <Input
          placeholder="Type d'opération (ex: Retrait...)"
          className="h-9 text-xs bg-background"
          value={filters.type_transaction || ""}
          onChange={(e) => onFilterChange("type_transaction", e.target.value)}
        />

        {/* Statut (contrat: initiee, validee, rejetee) */}
        <Select
          value={filters.statut || "all"}
          onValueChange={(val) => onFilterChange("statut", val === "all" ? undefined : val)}
        >
          <SelectTrigger className="h-9 text-xs bg-background">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {STATUT_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bouton pour basculer les filtres avancés */}
        <Button
          variant="outline"
          size="sm"
          className={`h-9 text-xs gap-2 justify-center transition-all ${
            showAdvanced
              ? "bg-primary/10 border-primary/40 text-primary font-medium"
              : "text-muted-foreground"
          }`}
          onClick={() => setShowAdvanced((prev) => !prev)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
          <span>Filtres avancés</span>
          <svg
            className={`h-3 w-3 shrink-0 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </Button>
      </div>

      {/* Filtres avancés : tous les autres paramètres supportés par le contrat OpenAPI */}
      {showAdvanced && (
        <div className="pt-3 border-t border-border/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 items-end">
            {/* Caisse (caisse_id) : caisses de l'agence choisie */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">Caisse</label>
              <CaisseFilterSelect
                value={filters.caisse_id}
                options={caisses}
                lockedCaisseId={perimeter?.enforcedCaisseId}
                needsAgency={caissesNeedAgency}
                onChange={(value) => onFilterChange("caisse_id", value)}
                triggerClassName="h-8 text-xs bg-background"
              />
            </div>

            {/* Date début (date_from) */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date début
              </label>
              <Input
                type="date"
                className="h-8 text-xs bg-background"
                value={filters.date_from || ""}
                onChange={(e) => onFilterChange("date_from", e.target.value || undefined)}
              />
            </div>

            {/* Date fin (date_to) */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date fin
              </label>
              <Input
                type="date"
                className="h-8 text-xs bg-background"
                value={filters.date_to || ""}
                onChange={(e) => onFilterChange("date_to", e.target.value || undefined)}
              />
            </div>

            {/* Montant Min */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Montant min</label>
              <Input
                type="number"
                placeholder="Montant min"
                className="h-8 text-xs bg-background"
                value={filters.montant_min ?? ""}
                onChange={(e) =>
                  onFilterChange("montant_min", e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>

            {/* Montant Max */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Montant max</label>
              <Input
                type="number"
                placeholder="Montant max"
                className="h-8 text-xs bg-background"
                value={filters.montant_max ?? ""}
                onChange={(e) =>
                  onFilterChange("montant_max", e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>


            {/* Structure (Institution partenaire) */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                {perimeter?.enforcedStructureId && <Lock className="h-3 w-3 text-muted-foreground" />}
                {perimeter?.isPartnerUser ? "Partenaire" : "Structure"}
              </label>
              <Select
                value={filters.structure_id || (perimeter?.enforcedStructureId ?? "all")}
                onValueChange={(val) => onFilterChange("structure_id", val === "all" ? undefined : val)}
                disabled={Boolean(perimeter?.enforcedStructureId)}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
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
            </div>

            {/* Agent */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                Agent
              </label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Nom ou code agent..."
                  className="h-8 pl-8 text-xs bg-background"
                  value={filters.agent || ""}
                  onChange={(e) => onFilterChange("agent", e.target.value)}
                />
              </div>
            </div>

            {/* Moyen de paiement */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Moyen de paiement</label>
              <Select
                value={filters.moyen_paiement || "all"}
                onValueChange={(val) => onFilterChange("moyen_paiement", val === "all" ? undefined : val)}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
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
            </div>

            {/* Sens */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Sens</label>
              <Select
                value={filters.sens || "all"}
                onValueChange={(val) => onFilterChange("sens", val === "all" ? undefined : val)}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
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
            </div>

            {/* Produit */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                {perimeter?.enforcedProductId && <Lock className="h-3 w-3 text-muted-foreground" />}
                Produit
              </label>
              <Select
                value={filters.produit_id || filters.produit || (perimeter?.enforcedProductId ?? "all")}
                onValueChange={(val) => onFilterChange("produit_id", val === "all" ? undefined : val)}
                disabled={Boolean(perimeter?.enforcedProductId)}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
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
            </div>

            {/* Distributeur */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                {perimeter?.enforcedDistributorId && <Lock className="h-3 w-3 text-muted-foreground" />}
                Distributeur
              </label>
              <Select
                value={filters.distributeur_id || (perimeter?.enforcedDistributorId ?? "all")}
                onValueChange={(val) => onFilterChange("distributeur_id", val === "all" ? undefined : val)}
                disabled={Boolean(perimeter?.enforcedDistributorId)}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
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
            </div>

            {/* Filtre Anomalie d'ordre */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Anomalies
              </label>
              <Button
                variant={filters.anomalie_ordre ? "destructive" : "outline"}
                size="sm"
                className="h-8 text-xs gap-1.5 w-full justify-center"
                onClick={() =>
                  onFilterChange(
                    "anomalie_ordre",
                    filters.anomalie_ordre === true ? undefined : true
                  )
                }
              >
                {filters.anomalie_ordre ? "Anomalies uniquement (Actif)" : "Anomalies d'ordre uniquement"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
