import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  MoreHorizontal,
  Layers,
  Play,
  Pause,
  AlertTriangle,
  AlertCircle,
  Eye,
} from "lucide-react";
import { useAbonnements } from "../viewmodels/useAbonnements";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "../../../core/references/dateUtils";
import { SubscriptionResponse, SubscriptionStatus } from "../models/types";
import {
  AbonnementDialog,
  AbonnementDeleteDialog,
  AbonnementDetailDialog,
} from "./components";

interface AbonnementsPageProps {
  embedded?: boolean;
}

export const AbonnementsPage = ({ embedded = false }: AbonnementsPageProps) => {
  const {
    subscriptions,
    services,
    structures,
    structureOptions,
    structureLocked,
    loading,
    actionLoading,
    error,
    formOpen,
    setFormOpen,
    isEdit,
    form,
    setForm,
    formErrors,
    clearFormError,
    openCreate,
    openEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleStatusChange,
    getSubscriptionById,
  } = useAbonnements();

  const safeServices = Array.isArray(services) ? services : [];
  const activeServices = safeServices.filter((s) => s.status?.toUpperCase() === "ACTIVE");
  const safeSubscriptions = Array.isArray(subscriptions) ? subscriptions : [];

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedSubForDetail, setSelectedSubForDetail] = useState<SubscriptionResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleOpenDetail = async (sub: SubscriptionResponse) => {
    setSelectedSubForDetail(sub);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const freshSub = await getSubscriptionById(sub.id);
      if (freshSub) {
        setSelectedSubForDetail(freshSub);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const getPeriodicityLabel = (p: string) => {
    switch (p) {
      case "MONTHLY":
        return "Mensuelle";
      case "QUARTERLY":
        return "Trimestrielle";
      case "SEMI_ANNUAL":
        return "Semestrielle";
      case "ANNUAL":
        return "Annuelle";
      default:
        return p;
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            Actif
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            Inactif
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            Suspendu
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
            Expiré
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleFormSubmit = () => {
    if (isEdit) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  return (
    <div className={embedded ? "space-y-6 pt-2" : "p-6 lg:p-8 space-y-6 max-w-7xl mx-auto"}>
      {/* Header */}
      {!embedded ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center">
              <Layers className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestion des Abonnements</h1>
              <p className="text-muted-foreground text-sm">
                Gérez les souscriptions et restrictions fonctionnelles des structures
              </p>
            </div>
          </div>
          <Button onClick={openCreate} className="gradient-accent text-accent-foreground hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" /> Nouvel abonnement
          </Button>
        </motion.div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Liste des Abonnements</h3>
            <p className="text-muted-foreground text-xs">
              Gérez les souscriptions et restrictions fonctionnelles des structures.
            </p>
          </div>
          <Button onClick={openCreate} className="gradient-accent text-accent-foreground hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" /> Nouvel abonnement
          </Button>
        </div>
      )}

      {/* Main Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl overflow-hidden border border-border/40"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/50">
                <TableHead className="w-[200px]">Libellé</TableHead>
                <TableHead>Structure</TableHead>
                <TableHead>Tarif</TableHead>
                <TableHead>Périodicité</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Chargement des abonnements...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-destructive">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  </TableCell>
                </TableRow>
              ) : safeSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Aucun abonnement trouvé
                  </TableCell>
                </TableRow>
              ) : (
                safeSubscriptions.map((sub) => {
                  const structName =
                    structures.find((s) => s.id === sub.structure_id)?.name || "Non affecté";
                  return (
                    <TableRow
                      key={sub.id}
                      className="border-border/30 hover:bg-muted/20 cursor-pointer"
                      onClick={() => handleOpenDetail(sub)}
                    >
                      <TableCell className="font-semibold text-foreground">{sub.label}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{structName}</TableCell>
                      <TableCell className="font-medium text-foreground">
                        {parseFloat(sub.amount).toLocaleString()} F CFA
                      </TableCell>
                      <TableCell className="text-sm">{getPeriodicityLabel(sub.periodicity)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sub.expires_at ? formatDateTime(sub.expires_at) : "Illimité"}
                      </TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleOpenDetail(sub)}>
                              <Eye className="h-4 w-4 mr-2" /> Voir les détails
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(sub)}>
                              <Edit2 className="h-4 w-4 mr-2" /> Modifier
                            </DropdownMenuItem>

                            {sub.status !== "ACTIVE" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sub.id, "ACTIVE")}>
                                <Play className="h-4 w-4 mr-2 text-emerald-500" /> Activer
                              </DropdownMenuItem>
                            )}

                            {sub.status !== "INACTIVE" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sub.id, "INACTIVE")}>
                                <Pause className="h-4 w-4 mr-2 text-gray-500" /> Désactiver
                              </DropdownMenuItem>
                            )}

                            {sub.status !== "SUSPENDED" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sub.id, "SUSPENDED")}>
                                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" /> Suspendre
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10"
                              onClick={() => setConfirmDeleteId(sub.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* Creation/Modification Dialog */}
      <AbonnementDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        isEdit={isEdit}
        form={form}
        setForm={setForm}
        errors={formErrors}
        onClearError={clearFormError}
        structures={structureOptions}
        structureLocked={structureLocked}
        services={services}
        actionLoading={actionLoading}
        onSubmit={handleFormSubmit}
      />

      {/* Delete confirmation dialog */}
      <AbonnementDeleteDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        actionLoading={actionLoading}
        onConfirm={async () => {
          if (confirmDeleteId) {
            await handleDelete(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
      />

      {/* Detail Dialog */}
      <AbonnementDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        selectedSub={selectedSubForDetail}
        detailLoading={detailLoading}
        structures={structures}
        services={safeServices}
        getStatusBadge={getStatusBadge}
        getPeriodicityLabel={getPeriodicityLabel}
        formatDateTime={formatDateTime}
      />
    </div>
  );
};
export default AbonnementsPage;
