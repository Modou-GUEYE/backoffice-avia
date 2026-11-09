import React from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Lock,
  RotateCcw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useNavigate } from "react-router-dom";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { TrackingPermissions } from "@/core/permissions/permissions";
import { useTrackingEvents } from "../viewmodels/useTrackingEvents";
import { TrackingDataTable } from "./components/TrackingDataTable";
import { TrackingSummaryCards } from "./components/TrackingSummaryCards";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ALL_VALUE = "__all__";

const METHOD_OPTIONS = [
  { value: "", label: "Toutes les méthodes" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DELETE" },
];

type FilterSelectProps = {
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
  locked?: boolean;
  className?: string;
  onChange: (value: string) => void;
};

/** Liste déroulante de filtre ; l'option « tous » (valeur vide) est portée par une valeur technique. */
const FilterSelect = ({ label, value, options, locked = false, className = "w-full sm:w-auto sm:min-w-[180px] gap-2", onChange }: FilterSelectProps) => (
  <Select
    value={value || ALL_VALUE}
    onValueChange={(next) => onChange(next === ALL_VALUE ? "" : next)}
    disabled={locked}
  >
    <SelectTrigger aria-label={label} title={locked ? `${label} imposé par votre périmètre` : label} className={className}>
      {locked && <Lock className="h-3.5 w-3.5 mr-2 shrink-0 text-muted-foreground" />}
      <SelectValue placeholder={label} />
    </SelectTrigger>
    <SelectContent>
      {options.map((opt) => (
        <SelectItem key={opt.value || ALL_VALUE} value={opt.value || ALL_VALUE}>
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const TrackingPage: React.FC = () => {
  const { currentPermissions } = useCurrentActor();
  // Même règle que l'accès au module : administrateur ou permission dédiée
  const canExport = Boolean(
    currentPermissions?.some((p) =>
      ["profile.bo-admin", "*", "all", TrackingPermissions.export].includes(p.toLowerCase()),
    ),
  );
  const {
    total,
    loading,
    exporting,
    error,
    filters,
    perimeter,
    updateFilters,
    resetFilters,
    refetch,
    safeEvents,
    summary,
    sourceOptions,
    produitOptions,
    entiteOptions,
    structureOptions,
    agenceOptions,
    caisseOptions,
    distributeurOptions,
    limit,
    skip,
    currentPage,
    totalPages,
    formatDate,
    formatUserAgent,
    handleExport,
  } = useTrackingEvents();
  const navigate = useNavigate();

  const hasActiveFilters = Boolean(
    filters.date_from ||
      filters.date_to ||
      filters.utilisateur ||
      filters.source ||
      filters.method ||
      filters.entite ||
      (filters.product_id && !perimeter.enforcedProductId) ||
      (filters.structure_id && !perimeter.enforcedStructureId) ||
      (filters.distributor_id && !perimeter.enforcedDistributorId) ||
      (filters.agence_id && !perimeter.enforcedAgencyId) ||
      (filters.caisse_id && !perimeter.enforcedCaisseId),
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center">
            <History className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tracking & Audit des Actions</h1>
            <p className="text-muted-foreground text-sm">Journalisation et traçabilité des opérations effectuées</p>
          </div>
        </div>
        {canExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={exporting} className="gradient-accent text-accent-foreground hover:opacity-90">
                <Download className={`h-4 w-4 mr-2 ${exporting ? "animate-pulse" : ""}`} />
                {exporting ? "Export en cours..." : "Exporter"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void handleExport("csv")}>
                <FileText className="mr-2 h-4 w-4" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleExport("xlsx")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                XLSX
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleExport("pdf")}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </motion.div>

      <TrackingSummaryCards summary={summary} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-4 space-y-3"
      >
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Utilisateur"
              placeholder="Rechercher un utilisateur..."
              className="pl-10"
              value={filters.utilisateur || ""}
              onChange={(e) => updateFilters({ utilisateur: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              type="datetime-local"
              aria-label="Date début"
              title="Date début"
              className="w-full sm:w-[200px]"
              value={filters.date_from || ""}
              onChange={(e) => updateFilters({ date_from: e.target.value })}
            />
            <span className="text-muted-foreground text-xs shrink-0">au</span>
            <Input
              type="datetime-local"
              aria-label="Date fin"
              title="Date fin"
              className="w-full sm:w-[200px]"
              value={filters.date_to || ""}
              onChange={(e) => updateFilters({ date_to: e.target.value })}
            />
          </div>
          <FilterSelect
            label="Module"
            value={filters.source}
            className="w-full sm:w-[200px]"
            options={sourceOptions}
            onChange={(value) => updateFilters({ source: value })}
          />
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={resetFilters}
              title="Réinitialiser les filtres"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <FilterSelect
            label="Produit"
            value={filters.product_id}
            options={produitOptions}
            locked={Boolean(perimeter.enforcedProductId)}
            onChange={(value) => updateFilters({ product_id: value, entite: "", agence_id: "" })}
          />
          <FilterSelect
            label="Niveau"
            value={filters.entite}
            options={entiteOptions}
            onChange={(value) => updateFilters({ entite: value })}
          />
          <FilterSelect
            label="Structure"
            value={filters.structure_id}
            options={structureOptions}
            locked={Boolean(perimeter.enforcedStructureId)}
            onChange={(value) => updateFilters({ structure_id: value, agence_id: "" })}
          />
          <FilterSelect
            label="Distributeur"
            value={filters.distributor_id}
            options={distributeurOptions}
            locked={Boolean(perimeter.enforcedDistributorId)}
            onChange={(value) => updateFilters({ distributor_id: value, agence_id: "", caisse_id: "" })}
          />
          <FilterSelect
            label="Agence"
            value={filters.agence_id}
            options={agenceOptions}
            locked={Boolean(perimeter.enforcedAgencyId)}
            onChange={(value) => updateFilters({ agence_id: value, caisse_id: "" })}
          />
          <FilterSelect
            label="Caisse"
            value={filters.caisse_id}
            options={caisseOptions}
            locked={Boolean(perimeter.enforcedCaisseId)}
            onChange={(value) => updateFilters({ caisse_id: value })}
          />
          <FilterSelect
            label="Méthode HTTP"
            value={filters.method}
            options={METHOD_OPTIONS}
            onChange={(value) => updateFilters({ method: value })}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        {error && (
          <div className="p-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="destructive" onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        )}

        <TrackingDataTable
          loading={loading}
          events={safeEvents}
          formatDate={formatDate}
          formatUserAgent={formatUserAgent}
          openDetail={(eventId) => navigate(`/dashboard/tracking/${eventId}/details`)}
        />

        {!loading && total > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-3 px-4 py-3 border-t border-border/60 bg-muted/20 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-muted-foreground">Lignes :</span>
                <select
                  aria-label="Lignes par page"
                  className="h-7 rounded border border-border bg-background px-1.5 text-xs focus:outline-hidden"
                  value={limit}
                  onChange={(e) => updateFilters({ limit: Number(e.target.value), skip: 0 })}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={skip === 0}
                onClick={() => updateFilters({ skip: Math.max(0, skip - limit) })}
                title="Page précédente"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-1 text-muted-foreground">
                Page <span className="font-medium text-foreground">{currentPage}</span> sur{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={skip + limit >= total}
                onClick={() => updateFilters({ skip: skip + limit })}
                title="Page suivante"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TrackingPage;
