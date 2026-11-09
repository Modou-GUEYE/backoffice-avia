import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Copy,
  Landmark,
} from "lucide-react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useCaisseDetail } from "../viewmodels/useCaisseDetail";
import { CaisseFormDialog } from "./components/CaisseFormDialog";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const CaisseDetailPage: React.FC = () => {
  const vm = useCaisseDetail();
  const navigate = useNavigate();
  const { distributorId } = useParams<{ distributorId?: string; id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const effectiveDistributorId =
    distributorId ||
    searchParams.get("fromDistributeur") ||
    searchParams.get("distributorId") ||
    (location.state as { fromDistributorId?: string })?.fromDistributorId;

  const handleBack = () => {
    if (effectiveDistributorId) {
      navigate(`/dashboard/distributeurs/${effectiveDistributorId}?tab=caisses`);
    } else {
      navigate("/dashboard/caisses");
    }
  };

  const backLabel = effectiveDistributorId ? "Retour au distributeur" : "Retour aux caisses";

  if (vm.loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Chargement de la caisse...</p>
      </div>
    );
  }

  if (!vm.caisse) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="gap-2 hover:bg-transparent hover:text-inherit"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          {vm.error || "Caisse introuvable"}
        </div>
      </div>
    );
  }

  const parentTypeLabel =
    vm.caisse.parent_type === "DISTRIBUTOR" ? "Distributeur" : "Structure";

  const statusDialogTitle =
    vm.statusNextAction === "deactivate"
      ? "Confirmer la désactivation"
      : "Confirmer l'activation";

  const statusDialogDescription =
    vm.statusNextAction === "deactivate"
      ? `Voulez-vous désactiver la caisse « ${vm.caisse.name} » ?`
      : `Voulez-vous activer la caisse « ${vm.caisse.name} » ?`;

  const statusConfirmLabel =
    vm.statusNextAction === "deactivate" ? "Désactiver" : "Activer";

  const copyId = () => {
    if (!vm.caisse) return;
    navigator.clipboard.writeText(vm.caisse.id);
    toast.success("Identifiant copié dans le presse-papiers");
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header avec retour, icône, nom et actions */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-transparent hover:text-inherit shrink-0"
            onClick={handleBack}
            aria-label={backLabel}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-14 w-14 rounded-2xl border border-border/80 bg-background/50 backdrop-blur-sm shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            <div className="h-full w-full bg-accent/10 flex items-center justify-center text-accent">
              <Landmark className="h-7 w-7" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{vm.caisse.name}</h1>
          </div>
        </div>
      </motion.div>

      {/* Section 1 : Informations Générales */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card rounded-xl p-6 space-y-6"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-border/40">
          <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <Landmark className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Informations Générales</h3>
            <p className="text-xs text-muted-foreground">
              Caractéristiques principales et rattachement de la caisse
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Nom de la caisse</span>
            <p className="text-sm font-semibold text-foreground">{vm.caisse.name}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Code caisse</span>
            <p className="text-sm font-semibold text-foreground font-mono">
              {vm.caisse.code || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">
              Agence de rattachement
            </span>
            <p className="text-sm font-semibold text-foreground">
              {vm.agencyName || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Rattachement parent</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {vm.parentName || "—"}
              </span>
              <Badge
                variant={vm.caisse.parent_type === "DISTRIBUTOR" ? "outline" : "secondary"}
                className="text-[10px] font-normal"
              >
                {parentTypeLabel}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Statut</span>
            <div>
              <Badge
                className={
                  vm.caisse.is_active
                    ? "bg-accent/15 text-accent border-accent/30"
                    : "bg-destructive/15 text-destructive border-destructive/30"
                }
                variant="outline"
              >
                {vm.caisse.is_active ? "Actif" : "Inactif"}
              </Badge>
            </div>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground font-medium block">
              Identifiant technique (UUID)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground break-all">
                {vm.caisse.id}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={copyId}
                aria-label="Copier l'identifiant"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Section 2 : Traçabilité & Dates */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-6 space-y-6"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-border/40">
          <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Traçabilité & Dates</h3>
            <p className="text-xs text-muted-foreground">
              Historique de cycle de vie et d'activation de la caisse
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Date d'activation</span>
            <p className="text-sm font-semibold text-foreground">
              {formatDate(vm.caisse.activated_at)}
            </p>
          </div>

          {vm.caisse.deactivated_at && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">
                Date de désactivation
              </span>
              <p className="text-sm font-semibold text-destructive">
                {formatDate(vm.caisse.deactivated_at)}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Dialog d'édition de la caisse */}
      <CaisseFormDialog
        open={vm.editDialogOpen}
        onOpenChange={vm.setEditDialogOpen}
        editingCaisse={vm.caisse}
        form={vm.editForm}
        setForm={vm.setEditForm}
        agenceOptions={vm.agencyOptions}
        onSave={vm.handleSave}
        disabled={!vm.permissions.canUpdate}
        errors={vm.editFormErrors}
        onClearError={vm.clearEditFormError}
      />

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={vm.deleteDialogOpen}
        onOpenChange={vm.setDeleteDialogOpen}
        title="Confirmer la suppression"
        description={`Êtes-vous sûr de vouloir supprimer la caisse « ${vm.caisse.name} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={vm.handleDelete}
        confirmDisabled={!vm.permissions.canDelete}
        confirmVariant="destructive"
      />

      {/* Confirmation de changement de statut */}
      <ConfirmDialog
        open={vm.statusDialogOpen}
        onOpenChange={vm.setStatusDialogOpen}
        title={statusDialogTitle}
        description={statusDialogDescription}
        confirmLabel={statusConfirmLabel}
        onConfirm={vm.confirmToggleStatut}
        confirmVariant={vm.statusNextAction === "deactivate" ? "destructive" : "default"}
      />
    </div>
  );
};

export default CaisseDetailPage;
