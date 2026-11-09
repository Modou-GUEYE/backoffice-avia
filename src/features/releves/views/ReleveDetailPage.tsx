import React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  Lock,
  Package,
  PieChart,
  RefreshCw,
  Send,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import {
  BENEFICIAIRES,
  formatDate,
  formatDateTime,
  formatMontant,
  formatPeriode,
} from "../models/data";
import type { MontantsParBeneficiaire, ReleveGroupe } from "../models/types";
import { useReleveDetail } from "../viewmodels/useReleveDetail";
import { CorrectionDialog } from "./components/CorrectionDialog";
import { NotificationReleveDialog } from "./components/NotificationReleveDialog";
import { ReleveStatutBadge } from "./components/ReleveStatutBadge";

const InfoItem = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`space-y-1 min-w-0 ${className}`}>
    <span className="text-xs text-muted-foreground font-medium block">{label}</span>
    <div className="text-sm font-semibold text-foreground break-words">{children}</div>
  </div>
);

type SectionCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  delay: number;
  children: React.ReactNode;
};

const SectionCard = ({ icon: Icon, title, description, delay, children }: SectionCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass-card rounded-xl p-6 space-y-5"
  >
    <div className="flex items-center gap-3 pb-4 border-b border-border/40">
      <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    {children}
  </motion.div>
);

const montant = (values: MontantsParBeneficiaire | undefined, key: keyof MontantsParBeneficiaire) => values?.[key] ?? 0;

