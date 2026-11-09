import React from "react";
import { AlertCircle, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDashboard } from "../viewmodels/useDashboard";
import { DashboardKPIs } from "./components/DashboardKPIs";
import { DashboardFiltersBar } from "./components/DashboardFiltersBar";
import { DashboardCharts } from "./components/DashboardCharts";

const DashboardPage: React.FC = () => {
  const {
    summary,
    loading,
    error,
    filters,
    structures,
    agences,
    caisses,
    caissesNeedAgency,
    produits,
    distributeurs,
    moyensPaiement,
    perimeter,
    updateFilter,
    refetch,
  } = useDashboard();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-4 pb-1"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-accent text-accent-foreground shadow-lg shadow-primary/25">
          <LayoutDashboard className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Tableau de bord
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Synthèse globale des transactions et métriques consolidées
          </p>
        </div>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Erreur de chargement</AlertTitle>
          <AlertDescription className="flex items-center justify-between mt-1 text-xs">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="ml-4 h-7 text-xs border-destructive/40 hover:bg-destructive/10"
            >
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters Toolbar - 100% aligné contrat OpenAPI */}
      <DashboardFiltersBar
        filters={filters}
        structures={structures}
        agences={agences}
        caisses={caisses}
        caissesNeedAgency={caissesNeedAgency}
        produits={produits}
        distributeurs={distributeurs}
        moyensPaiement={moyensPaiement}
        loading={loading}
        perimeter={perimeter}
        updateFilter={updateFilter}
        refetch={refetch}
      />

      {/* Key Performance Indicators */}
      <DashboardKPIs
        summary={summary}
        loading={loading}
      />

      {/* Analytics Charts & Breakdowns */}
      <DashboardCharts
        summary={summary}
        loading={loading}
      />
    </div>
  );
};

export default DashboardPage;
