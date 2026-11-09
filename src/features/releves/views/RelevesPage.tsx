import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ChevronLeft, ChevronRight, FileSpreadsheet, Lock, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MOIS_LABELS, formatMontant, formatPeriode } from "../models/data";
import { useReleves } from "../viewmodels/useReleves";
import { GenerateReleveDialog } from "./components/GenerateReleveDialog";
import { ReleveStatutBadge } from "./components/ReleveStatutBadge";

const ALL_VALUE = "__all__";
const COLUMN_COUNT = 7;

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, index) => currentYear - index);

export const RelevesPage: React.FC = () => {
  const vm = useReleves();
  const navigate = useNavigate();
  const openDetail = (id: string) => navigate(`/dashboard/releves/${id}`);

  const hasActiveFilters = Boolean(
    (vm.filters.structure && !vm.enforcedStructure) || vm.filters.annee || vm.filters.mois || vm.filters.statut,
  );

  let body: React.ReactNode;
  if (vm.loading) {
    body = Array.from({ length: 5 }).map((_, idx) => (
      <TableRow key={idx} className="animate-pulse border-border/30">
        {Array.from({ length: COLUMN_COUNT }).map((__, cell) => (
          <TableCell key={cell}>
            <div className="h-4 bg-muted rounded w-20" />
          </TableCell>
        ))}
      </TableRow>
    ));
  } else if (vm.items.length === 0) {
    body = (
      <TableRow>
        <TableCell colSpan={COLUMN_COUNT} className="py-12 text-center text-muted-foreground">
          <div className="flex flex-col items-center justify-center gap-2">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50" />
            <p className="font-medium text-sm">Aucun relevé mensuel trouvé</p>
            <p className="text-xs">
              {vm.canGenerate ? "Générez le relevé d'un mois ou modifiez les filtres." : "Modifiez les filtres de recherche."}
            </p>
          </div>
        </TableCell>
      </TableRow>
    );
  } else {
    body = vm.items.map((releve) => (
      <TableRow
        key={releve.id}
        className={`border-border/30 ${vm.canRead ? "hover:bg-muted/30 cursor-pointer" : ""}`}
        onClick={vm.canRead ? () => openDetail(releve.id) : undefined}
        title={vm.canRead ? "Voir le détail du relevé" : undefined}
      >
        <TableCell className="font-medium whitespace-nowrap">{formatPeriode(releve.annee, releve.mois)}</TableCell>
        <TableCell>{vm.getStructureName(releve.structure)}</TableCell>
        <TableCell className="text-right tabular-nums">{releve.nombre_transactions.toLocaleString("fr-FR")}</TableCell>
        <TableCell className="text-right tabular-nums whitespace-nowrap">{formatMontant(releve.volume_total)}</TableCell>
        <TableCell className="text-right tabular-nums whitespace-nowrap">{formatMontant(releve.total_frais)}</TableCell>
        <TableCell className="text-right tabular-nums whitespace-nowrap font-semibold">
          {formatMontant(releve.montant_net_a_reverser)}
        </TableCell>
        <TableCell>
          <ReleveStatutBadge statut={releve.statut} />
        </TableCell>
      </TableRow>
    ));
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center">
            <FileSpreadsheet className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relevés mensuels</h1>
            <p className="text-muted-foreground text-sm">Commissions du mois par structure et montant net à reverser</p>
          </div>
        </div>
        {vm.canGenerate && (
          <Button onClick={vm.openGenerate} className="gradient-accent text-accent-foreground hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" /> Générer un relevé
          </Button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-4"
      >
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          {vm.enforcedStructure ? (
            <div
              className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/40 text-sm sm:min-w-[200px]"
              title="Structure imposée par votre périmètre"
            >
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              {vm.enforcedStructureLabel}
            </div>
          ) : (
            <Select
              value={vm.filters.structure || ALL_VALUE}
              onValueChange={(v) => vm.updateFilters({ structure: v === ALL_VALUE ? undefined : v })}
            >
              <SelectTrigger aria-label="Structure" className="w-full sm:w-auto sm:min-w-[200px] gap-2">
                <SelectValue placeholder="Structure" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Toutes les structures</SelectItem>
                {vm.structureOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={vm.filters.annee ? String(vm.filters.annee) : ALL_VALUE}
            onValueChange={(v) => vm.updateFilters({ annee: v === ALL_VALUE ? undefined : Number(v) })}
          >
            <SelectTrigger aria-label="Année" className="w-full sm:w-auto sm:min-w-[160px] gap-2">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Toutes les années</SelectItem>
              {YEAR_OPTIONS.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={vm.filters.mois ? String(vm.filters.mois) : ALL_VALUE}
            onValueChange={(v) => vm.updateFilters({ mois: v === ALL_VALUE ? undefined : Number(v) })}
          >
            <SelectTrigger aria-label="Mois" className="w-full sm:w-auto sm:min-w-[160px] gap-2">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tous les mois</SelectItem>
              {MOIS_LABELS.map((label, index) => (
                <SelectItem key={label} value={String(index + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={vm.filters.statut || ALL_VALUE}
            onValueChange={(v) => vm.updateFilters({ statut: v === ALL_VALUE ? undefined : v })}
          >
            <SelectTrigger aria-label="Statut" className="w-full sm:w-auto sm:min-w-[160px] gap-2">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tous les statuts</SelectItem>
              <SelectItem value="brouillon">Brouillon</SelectItem>
              <SelectItem value="fige">Figé</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={vm.resetFilters}
              title="Réinitialiser les filtres"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        {vm.error && (
          <div className="p-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{vm.error}</span>
            </div>
            <Button size="sm" variant="destructive" onClick={() => void vm.reload()}>
              Réessayer
            </Button>
          </div>
        )}

        <div className="overflow-auto max-h-[70vh]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow className="border-border/50">
                <TableHead>Période</TableHead>
                <TableHead>Structure</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Frais</TableHead>
                <TableHead className="text-right">Net à reverser</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{body}</TableBody>
          </Table>
        </div>

        {!vm.loading && vm.total > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-3 px-4 py-3 border-t border-border/60 bg-muted/20 text-xs">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={vm.skip === 0}
                onClick={() => vm.updateFilters({ skip: Math.max(0, vm.skip - vm.limit) })}
                title="Page précédente"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-1 text-muted-foreground">
                Page <span className="font-medium text-foreground">{vm.currentPage}</span> sur{" "}
                <span className="font-medium text-foreground">{vm.totalPages}</span>
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={vm.skip + vm.limit >= vm.total}
                onClick={() => vm.updateFilters({ skip: vm.skip + vm.limit })}
                title="Page suivante"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {vm.canGenerate && <GenerateReleveDialog vm={vm} onGenerated={(id) => (vm.canRead ? openDetail(id) : undefined)} />}
    </div>
  );
};

export default RelevesPage;