/** Quotes-parts brutes, ajustements reportés et net, par type de bénéficiaire. */
const BeneficiairesTable = ({
  quoteparts,
  ajustements,
  nets,
}: {
  quoteparts: MontantsParBeneficiaire;
  ajustements?: MontantsParBeneficiaire;
  nets?: MontantsParBeneficiaire;
}) => (
  <div className="border border-border/60 rounded-xl overflow-x-auto">
    <Table>
      <TableHeader className="bg-muted/40">
        <TableRow>
          <TableHead>Bénéficiaire</TableHead>
          <TableHead className="text-right">Quote-part brute</TableHead>
          <TableHead className="text-right">Ajustements</TableHead>
          <TableHead className="text-right">Net</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {BENEFICIAIRES.map(({ type, label }) => {
          const ajustement = montant(ajustements, type);
          return (
            <TableRow key={type}>
              <TableCell className="font-medium">{label}</TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">{formatMontant(montant(quoteparts, type))}</TableCell>
              <TableCell
                className={`text-right tabular-nums ${
                  ajustement < 0 ? "text-destructive" : ajustement > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                }`}
              >
                {ajustement > 0 ? "+" : ""}
                {formatMontant(ajustement)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold whitespace-nowrap">
                {formatMontant(nets ? montant(nets, type) : montant(quoteparts, type) + ajustement)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

/** Détail par produit ou par distributeur ; `quoteparts` = somme de toutes les quotes-parts du groupe. */
const GroupesTable = ({ groupes, label }: { groupes: Record<string, ReleveGroupe>; label: string }) => {
  const entries = Object.entries(groupes ?? {});
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune transaction sur la période.</p>;
  }
  return (
    <div className="border border-border/60 rounded-xl overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>{label}</TableHead>
            <TableHead className="text-right whitespace-nowrap">Transactions</TableHead>
            <TableHead className="text-right whitespace-nowrap">Volume</TableHead>
            <TableHead className="text-right whitespace-nowrap">Frais</TableHead>
            <TableHead className="text-right whitespace-nowrap" title="Somme de toutes les quotes-parts des transactions du groupe">
              Quotes-parts
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([name, groupe]) => (
            <TableRow key={name}>
              <TableCell className="font-medium min-w-[140px]">{name}</TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">{(groupe.nombre ?? 0).toLocaleString("fr-FR")}</TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">{formatMontant(groupe.volume)}</TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">{formatMontant(groupe.frais)}</TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">{formatMontant(groupe.quoteparts)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const ReleveDetailPage = () => {
  const navigate = useNavigate();
  const { releveId } = useParams<{ releveId: string }>();
  const vm = useReleveDetail(releveId);
  const releve = vm.releve;

  if (!vm.canRead) return <Navigate to="/dashboard/releves" replace />;

  let body: React.ReactNode;
  if (vm.loading) {
    body = (
      <div className="glass-card rounded-xl py-16 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <span>Chargement du relevé...</span>
      </div>
    );
  } else if (!releve) {
    body = (
      <div className="glass-card rounded-xl py-12 text-center text-destructive space-y-2">
        <AlertCircle className="h-8 w-8 mx-auto" />
        <p className="font-semibold text-sm">{vm.error || "Impossible de charger le relevé."}</p>
      </div>
    );
  } else {
    const ajustements = releve.ajustements_anterieurs ?? [];
    body = (
      <>
        <SectionCard icon={FileText} title="Informations du relevé" description="Période, volumes et montant net dû à la structure" delay={0.05}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <InfoItem label="Structure">
              {vm.structureLabel}
            </InfoItem>
            <InfoItem label="Période">
              {formatDate(releve.periode_debut)} au {formatDate(releve.periode_fin)}
            </InfoItem>
            <InfoItem label="Statut">
              <ReleveStatutBadge statut={releve.statut} />
            </InfoItem>
            <InfoItem label="Transactions">{releve.nombre_transactions.toLocaleString("fr-FR")}</InfoItem>
            <InfoItem label="Volume total">{formatMontant(releve.volume_total)}</InfoItem>
            <InfoItem label="Total des frais">{formatMontant(releve.total_frais)}</InfoItem>
            <InfoItem label="Ajustements reportés">{formatMontant(releve.total_ajustements)}</InfoItem>
            <InfoItem label="Net à reverser à la structure">
              <span className="text-lg text-accent">{formatMontant(releve.montant_net_a_reverser)}</span>
            </InfoItem>
            {vm.isFige && (
              <InfoItem label="Figé le">
                {formatDateTime(releve.fige_le)}
                {releve.fige_par ? ` par ${releve.fige_par}` : ""}
              </InfoItem>
            )}
            <InfoItem label="Dernière mise à jour">{formatDateTime(releve.updated_at)}</InfoItem>
          </div>
        </SectionCard>

        <SectionCard icon={PieChart} title="Quotes-parts par bénéficiaire" description="Montants bruts du mois, ajustements reportés et net" delay={0.1}>
          <BeneficiairesTable
            quoteparts={releve.total_quoteparts}
            ajustements={releve.ajustements_par_beneficiaire}
            nets={releve.montants_nets_par_beneficiaire}
          />
        </SectionCard>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard icon={Package} title="Détail par produit" description="Transactions du mois regroupées par produit" delay={0.15}>
            <GroupesTable groupes={releve.detail_par_produit} label="Produit" />
          </SectionCard>
          <SectionCard icon={Building2} title="Détail par distributeur" description="Transactions du mois regroupées par distributeur" delay={0.2}>
            <GroupesTable groupes={releve.detail_par_distributeur} label="Distributeur" />
          </SectionCard>
        </div>

        <SectionCard
          icon={History}
          title="Ajustements reportés"
          description="Corrections de relevés figés antérieurs, imputées sur ce relevé"
          delay={0.25}
        >
          {ajustements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun ajustement reporté sur ce relevé.</p>
          ) : (
            <div className="border border-border/60 rounded-xl overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Bénéficiaire</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Saisi par</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ajustements.map((a) => (
                    <TableRow key={a.correction_id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(a.created_at)}</TableCell>
                      <TableCell>{a.motif}</TableCell>
                      <TableCell>
                        {BENEFICIAIRES.find((b) => b.type === a.beneficiaire_type)?.label ?? a.beneficiaire_type}
                        {a.beneficiaire_id ? <span className="text-muted-foreground"> · {a.beneficiaire_id}</span> : null}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold ${a.montant < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {a.montant > 0 ? "+" : ""}
                        {formatMontant(a.montant)}
                      </TableCell>
                      <TableCell>{a.cree_par}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      </>
    );
  }

  const showRecalculate = Boolean(releve && !vm.isFige && vm.canGenerate);
  const showFreeze = Boolean(releve && !vm.isFige && vm.canFreeze);
  const showCorrect = Boolean(releve && vm.isFige && vm.canCorrect);
  const showExport = Boolean(releve && vm.canExport);
  const showNotify = Boolean(releve && vm.canNotify);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-transparent hover:text-inherit shrink-0"
            onClick={() => navigate("/dashboard/releves")}
            aria-label="Retour aux relevés"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-14 w-14 rounded-2xl border border-border/80 bg-background/50 backdrop-blur-sm shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            <div className="h-full w-full bg-accent/10 flex items-center justify-center text-accent">
              <FileSpreadsheet className="h-7 w-7" />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">
              {releve ? `Relevé ${formatPeriode(releve.annee, releve.mois)}` : "Relevé mensuel"}
            </h1>
            <p className="text-muted-foreground text-sm">{releve ? vm.structureLabel : "Relevés mensuels"}</p>
          </div>
        </div>

        {(showRecalculate || showFreeze || showCorrect || showExport || showNotify) && (
          <div className="flex flex-wrap items-center gap-2">
            {showExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={vm.exporting !== null}>
                    {vm.exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    Exporter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 text-xs">
                  <DropdownMenuItem onClick={() => void vm.exportReleve("xlsx")} className="cursor-pointer gap-2">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Format Excel (.xlsx)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void vm.exportReleve("pdf")} className="cursor-pointer gap-2">
                    <FileText className="h-3.5 w-3.5 text-rose-600" />
                    <span>Format PDF (.pdf)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {showNotify && (
              <Button variant="outline" disabled={vm.notifying} onClick={() => void vm.prepareNotification()}>
                {vm.notifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Notifier
              </Button>
            )}
            {showRecalculate && (
              <Button variant="outline" disabled={vm.actionLoading} onClick={() => void vm.recalculate()}>
                <RefreshCw className={`h-4 w-4 mr-2 ${vm.actionLoading ? "animate-spin" : ""}`} />
                Recalculer
              </Button>
            )}
            {showCorrect && (
              <Button variant="outline" disabled={vm.actionLoading} onClick={() => vm.setCorrectionOpen(true)}>
                <Undo2 className="h-4 w-4 mr-2" />
                Ajouter une correction
              </Button>
            )}
            {showFreeze && (
              <Button
                disabled={vm.actionLoading}
                onClick={() => vm.setFreezeConfirmOpen(true)}
                className="gradient-accent text-accent-foreground hover:opacity-90"
              >
                <Lock className="h-4 w-4 mr-2" />
                Figer le relevé
              </Button>
            )}
          </div>
        )}
      </motion.div>

      {body}

      <ConfirmDialog
        open={vm.freezeConfirmOpen}
        onOpenChange={(open) => !vm.actionLoading && vm.setFreezeConfirmOpen(open)}
        title="Figer le relevé"
        description={
          releve
            ? `Le relevé ${formatPeriode(releve.annee, releve.mois)} de ${vm.structureLabel} sera clôturé définitivement (net à reverser : ${formatMontant(releve.montant_net_a_reverser)}). Cette action est irréversible : le relevé ne pourra plus être recalculé.`
            : ""
        }
        confirmLabel="Figer définitivement"
        cancelLabel="Annuler"
        onConfirm={() => void vm.freeze()}
        confirmDisabled={vm.actionLoading}
        destructive
      />

      <CorrectionDialog vm={vm} />
      <NotificationReleveDialog vm={vm} />
    </div>
  );
};

export default ReleveDetailPage;
